"use client";
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import gsap from 'gsap';
import { preloadImages } from '@/utils/preload';
import { getEntryFloorId } from '@/data/floors';
import { showroomConfig } from '@/data/showroom';
import { getAssetUrl } from '@/utils/assets';

interface SceneControllerProps {
  isHighlighted?: boolean;
}

interface BgLayer {
  id: number;
  src: string;
}

const CROSSFADE_MS = 350;
// The crossfade and the pruning of the layer underneath are both scheduled off
// the same load event, so revealing exactly at CROSSFADE_MS races them. A small
// margin guarantees the video is pulled with the new face already fully opaque.
const REVEAL_MARGIN_MS = 80;
const VIDEO_END_SAFETY_TIMEOUT_MS = 4000;

export default function SceneController({ isHighlighted }: SceneControllerProps) {
  const { viewState, endTransition, currentRoom, currentFace, confirmRotation, finishRotation, confirmTimeLapse, finishTimeLapse, transitionUrl, timeOfDay, targetDestination, floorsData, buildingFacesData } = useStore();

  // Preload the first floor plan while the "enter building" walk video plays.
  useEffect(() => {
    if (viewState === 'TRANSITION_VIDEO' && targetDestination === 'Floors') {
      const targetFloor = floorsData.find(f => f.id === getEntryFloorId(floorsData));
      if (targetFloor) preloadImages([targetFloor.floorPlanImage]).catch(() => { });
    }
  }, [viewState, targetDestination, floorsData]);

  // Keeps fully *decoded* Image objects alive in memory, not just their bytes
  // in the HTTP cache. A freshly-created <img> pointed at an already-cached
  // URL still has to decode the bitmap from scratch (for these ~3840px webp
  // faces that's ~300-400ms) unless the browser's decode cache still has a
  // live reference to that resource — which is exactly what this Map
  // provides by holding the offscreen Image() alive.
  const decodedImageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const warmDecode = (src?: string) => {
    if (!src || decodedImageCacheRef.current.has(src)) return;
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    const store = () => decodedImageCacheRef.current.set(src, img);
    if (img.decode) {
      img.decode().then(store).catch(store);
    } else {
      img.onload = store;
    }
  };

  const currentFaceData = buildingFacesData[currentFace] || buildingFacesData[0];
  const currentAssetSet = currentFaceData ? currentFaceData[timeOfDay] : null;
  const targetBackground = currentFace === 0
    ? getAssetUrl(showroomConfig.opening.idlePoster)
    : currentAssetSet?.background;

  // Keep both rotation neighbors (and the current face's alt time-of-day)
  // decoded and warm at all times, re-running every time the user actually
  // lands on a new face/time so the *next* jump in either direction is ready.
  useEffect(() => {
    if (buildingFacesData.length === 0) return;
    const total = buildingFacesData.length;
    if (total > 1) {
      const neighborIds = new Set([
        (currentFace + 1) % total,
        (currentFace - 1 + total) % total,
      ]);
      neighborIds.forEach((id) => {
        const face = buildingFacesData[id];
        warmDecode(face?.[timeOfDay]?.background);
      });
    }
    const altTimeOfDay = timeOfDay === 'day' ? 'night' : 'day';
    warmDecode(currentFaceData?.[altTimeOfDay]?.background);
  }, [currentFace, timeOfDay, buildingFacesData, currentFaceData]);

  // Double-buffered background: each new background image is appended as its
  // own <img> layer, stacked on top (later DOM order = painted on top) and
  // starts at opacity-0. It crossfades in once it has actually loaded/decoded,
  // and only then do we drop the older layer(s) underneath — so the previous
  // face is never abruptly swapped/blanked while the new one is still
  // loading/decoding.
  const layerIdRef = useRef(0);
  const [bgLayers, setBgLayers] = useState<BgLayer[]>(() =>
    targetBackground ? [{ id: layerIdRef.current, src: targetBackground }] : []
  );
  const [readyLayerIds, setReadyLayerIds] = useState<Set<number>>(() => new Set([layerIdRef.current]));

  useEffect(() => {
    if (!targetBackground) return;
    setBgLayers((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].src === targetBackground) return prev;
      layerIdRef.current += 1;
      return [...prev, { id: layerIdRef.current, src: targetBackground }];
    });
  }, [targetBackground]);

  const handleBackgroundLoaded = (id: number) => {
    setReadyLayerIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    // Prune any layers older than this one once the crossfade has finished.
    setTimeout(() => {
      setBgLayers((prev) => {
        const idx = prev.findIndex((l) => l.id === id);
        if (idx <= 0) return prev;
        return prev.slice(idx);
      });
    }, CROSSFADE_MS);
  };

  // The "enter the building" walk into /plantas is rendered by the
  // layout-level <FloorEntryTransition> instead, so it survives the
  // showroom -> /plantas/9 navigation without unmounting/flickering.
  const isTransitioning =
    (viewState === 'TRANSITION_VIDEO' && targetDestination !== 'Floors') ||
    viewState === 'TRANSITION_ROTATION' ||
    viewState === 'TRANSITION_TIMELAPSE';

  const activeVideoUrl =
    transitionUrl || (viewState === 'TRANSITION_VIDEO' ? (currentAssetSet?.introVideo ?? null) : null);

  // Same precaution as the /plantas entry: on a first/cold load
  // buildingFacesData (and the face background it points to) may still be
  // loading when the intro walk-in video finishes. Don't reveal the Lobby
  // until the background is actually decoded, with a safety timeout so we
  // never get stuck on a black screen if something never loads.
  const topBgLayer = bgLayers[bgLayers.length - 1];
  const isBackgroundReady = !!targetBackground && topBgLayer?.src === targetBackground && readyLayerIds.has(topBgLayer.id);

  // A finished video is not torn down on the spot. The scene it lands on is
  // committed *underneath* the video first (so the new face mounts, decodes and
  // crossfades in while the last frame still covers everything), and only then
  // is the video removed. Swapping and unmounting in the same tick used to
  // expose the previous face for the length of the crossfade — the flash
  // between the video and the still image.
  const [pendingReveal, setPendingReveal] = useState<'lobby' | 'rotation' | 'timelapse' | null>(null);

  useEffect(() => {
    if (!pendingReveal) return;

    const reveal = () => {
      if (pendingReveal === 'lobby') endTransition('Lobby');
      else if (pendingReveal === 'rotation') finishRotation();
      else finishTimeLapse();
      setPendingReveal(null);
    };

    // Decoded, but still crossfading in behind the video: waiting out the fade
    // means pulling the video can never expose a half-faded frame. The safety
    // timeout keeps a background that never loads from freezing the video.
    const delay = isBackgroundReady ? CROSSFADE_MS + REVEAL_MARGIN_MS : VIDEO_END_SAFETY_TIMEOUT_MS;
    const timeout = setTimeout(reveal, delay);
    return () => clearTimeout(timeout);
  }, [pendingReveal, isBackgroundReady, endTransition, finishRotation, finishTimeLapse]);

  const handleVideoEnd = () => {
    if (viewState === 'TRANSITION_VIDEO') {
      setPendingReveal('lobby');
    } else if (viewState === 'TRANSITION_ROTATION') {
      confirmRotation();
      setPendingReveal('rotation');
    } else if (viewState === 'TRANSITION_TIMELAPSE') {
      confirmTimeLapse();
      setPendingReveal('timelapse');
    }
  };

  return (
    <div className="w-full h-full relative bg-black overflow-hidden">

      {/* LAYER 1: 360 Panorama (Static background) */}
      <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
        {currentRoom === 'Lobby' ? (
          <div className="relative w-full h-full">
            {bgLayers.map((layer) => (
              <img
                key={layer.id}
                src={layer.src}
                alt={currentFaceData?.name || "Edificio"}
                decoding="async"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  const markReady = () => handleBackgroundLoaded(layer.id);
                  if (img.decode) {
                    img.decode().then(markReady).catch(markReady);
                  } else {
                    markReady();
                  }
                }}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity ease-in-out ${readyLayerIds.has(layer.id) ? 'opacity-100' : 'opacity-0'}`}
                style={{ transitionDuration: `${CROSSFADE_MS}ms` }}
              />
            ))}

            {/* Background Video Layer - Fades in when ready */}
            {currentFace !== 0 && currentAssetSet?.backgroundVideo && (
              <video
                key={`${currentFace}-${timeOfDay}-${currentAssetSet.backgroundVideo}`}
                src={currentAssetSet.backgroundVideo}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
                onCanPlay={(e) => {
                  gsap.to(e.currentTarget, { opacity: 1, duration: 1, ease: "power2.inOut" });
                }}
                onError={() => console.warn("Background video failed to load")}
              />
            )}

            {isHighlighted && currentAssetSet?.highlight && (
              <img
                src={currentAssetSet.highlight}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 z-10"
                alt="Highlight"
              />
            )}
            {currentFaceData?.name && currentFace !== 0 && (
              <div className="absolute top-10 left-10 p-4 bg-black/50 text-white z-20">
                <h1 className="text-2xl font-light tracking-widest">{currentFaceData.name}</h1>
              </div>
            )}
          </div>
        ) : (
          <h1 className="text-4xl text-white font-light tracking-widest">
            360 VIEW: {currentRoom}
          </h1>
        )}
      </div>

      {/* LAYER 2: Transition Video — mounted fresh per transition, unmounted on end */}
      {isTransitioning && activeVideoUrl && (
        <video
          key={`${viewState}-${activeVideoUrl}`}
          src={activeVideoUrl}
          autoPlay
          muted
          playsInline
          onLoadedMetadata={(e) => { e.currentTarget.play().catch(() => { }); }}
          onEnded={handleVideoEnd}
          onError={handleVideoEnd}
          className="absolute inset-0 w-full h-full object-cover z-50 pointer-events-none"
        />
      )}

    </div>
  );
}
