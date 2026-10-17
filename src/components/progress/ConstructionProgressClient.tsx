"use client";

import { useState, useRef, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { Calendar, ChevronLeft, ChevronRight, Menu, Hammer, Loader2 } from "lucide-react";
import gsap from "gsap";
import FullScreenToggle from "@/components/UI/FullScreenToggle";
import { getAssetUrl } from "@/utils/assets";
import config from "@/config/config";
import styles from "./ConstructionProgressClient.module.css";

export interface ProgressUpdateClient {
  id: string;
  date: string; // e.g. "Mayo 2026"
  title: string;
  description: string;
  mediaType: "image" | "video";
  mediaUrl: string;
}

interface ConstructionProgressClientProps {
  initialUpdates: ProgressUpdateClient[];
}

export default function ConstructionProgressClient({ initialUpdates }: ConstructionProgressClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Los clips de avance pueden ser pesados: se permite reproducción progresiva sin tapar el video.
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const updates = initialUpdates;
  const currentUpdate = updates[currentIndex];

  useEffect(() => {
    // Intentar reproducir video inmediatamente al cambiar de update
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }

    // Animation when changing update
    if (updates.length === 0) return;

    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
      );
    }
    if (mediaRef.current) {
      gsap.fromTo(
        mediaRef.current,
        { opacity: 0, scale: 1.05 },
        { opacity: 1, scale: 1, duration: 0.8, ease: "power2.out" }
      );
    }
  }, [currentIndex, updates]);

  const handleNext = () => {
    if (currentIndex < updates.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // If there are no updates (e.g. database error/cleared)
  if (updates.length === 0) {
    return (
      <div className="h-full w-full bg-black text-white relative overflow-hidden flex flex-col items-center justify-center p-6 font-sans">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        
        <div className="absolute top-6 left-6 z-50 flex items-center gap-4">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-full transition-all cursor-pointer shadow-lg"
          >
            <Menu size={24} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold uppercase tracking-[0.2em]">Avance de Obra</h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-secondary">
              {config.company?.buildingName}
            </p>
          </div>
        </div>

        <div className="text-center space-y-4 max-w-md">
          <div className="p-4 rounded-full bg-white/10 text-brand-primary w-fit mx-auto">
            <Hammer size={48} className="text-brand-orange animate-pulse" />
          </div>
          <h2 className="text-2xl font-light tracking-tight">Sin Avances Disponibles</h2>
          <p className="text-gray-400 font-secondary text-sm">
            Pronto subiremos los reportes mensuales de avance de obra. Regresa más tarde para ver el progreso del edificio.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} @container bg-black text-white relative overflow-hidden font-sans`}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <header className={`${styles.header} relative z-50 flex items-center justify-between gap-4 border-b border-white/10`}>
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Abrir menú"
            className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-full transition-all cursor-pointer shadow-lg shrink-0"
          >
            <Menu size={24} />
          </button>
          <div className="min-w-0">
            <h1 className="text-xs font-bold uppercase tracking-[0.15em]">Avance de Obra</h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-secondary truncate">
              {config.company?.buildingName}
            </p>
          </div>
        </div>
        <FullScreenToggle />
      </header>

      {/* Main Content Area */}
      <div className={styles.main}>
        {/* Media Container */}
        <div className={`${styles.media} relative bg-neutral-900 overflow-hidden group`}>
          <div ref={mediaRef} className="absolute inset-0 flex items-center justify-center">
            {currentUpdate.mediaType === "image" ? (
              <img
                src={getAssetUrl(currentUpdate.mediaUrl)}
                alt={currentUpdate.title}
                className="w-full h-full object-contain"
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  key={currentUpdate.mediaUrl}
                  src={getAssetUrl(currentUpdate.mediaUrl)}
                  autoPlay
                  muted
                  loop
                  playsInline
                  // preload="auto" para que el navegador comience la descarga progresiva inmediatamente
                  preload="auto"
                  onLoadStart={() => setIsVideoLoading(true)}
                  onLoadedData={() => setIsVideoLoading(false)}
                  onCanPlay={() => setIsVideoLoading(false)}
                  onPlaying={() => setIsVideoLoading(false)}
                  onWaiting={() => setIsVideoLoading(true)}
                  onError={() => setIsVideoLoading(false)}
                  className="w-full h-full object-contain"
                />

                {/* Indicador flotante sin opacar ni ocultar el video mientras carga/hace buffering */}
                {isVideoLoading && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-black/40 border border-white/15 backdrop-blur-md shadow-2xl animate-fade-in">
                      <Loader2 className="w-4 h-4 text-brand-orange animate-spin" />
                      <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-white/90 font-secondary">
                        Cargando video...
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Media Gradient Overlay */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/30 via-transparent to-black/10" />

          {/* Navigation Buttons (Desktop) */}
          <div className="absolute inset-y-0 left-0 w-24 hidden @2xl:flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
            <button
              onClick={handlePrev}
              aria-label="Avance anterior"
              disabled={currentIndex === 0}
              className={`p-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 transition-all ${
                currentIndex === 0 ? "opacity-0" : "cursor-pointer hover:scale-110"
              }`}
            >
              <ChevronLeft size={32} />
            </button>
          </div>
          <div className="absolute inset-y-0 right-0 w-24 hidden @2xl:flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
            <button
              onClick={handleNext}
              aria-label="Siguiente avance"
              disabled={currentIndex === updates.length - 1}
              className={`p-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 transition-all ${
                currentIndex === updates.length - 1 ? "opacity-0" : "cursor-pointer hover:scale-110"
              }`}
            >
              <ChevronRight size={32} />
            </button>
          </div>
        </div>

        {/* Info Panel */}
        <div className={`${styles.info} bg-black/90 backdrop-blur-3xl flex flex-col justify-between gap-6 relative z-20`}>
          <div ref={contentRef} className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-primary/20 border border-brand-primary/30 rounded-full text-ocean-200 text-[10px] font-bold uppercase tracking-widest">
              <Calendar size={12} className="text-brand-orange" />
              {currentUpdate.date}
            </div>

            <div className="space-y-4">
              <h2 className={`${styles.title} font-light tracking-tight leading-tight`}>
                {currentUpdate.title}
              </h2>
              <p className="text-gray-400 font-secondary leading-relaxed text-sm whitespace-pre-line">
                {currentUpdate.description}
              </p>
            </div>
          </div>

          {/* Timeline Navigation (Bottom) */}
          <div className="mt-auto pt-4 border-t border-white/10 min-w-0">
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
              {updates.map((update, index) => (
                <button
                  key={update.id}
                  onClick={() => setCurrentIndex(index)}
                  aria-current={index === currentIndex ? "step" : undefined}
                  className={`flex-shrink-0 w-32 group cursor-pointer transition-all text-left ${
                    index === currentIndex ? "opacity-100" : "opacity-40 hover:opacity-70"
                  }`}
                >
                  <div
                    className={`h-1 w-full mb-3 rounded-full transition-all ${
                      index === currentIndex ? "bg-brand-primary" : "bg-white/20"
                    }`}
                  />
                  <p
                    className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                      index === currentIndex ? "text-ocean-200" : "text-white"
                    }`}
                  >
                    {update.date}
                  </p>
                  <p className="text-[9px] text-gray-500 line-clamp-1 uppercase tracking-tighter">
                    {update.title}
                  </p>
                </button>
              ))}
            </div>

            {/* Mobile Navigation Controls */}
            <div className="flex justify-between items-center pt-3">
              <button
                onClick={handlePrev}
              aria-label="Avance anterior"
                disabled={currentIndex === 0}
                className="p-3 bg-white/10 rounded-full disabled:opacity-20 cursor-pointer disabled:cursor-default"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                {currentIndex + 1} / {updates.length}
              </span>
              <button
                onClick={handleNext}
              aria-label="Siguiente avance"
                disabled={currentIndex === updates.length - 1}
                className="p-3 bg-white/10 rounded-full disabled:opacity-20 cursor-pointer disabled:cursor-default"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
