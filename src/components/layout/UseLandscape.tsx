"use client";
import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useStore } from '../../store/useStore';

const SESSION_KEY = 'mar-java-landscape-shown';

const UseLandscape = () => {
    const pathname = usePathname();
    const [isPortrait, setIsPortrait] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [showOverlay, setShowOverlay] = useState(false);
    
    const setForcedLandscape = useStore(state => state.setForcedLandscape);

    useEffect(() => {
        const checkOrientation = () => {
            // Check if device is mobile based on user agent or touch capability + screen width
            // A simple heuristic: narrow width and touch
            const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth <= 1024 && 'ontouchstart' in window);
            
            setIsMobile(mobile);

            // Check orientation
            // Use window.orientation (deprecated but useful) or matchMedia
            const portrait = window.matchMedia("(orientation: portrait)").matches;
            setIsPortrait(portrait);
        };

        checkOrientation();

        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);

        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);

    useEffect(() => {
        // Exclude dashboard, login, and ubicacion routes from global overlay
        if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/login') || pathname?.startsWith('/ubicacion')) {
            setShowOverlay(false);
            setForcedLandscape(false);
            return;
        }

        if (isMobile && isPortrait) {
            const alreadyShown = sessionStorage.getItem(SESSION_KEY) === 'true';

            if (alreadyShown) {
                // Already shown this session — skip overlay, go straight to forced landscape
                setShowOverlay(false);
                setForcedLandscape(true);
                return;
            }

            // First time this session — show the overlay
            setShowOverlay(true);
            setForcedLandscape(false);
            
            const timer = setTimeout(() => {
                setShowOverlay(false);
                setForcedLandscape(true);
                sessionStorage.setItem(SESSION_KEY, 'true');
            }, 3000);

            return () => clearTimeout(timer);
        } else {
            setShowOverlay(false);
            setForcedLandscape(false);
        }
    }, [isMobile, isPortrait, setForcedLandscape, pathname]);

    if (!showOverlay) return null;

    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 text-center overscroll-none touch-none">
            
            {/* Pulsating Logo */}
            <div className="mb-12 relative">
                <div className="absolute inset-0 bg-brand-orange/20 blur-xl rounded-full animate-pulse" />
                <img 
                    src="/identity/identity_logo_ISOTIPO.png" 
                    alt="Logo" 
                    className="w-24 h-24 object-contain relative z-10 animate-pulse" // Simple pulse for now
                />
            </div>

            <div className="flex flex-col items-center gap-6 animate-bounce-slow">
                <RotateCcw className="w-16 h-16 text-white/80 animate-spin-slow" />
                <div className="space-y-2">
                    <h2 className="text-2xl font-light tracking-widest text-white uppercase">
                        Gira tu dispositivo
                    </h2>
                    <p className="text-white/60 font-secondary text-sm tracking-wide">
                        Para una mejor experiencia
                    </p>
                </div>
            </div>
      </div>
    );
};

export default UseLandscape;
