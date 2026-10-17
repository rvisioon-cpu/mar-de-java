"use client";

import { useCallback, useState } from 'react';
import { showroomConfig } from '@/data/showroom';
import { getAssetUrl } from '@/utils/assets';
import config from '@/config/config';

interface BuildingOpeningProps {
  isIdle: boolean;
  onEnter: () => void;
}

export default function BuildingOpening({ isIdle, onEnter }: BuildingOpeningProps) {
  const [phase, setPhase] = useState<'opening' | 'ready' | 'entering'>('opening');
  const [openingPlaying, setOpeningPlaying] = useState(false);
  const [loopPlaying, setLoopPlaying] = useState(false);
  const [idlePosterReady, setIdlePosterReady] = useState(false);
  const idlePosterRef = useCallback((image: HTMLImageElement | null) => {
    // The backup can finish loading from cache before React hydrates it.
    if (image?.complete && image.naturalWidth > 0) setIdlePosterReady(true);
  }, []);
  const assets = showroomConfig.opening;
  const showCover = phase === 'ready' && isIdle;

  return (
    <div className="absolute inset-0 z-20" data-building-phase={phase}>
      {/* Both backups load immediately, before either video needs them. */}
      <img
        src={getAssetUrl(assets.poster)}
        alt="Vista aérea del edificio"
        fetchPriority="high"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <img
        src={getAssetUrl(assets.idlePoster)}
        ref={idlePosterRef}
        alt="Vista de bienvenida al edificio"
        onLoad={() => setIdlePosterReady(true)}
        className={`absolute inset-0 w-full h-full object-cover ${phase === 'opening' ? 'opacity-0' : 'opacity-100'}`}
      />

      {(phase === 'opening' || (!idlePosterReady && !loopPlaying)) && (
        <video
          key="opening"
          src={getAssetUrl(assets.video)}
          autoPlay
          muted
          playsInline
          preload="auto"
          aria-label="Transición de apertura del edificio"
          onPlaying={() => setOpeningPlaying(true)}
          onWaiting={() => setOpeningPlaying(false)}
          onEnded={() => setPhase('ready')}
          onError={() => setPhase('ready')}
          onLoadedMetadata={(event) => {
            event.currentTarget.play().catch(() => setPhase('ready'));
          }}
          className={`absolute inset-0 w-full h-full object-cover ${openingPlaying ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      {phase !== 'opening' && (
        <video
          key="idle-loop"
          src={getAssetUrl(assets.idleVideo)}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-label="Vista en bucle del edificio"
          onPlaying={() => setLoopPlaying(true)}
          onWaiting={() => setLoopPlaying(false)}
          onError={() => setLoopPlaying(false)}
          className={`absolute inset-0 w-full h-full object-cover ${loopPlaying ? 'opacity-100' : 'opacity-0'}`}
        />
      )}

      {showCover && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_28%_50%,rgba(4,22,32,0.45),transparent)]">
          <div className="absolute inset-y-0 left-[6%] w-[44%] max-w-[640px] flex flex-col items-center justify-center gap-5 sm:gap-8 px-2 py-8">
            <img
              src={getAssetUrl(assets.logo)}
              alt={config.appName}
              className="w-full max-h-[38vh] object-contain drop-shadow-[0_6px_40px_rgba(0,0,0,0.55)]"
            />
            <button
              onClick={() => {
                // Hide branding immediately, including while 0.2 buffers.
                setPhase('entering');
                onEnter();
              }}
              className="group shrink-0 inline-flex items-center justify-center gap-4 border-2 border-white/70 px-8 sm:px-12 lg:px-16 py-3 lg:py-4 backdrop-blur-md bg-black/30 text-white shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:bg-white hover:text-brand-primary transition-colors duration-300 cursor-pointer"
            >
              <span className="text-sm lg:text-lg font-medium uppercase tracking-[0.3em]">Ingresar</span>
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
