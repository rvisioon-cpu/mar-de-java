"use client";
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { X, Home, Building2, Layers, Image, Rotate3D, Video, Download, MapPin, Phone, Facebook, Instagram, Mountain, Box, Construction } from 'lucide-react';
import { getAssetUrl } from '@/utils/assets';
import { useStore } from '@/store/useStore';
import { preloadImages, preloadVideo } from '@/utils/preload';
import { buildingFaces as staticBuildingFaces } from '@/data/buildingData';
import { floorsData as staticFloorsData, getEntryFloorId } from '@/data/floors';
import config from '@/config/config';
import { getFeatures } from '@/app/actions/features';
import defaultFeatures from '@/data/features.json';
import LiquidMenuBackground from './LiquidMenuBackground';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const TikTokIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
);

const IconMap: Record<string, any> = {
    Home, Building2, Box, Layers, Image, Rotate3D, Mountain, Video, Download, MapPin, Construction, Phone, Facebook, Instagram
};

// Decorative layered ocean waves that crest along the top edge of the navigation.
// All 4 layers animate at different speeds for an organic, living ocean surface.
// Paths run from x=-80 to x=1520 so the horizontal drift never exposes a gap.
// `.top-wave-blur` carries the panel's frosted backdrop up through the crest
// (masked to the wave silhouette) so crest and panel read as one surface.
const WaveCrest = ({ className = "" }: { className?: string }) => (
    <div className={`pointer-events-none relative h-[46px] w-full overflow-hidden ${className}`}>
        <div className="top-wave-blur backdrop-blur-xl" />
        <div className="top-wave-1 absolute inset-0" />
        <div className="top-wave-2 absolute inset-0" />
        <div className="top-wave-3 absolute inset-0" />
        <div className="top-wave-4 absolute inset-0" />
    </div>
);

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
    const router = useRouter();
    const pathname = usePathname();

    const storeFloorsData = useStore(state => state.floorsData);
    const storeBuildingFacesData = useStore(state => state.buildingFacesData);
    const timeOfDay = useStore(state => state.timeOfDay);

    const floorsData = storeFloorsData && storeFloorsData.length > 0 ? storeFloorsData : staticFloorsData;
    const buildingFacesData = storeBuildingFacesData && storeBuildingFacesData.length > 0 ? storeBuildingFacesData : staticBuildingFaces;

    const [activeFeatures, setActiveFeatures] = useState<any[]>(defaultFeatures);

    useEffect(() => {
        getFeatures().then(dbFeatures => {
            if (dbFeatures) {
                // If it's a legacy object format, wrap it, but it should be an array.
                if (Array.isArray(dbFeatures)) {
                    setActiveFeatures(dbFeatures);
                }
            }
        }).catch(e => console.error("Error fetching features:", e));
    }, []);

    // Preload triggers
    useEffect(() => {
        if (isOpen && buildingFacesData.length > 0) {
            // "El edificio" (Showroom) Critical Path
            const face0 = buildingFacesData[0];
            if (face0) {
                const currentAssetSet = timeOfDay === 'day' ? face0.day : face0.night;
                if (currentAssetSet?.background) {
                    preloadImages([currentAssetSet.background]).catch(() => { });
                }
                if (currentAssetSet?.backgroundVideo) {
                    preloadVideo(currentAssetSet.backgroundVideo).catch(() => { });
                }
                if (currentAssetSet?.introVideo) {
                    preloadVideo(currentAssetSet.introVideo).catch(() => { });
                }
            }

            // Default Floor 9 Image
            const defaultFloor = floorsData.find(f => f.id === getEntryFloorId(floorsData));
            if (defaultFloor) {
                preloadImages([defaultFloor.floorPlanImage]).catch(() => { });
            }
        }
    }, [isOpen, buildingFacesData, floorsData, timeOfDay]);

    const menuItems = activeFeatures.filter(item => item.active && item.id !== "identity");

    const toggleBrochure = useStore(state => state.toggleBrochure);

    const handleNavigation = (path?: string, action?: string) => {
        if (action === 'brochure') {
            toggleBrochure(true);
            onClose();
            return;
        }

        if (path) {
            onClose();
            if (path.startsWith('/')) {
                if (path === '/plantas') {
                    router.push('/showroom?transition=floors&targetPath=/plantas');
                }
                else {
                    router.push(path);
                }
            }
        }
    };

    const handleMouseEnter = (key?: string) => {
        if (!key) return;

        const face0 = buildingFacesData[0];
        const currentAssetSet = face0 ? (timeOfDay === 'day' ? face0.day : face0.night) : null;

        if (key === 'showroom' && buildingFacesData.length > 0) {
            if (face0) {
                if (currentAssetSet?.background) preloadImages([currentAssetSet.background]).catch(() => { });
                if (currentAssetSet?.backgroundVideo) preloadVideo(currentAssetSet.backgroundVideo).catch(() => { });
                if (currentAssetSet?.introVideo) preloadVideo(currentAssetSet.introVideo).catch(() => { });
            }
        }
        else if (key === 'floors' && buildingFacesData.length > 0) {
            // "Plantas" enters through the central face's walk (see /showroom?transition=floors)
            const centralFace = buildingFacesData[2] || face0;
            const centralAssetSet = centralFace ? (timeOfDay === 'day' ? centralFace.day : centralFace.night) : null;
            if (centralAssetSet?.introVideo) preloadVideo(centralAssetSet.introVideo).catch(() => { });

            const defaultFloor = floorsData.find(f => f.id === getEntryFloorId(floorsData));
            if (defaultFloor) {
                preloadImages([defaultFloor.floorPlanImage]).catch(() => { });
            }
        }
    };

    const isItemActive = (path?: string) => {
        if (!path) return false;
        if (path === '/' && pathname === '/') return true;
        if (path !== '/' && pathname.startsWith(path)) return true;
        if (path === '/plantas' && pathname.startsWith('/plantas')) return true;
        return false;
    };

    const isForcedLandscape = useStore(state => state.isForcedLandscape);

    const SocialLinks = ({ size = 16 }: { size?: number }) => (
        <div className="flex gap-3">
            {config.company?.buildingSocials?.facebook && (
                <a href={config.company.buildingSocials.facebook} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 border border-white/25 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:border-white hover:bg-white/10 transition-all cursor-pointer">
                    <Facebook size={size} />
                </a>
            )}
            {config.company?.buildingSocials?.instagram && (
                <a href={config.company.buildingSocials.instagram} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 border border-white/25 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:border-white hover:bg-white/10 transition-all cursor-pointer">
                    <Instagram size={size} />
                </a>
            )}
            {config.company?.buildingSocials?.tiktok && (
                <a href={config.company.buildingSocials.tiktok} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 border border-white/25 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:border-white hover:bg-white/10 transition-all cursor-pointer">
                    <TikTokIcon size={size} />
                </a>
            )}
        </div>
    );

    // ── FORCED LANDSCAPE (rotated frame): a true bottom bar can't be used because
    // the frame is rotated 90°, so we use a full-screen ocean overlay with the same
    // ocean gradient and white-pill items as the desktop bottom bar. Unlike desktop
    // it carries no wave effect: neither the liquid canvas nor the crest, so mobile
    // shows the plain configured background.
    if (isForcedLandscape) {
        return (
            <div
                className={`fixed inset-0 z-[70] isolate overflow-hidden flex flex-col bg-gradient-to-b from-ocean-600/60 via-ocean-700/65 to-ocean-800/70 backdrop-blur-xl transition-opacity duration-400
                    ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            >
                <div className="relative z-10 flex flex-1 flex-col">
                    {/* Header strip (logo + close) capped by the same ocean wave crest.
                        The rotated frame has no room for a separate backdrop logo,
                        so the logo is centered here instead of tucked in a corner. */}
                    <div className="relative shrink-0 flex items-center justify-center px-6 pt-5 pb-2 bg-transparent">
                        <img src="/identity/identity_logo_white.png" alt={config.appName} className="h-12 object-contain drop-shadow-lg" />
                        <button onClick={onClose} className="absolute right-5 top-1/2 -translate-y-1/2 p-2 text-white/75 hover:text-white hover:scale-110 transition-all cursor-pointer">
                            <X size={24} />
                        </button>
                    </div>
                    {/* Menu items */}
                    <div className="flex-1 flex items-center justify-center w-full px-6">
                        <ul className="grid grid-cols-5 gap-4 w-full max-w-4xl">
                            {menuItems.map((item) => {
                                const active = isItemActive(item.path);
                                const IconComponent = IconMap[item.icon] || Box;
                                return (
                                    <li key={item.label}>
                                        <button
                                            onClick={() => handleNavigation(item.path, (item as any).action)}
                                            onMouseEnter={() => handleMouseEnter((item as any).preloadKey)}
                                            className={`w-full flex flex-col items-center justify-center gap-2 p-3 rounded-2xl transition-all duration-300 group cursor-pointer wavy-btn
                                            ${active
                                                    ? 'bg-white text-ocean-700 shadow-lg'
                                                    : 'text-white/85 hover:text-white'}`}
                                        >
                                            <IconComponent size={24} strokeWidth={1.9} className="transition-transform group-hover:scale-110 relative z-10" />
                                            <span className="font-primary text-[11px] font-semibold tracking-wide text-center leading-tight relative z-10">
                                                {item.label}
                                            </span>
                                            {!active && <div className="wavy-btn-wave" />}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {/* Footer */}
                    <div className="shrink-0 px-6 pb-6 flex items-center justify-center gap-5">
                        <SocialLinks />
                        <div className="h-5 w-px bg-white/25" />
                        <a
                            href={config.company?.realStateWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={config.company?.realStateName}
                            className="transition-opacity hover:opacity-100 opacity-90"
                        >
                            <img src="/identity/logo_inmobiliaria_white.png" alt={config.company?.realStateName} className="h-7 w-auto object-contain" />
                        </a>
                        <div className="hidden sm:block h-5 w-px bg-white/25" />
                        <a
                            href={config.company?.developerWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:block text-[10px] text-white/60 hover:text-white/90 transition-colors font-secondary"
                        >
                            {new Date().getFullYear()}© {config.company?.developer}
                        </a>
                    </div>

                    <span className="pointer-events-none absolute bottom-5 left-4 max-w-[42%] text-[8px] leading-tight text-white/55 font-secondary">
                        Las imágenes están sujetas a <a href="/terminos-y-condiciones" className="pointer-events-auto underline hover:text-white/90 transition-colors">términos y condiciones</a> de la inmobiliaria
                    </span>
                </div>
            </div>
        );
    }

    // ── STANDARD WEB: bottom navigation bar that slides up, crested with ocean waves.
    return (
        <>
            {/* Frosted backdrop — blurs the page behind the menu. The homepage's
                own hero logo is hidden separately while the menu is open, so the
                menu's centered logo doesn't ghost over a duplicate. */}
            <div
                className={`fixed inset-0 bg-ocean-900/40 backdrop-blur-md z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Project logo, centered on the blurred backdrop. This is the menu's
                own logo — it renders on every route rather than relying on the
                homepage hero logo being lifted above the backdrop, and it
                replaces the small logo that used to sit in the nav header.
                pointer-events-none keeps the backdrop's click-to-close intact. */}
            <div
                aria-hidden={!isOpen}
                className={`fixed inset-0 z-[62] flex items-center justify-center px-8 pb-[clamp(11rem,24vh,15rem)] pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
                    ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
            >
                {/* The bottom padding offsets the nav bar's height so the logo
                    reads as centered in the space actually left visible.
                    Sizing classes deliberately mirror the homepage hero logo
                    (src/app/page.tsx) so the mark keeps one size across the site. */}
                <img
                    src="/identity/identity_logo_white.png"
                    alt={config.appName}
                    className="w-[180px] lg:w-full max-w-xl object-contain drop-shadow-2xl"
                />
            </div>

            {/* Bottom Wave Navigation */}
            <nav
                aria-label="Navegación principal"
                className={`sidebar-nav group fixed bottom-0 left-0 w-full z-[70] transform transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
                    ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
            >
                <WaveCrest />

                {/* -mt-px closes the subpixel hairline between crest and panel.
                    The upward drop-shadow that used to live here was removed: it
                    fell across the crest and re-drew the very seam the wave-shaped
                    blur is meant to dissolve. */}
                <div className="relative isolate -mt-px overflow-hidden bg-gradient-to-b from-ocean-600/60 via-ocean-700/65 to-ocean-800/70 backdrop-blur-xl px-4 pt-0 pb-8">
                    {/* Colour bridge. The four crest layers composite to ~99% alpha
                        (1-(1-.45)(1-.65)(1-.75)(1-.85)), so the panel has to START
                        fully opaque in the crest's own colour and only then decay to
                        its translucent base — anything less leaves a visible step.
                        Fades to ocean-600/0 rather than `transparent` so only alpha
                        interpolates; `transparent` is rgba(0,0,0,0) and would pull
                        the midpoint toward grey, drawing a fresh band. */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-20 z-0 bg-gradient-to-b from-ocean-600 to-ocean-600/0" />
                    {isOpen && <LiquidMenuBackground />}

                    {/* Header row: close only — the logo now lives large and
                        centered on the backdrop, not shrunk into this strip. */}
                    <div className="relative z-10 flex items-center justify-end px-1 pb-1.5">
                        <button onClick={onClose} className="p-1.5 -mr-1 text-white/70 hover:text-white hover:scale-110 transition-all cursor-pointer relative z-10">

                            <X size={20} />
                        </button>
                    </div>

                    {/* Menu items: centered on wide screens, horizontally scrollable on narrow */}
                    <ul className="relative z-10 flex gap-1.5 overflow-x-auto scrollbar-thin pb-0.5 justify-start lg:justify-center">
                        {menuItems.map((item) => {
                            const active = isItemActive(item.path);
                            const IconComponent = IconMap[item.icon] || Box;
                            return (
                                <li key={item.label} className="shrink-0">
                                    <button
                                        onClick={() => handleNavigation(item.path, (item as any).action)}
                                        onMouseEnter={() => handleMouseEnter((item as any).preloadKey)}
                                        className={`group/item w-[76px] flex flex-col items-center gap-1 rounded-2xl px-1.5 py-2 transition-all duration-300 cursor-pointer wavy-btn
                                            ${active
                                                ? 'bg-white text-ocean-700 shadow-lg'
                                                : 'text-white/85 hover:text-white'}`}
                                    >
                                        <div className="w-6 h-6 flex items-center justify-center transition-transform duration-300 group-hover/item:scale-110 relative z-10">
                                            <IconComponent size={18} strokeWidth={2} />
                                        </div>
                                        <span className="font-primary text-[10px] font-semibold tracking-wide text-center leading-tight whitespace-nowrap relative z-10">
                                            {item.label}
                                        </span>
                                        {!active && <div className="wavy-btn-wave" />}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>

                    {/* Footer: socials · inmobiliaria logo · credit */}
                    <div className="relative z-10 mt-2 pt-2 border-t border-white/15 flex items-center justify-between gap-4">
                        <SocialLinks />
                        <div className="flex items-center gap-3">
                            <a
                                href={config.company?.realStateWebsite}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={config.company?.realStateName}
                                className="transition-opacity hover:opacity-100 opacity-90"
                            >
                                <img src="/identity/logo_inmobiliaria_white.png" alt={config.company?.realStateName} className="h-6 w-auto object-contain" />
                            </a>
                            <div className="hidden sm:block h-4 w-px bg-white/20" />
                            <a
                                href={config.company?.developerWebsite}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hidden sm:block text-[10px] text-white/55 hover:text-white/90 transition-colors font-secondary whitespace-nowrap"
                            >
                                {new Date().getFullYear()}© {config.company?.developer}
                            </a>
                        </div>
                    </div>

                    <span className="pointer-events-none absolute bottom-3 left-4 max-w-[42%] text-[8px] leading-tight text-white/55 font-secondary">
                        Las imágenes están sujetas a <a href="/terminos-y-condiciones" className="pointer-events-auto underline hover:text-white/90 transition-colors">términos y condiciones</a> de la inmobiliaria
                    </span>
                </div>
            </nav>
        </>
    );
};

export default Sidebar;
