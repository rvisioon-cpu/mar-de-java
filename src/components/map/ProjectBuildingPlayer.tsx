"use client";
import { useEffect, useRef, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { getAssetUrl } from '@/utils/assets';
import type { ProjectVideo } from '@/data/projectVideos';

interface ProjectBuildingPlayerProps {
  name: string;
  video: ProjectVideo;
  onClose: () => void;
}

/**
 * Full-screen building view for a project pin.
 *
 * The transition plays once; the loop is mounted underneath from the start
 * (paused, preloading) so the hand-off has no black frame: when the
 * transition ends the loop starts, and the transition layer is only removed
 * once the loop is actually painting frames.
 */
export default function ProjectBuildingPlayer({ name, video, onClose }: ProjectBuildingPlayerProps) {
  const transitionRef = useRef<HTMLVideoElement>(null);
  const loopRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<'transition' | 'loop'>('transition');
  const [visible, setVisible] = useState(false);
  const [buffering, setBuffering] = useState(true);

  // Fade in on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const startLoop = () => {
    const loop = loopRef.current;
    if (!loop) { setPhase('loop'); return; }
    loop.currentTime = 0;
    const promise = loop.play();
    if (promise) promise.catch(() => setPhase('loop'));
  };

  return (
    <div
      className={`fixed inset-0 z-[60] bg-black transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Edificio ${name}`}
    >
      {/* Loop — sits underneath, waiting for the transition to finish */}
      <video
        ref={loopRef}
        src={getAssetUrl(video.loop)}
        muted
        loop
        playsInline
        preload="auto"
        onPlaying={() => { setPhase('loop'); setBuffering(false); }}
        onWaiting={() => phase === 'loop' && setBuffering(true)}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Transition — plays once, then gets out of the way */}
      {phase === 'transition' && (
        <video
          ref={transitionRef}
          src={getAssetUrl(video.transition)}
          autoPlay
          muted
          playsInline
          preload="auto"
          onPlaying={() => setBuffering(false)}
          onWaiting={() => setBuffering(true)}
          onEnded={startLoop}
          onError={startLoop}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {buffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 size={40} className="text-white/80 animate-spin" />
        </div>
      )}

      {/* Title strip */}
      <div
        className="absolute inset-x-0 top-0 p-6 pb-16 bg-gradient-to-b from-black/70 to-transparent pointer-events-none"
        style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}
      >
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/70 font-semibold">Proyecto</p>
        <h2 className="text-2xl md:text-3xl font-bold text-white font-secondary leading-tight">{name}</h2>
      </div>

      <button
        id="project-building-close"
        onClick={onClose}
        className="absolute right-6 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md border border-white/15 transition-all hover:scale-105 cursor-pointer"
        style={{ top: 'calc(1.5rem + env(safe-area-inset-top))' }}
        title="Volver al mapa"
      >
        <X size={20} />
      </button>
    </div>
  );
}
