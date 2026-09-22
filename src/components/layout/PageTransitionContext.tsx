"use client";
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface PageTransitionContextType {
  navigateWithTransition: (href: string, callback?: () => void) => void;
  isTransitioning: boolean;
}

const PageTransitionContext = createContext<PageTransitionContextType>({
  navigateWithTransition: () => {},
  isTransitioning: false,
});

export const usePageTransition = () => useContext(PageTransitionContext);

type TransitionState = 'idle' | 'entering' | 'active' | 'leaving';

function PageTransitionInner({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [state, setState] = useState<TransitionState>('idle');
  const targetHrefRef = useRef<string | null>(null);
  const callbackRef = useRef<(() => void) | null>(null);

  // Monitor route changes to trigger the exit fade out
  useEffect(() => {
    if (state === 'active' || state === 'entering') {
      const currentFullUrl = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
      const target = targetHrefRef.current;
      
      if (target && (currentFullUrl === target || pathname === target.split('?')[0])) {
        // Route has mounted, smoothly exit
        const timer = setTimeout(() => {
          setState('leaving');
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [pathname, searchParams, state]);

  // Safety fallback timers
  useEffect(() => {
    if (state === 'active') {
      const safetyTimer = setTimeout(() => {
        setState('leaving');
      }, 1000);
      return () => clearTimeout(safetyTimer);
    } else if (state === 'leaving') {
      const leaveTimer = setTimeout(() => {
        setState('idle');
        if (callbackRef.current) {
          callbackRef.current();
          callbackRef.current = null;
        }
        targetHrefRef.current = null;
      }, 400);
      return () => clearTimeout(leaveTimer);
    }
  }, [state]);

  const navigateWithTransition = (href: string, callback?: () => void) => {
    if (state !== 'idle') return;

    if (callback) callbackRef.current = callback;
    targetHrefRef.current = href;

    // Start fade & blur in
    setState('entering');

    setTimeout(() => {
      setState('active');
      router.push(href);
    }, 240);
  };

  const isVisible = state !== 'idle';
  const isLeaving = state === 'leaving';

  return (
    <PageTransitionContext.Provider value={{ navigateWithTransition, isTransitioning: isVisible }}>
      {children}

      {isVisible && (
        <div
          aria-hidden="true"
          className={`fixed inset-0 z-[100] pointer-events-auto flex items-center justify-center overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isLeaving
              ? 'opacity-0 backdrop-blur-none scale-105 pointer-events-none'
              : 'opacity-100 backdrop-blur-2xl scale-100'
          }`}
          style={{
            background: 'radial-gradient(ellipse at center, rgba(14, 116, 163, 0.55) 0%, rgba(8, 46, 64, 0.88) 55%, rgba(4, 27, 38, 0.96) 100%)',
          }}
        >
          {/* Frosted Ocean Scrim */}
          <div className="absolute inset-0 bg-ocean-950/60 backdrop-blur-3xl" />

          {/* Luxury Logo & Glow */}
          <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center">
            <div className="relative">
              <div className="absolute -inset-4 rounded-full bg-ocean-400/20 blur-xl animate-pulse" />
              <img
                src="/identity/identity_logo_white.png"
                alt="Mar de Java"
                className="relative w-44 lg:w-60 object-contain drop-shadow-[0_10px_35px_rgba(0,0,0,0.6)]"
              />
            </div>
            
            {/* Shimmer wave line indicator */}
            <div className="mt-6 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-ocean-300 animate-ping" />
              <span className="w-2 h-2 rounded-full bg-ocean-200 animate-ping [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-ocean-100 animate-ping [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      )}
    </PageTransitionContext.Provider>
  );
}

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <PageTransitionInner>{children}</PageTransitionInner>
    </Suspense>
  );
}
