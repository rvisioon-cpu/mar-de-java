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
                className={`fixed inset-0 z-[70] isolate overflow-hidden flex flex-col bg-gradient-to-b from-brand-primary/90 via-ocean-700/95 to-ocean-900/95 backdrop-blur-xl transition-opacity duration-400
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
                                                    ? 'bg-brand-yellow text-brand-primary shadow-lg'
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
                            <span className="flex h-9 items-center rounded-md bg-white px-2 py-1 shadow-sm">
                                <img src="/identity/buleje-grupo-inmobiliario.png" alt={config.company?.realStateName} className="h-full w-auto object-contain" />
                            </span>
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

    // ── STANDARD WEB: organic left-side navigation inspired by the supplied model.
    return (
        <>
            {/* Frosted underwater backdrop. The bubbles borrow the slow vertical
                drift from the supplied CodePen; no sprite or GitHub asset is used. */}
            <div
                className={`java-ocean-backdrop fixed inset-0 z-[60] overflow-hidden transition-all duration-500 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            >
                <div className="java-ocean-glow" aria-hidden="true" />
                <div className="java-underwater-rays" aria-hidden="true" />
                <div className="java-caustics" aria-hidden="true" />
                <div className="java-marine-dust" aria-hidden="true">
                    <span className="java-dust-layer java-dust-layer--far" />
                    <span className="java-dust-layer java-dust-layer--mid" />
                    <span className="java-dust-layer java-dust-layer--near" />
                </div>
                <div className="java-bubbles" aria-hidden="true">
                    {Array.from({ length: 12 }, (_, index) => (
                        <span key={index} className={`java-bubble java-bubble--${index + 1}`} />
                    ))}
                </div>
            </div>

            <nav
                aria-label="Navegación principal"
                aria-hidden={!isOpen}
                className={`java-side-menu fixed inset-y-0 left-0 z-[70] h-dvh w-[min(330px,88vw)] transform transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]
                    ${isOpen ? 'translate-x-0 opacity-100' : '-translate-x-[115%] opacity-0 pointer-events-none'}`}
            >
                <div className="java-side-current" aria-hidden="true" />
                <div className="relative z-10 flex h-full min-h-0 flex-col px-5 pb-5 pt-3 sm:px-6">
                    <div className="relative flex h-[84px] shrink-0 items-center justify-center">
                        <img
                            src="/identity/identity_logo_white.png"
                            alt={config.appName}
                            className="h-12 w-auto max-w-[190px] object-contain drop-shadow-lg"
                        />
                        <button
                            onClick={onClose}
                            aria-label="Cerrar menú"
                            className="java-menu-close absolute right-0 grid h-8 w-8 place-items-center text-brand-yellow/85 transition-all duration-300 hover:text-brand-yellow hover:scale-105 cursor-pointer"
                        >
                            <X size={16} strokeWidth={1.8} />
                        </button>
                    </div>

                    <ul className="java-menu-list mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
                        {menuItems.map((item) => {
                            const active = isItemActive(item.path);
                            const IconComponent = IconMap[item.icon] || Box;
                            return (
                                <li key={item.label}>
                                    <button
                                        onClick={() => handleNavigation(item.path, (item as any).action)}
                                        onMouseEnter={() => handleMouseEnter((item as any).preloadKey)}
                                        className={`java-menu-item group/item relative flex h-11 w-full items-center gap-3 overflow-hidden rounded-[10px_10px_20px_10px] border px-3 text-left transition-all duration-300 cursor-pointer
                                            ${active
                                                ? 'border-brand-yellow/40 bg-gradient-to-r from-[#eabf45] to-brand-yellow text-brand-primary shadow-lg'
                                                : 'border-transparent text-white/90 hover:border-white/10 hover:bg-white/[0.06] hover:text-brand-yellow'}`}
                                    >
                                        <IconComponent size={18} strokeWidth={active ? 2 : 1.7} className="relative z-10 shrink-0 transition-transform duration-300 group-hover/item:translate-x-0.5" />
                                        <span className="relative z-10 font-primary text-[12px] font-semibold tracking-wide transition-transform duration-300 group-hover/item:translate-x-0.5">
                                            {item.label}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>

                    <div className="mt-4 shrink-0 border-t border-white/10 pt-4 text-center">
                        <div className="mb-3 flex justify-center"><SocialLinks /></div>
                        {config.company?.realStateWebsite && (
                            <a
                                href={config.company.realStateWebsite}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={config.company.realStateName}
                                className="mx-auto mb-3 flex h-11 w-[154px] items-center justify-center px-1 py-1 opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-[1.03]"
                            >
                                <img
                                    src="/identity/buleje-grupo-inmobiliario.png"
                                    alt={config.company.realStateName}
                                    className="h-full w-full object-contain brightness-0 invert"
                                />
                            </a>
                        )}
                        <a
                            href={config.company?.developerWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-secondary text-[11px] tracking-wide text-white/70 transition-colors hover:text-brand-yellow"
                        >
                            {new Date().getFullYear()} © {config.company?.developer}
                        </a>
                        <p className="mx-auto mt-2 max-w-[245px] font-secondary text-[10px] leading-relaxed text-ocean-200/65">
                            Las imágenes están sujetas a <a href="/terminos-y-condiciones" className="underline transition-colors hover:text-white">términos y condiciones</a> de la inmobiliaria.
                        </p>
                    </div>
                </div>
            </nav>
        </>
    );
};

export default Sidebar;
