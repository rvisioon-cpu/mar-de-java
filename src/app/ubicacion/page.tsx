"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import MapComponent from '@/components/map/Map';
import Sidebar from '@/components/layout/Sidebar';
import { Search, MapPin, Menu, ChevronDown, ChevronUp, Car, Footprints, Bike, Navigation, X, Map as MapIcon, Play, Building2 } from 'lucide-react';
import { type LocationFeature } from '@/data/locations';
import { landmarks, landmarkPoiNames } from '@/data/landmarks';
import { getLocations, seedLocations } from '@/app/actions/locations';
import { useStore } from '@/store/useStore';
import { getAssetUrl } from '@/utils/assets';
import { getProjectVideo } from '@/data/projectVideos';
import ProjectBuildingPlayer from '@/components/map/ProjectBuildingPlayer';

// Residencial Mar de Java — the origin every hito is measured from.
const PROJECT_COORDS: [number, number] = [-76.97538, -12.079162];

const DirectionsPage = () => {
    const isForcedLandscape = useStore(state => state.isForcedLandscape);
    const setForcedLandscape = useStore(state => state.setForcedLandscape);
    const [locations, setLocations] = useState<any[]>([]);
    const [mapboxToken, setMapboxToken] = useState('');
    const [filter, setFilter] = useState('');
    const [selectedName, setSelectedName] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Video Transition State & References (desactivado por ahora para cargar el mapa directamente)
    const ENABLE_INTRO_VIDEO = true;
    const videoRef = useRef<HTMLVideoElement>(null);
    const [viewMode, setViewMode] = useState<'video' | 'map'>('video');
    // The "Explorar mapa" button appears once the intro video reaches the mark
    // below, so it is offered well before the clip finishes its first pass.
    const [showExploreButton, setShowExploreButton] = useState(false);
    const EXPLORE_BUTTON_AT_SECONDS = 6;

    // Control de orientación: forzar horizontal para el video introductorio en móviles en retrato, y volver a vertical al cambiar a mapa
    useEffect(() => {
        const checkAndApplyLandscape = () => {
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth <= 1024 && 'ontouchstart' in window);
            const isPortrait = window.matchMedia("(orientation: portrait)").matches;

            if (viewMode === 'video' && isMobile && isPortrait) {
                setForcedLandscape(true);
            } else {
                setForcedLandscape(false);
            }
        };

        checkAndApplyLandscape();

        window.addEventListener('resize', checkAndApplyLandscape);
        window.addEventListener('orientationchange', checkAndApplyLandscape);

        return () => {
            window.removeEventListener('resize', checkAndApplyLandscape);
            window.removeEventListener('orientationchange', checkAndApplyLandscape);
            setForcedLandscape(false);
        };
    }, [viewMode, setForcedLandscape]);

    const videoUrl = getAssetUrl('location/videos/video_mapa_final.mp4');
    const posterUrl = getAssetUrl('location/photos/FOTO_VISTA_PLANETA_PERU.webp');

    const handleVideoEnded = () => {
        const video = videoRef.current;
        if (!video) return;
        setShowExploreButton(true); // first full play finished
        video.currentTime = 8;
        video.play().catch(console.error);
    };

    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (!video) return;
        if (video.currentTime >= EXPLORE_BUTTON_AT_SECONDS) {
            setShowExploreButton(true);
        }
        if (video.duration && video.currentTime >= video.duration - 0.15) {
            setShowExploreButton(true); // reached the end (loop restart preempts onEnded)
            video.currentTime = 8;
            video.play().catch(console.error);
        }
    };

    // Load locations dynamically from database
    useEffect(() => {
        seedLocations().then(() => {
            getLocations().then((dbLocs) => {
                setLocations(dbLocs);
            });
        });
    }, []);

    // Cloudflare Pages exposes secrets to the Worker at runtime. Fetch the
    // public Mapbox token from our own route instead of relying on build-time
    // NEXT_PUBLIC_* replacement.
    useEffect(() => {
        let cancelled = false;
        fetch('/api/map-config')
            .then(response => response.ok ? response.json() : Promise.reject(new Error('Map config unavailable')))
            .then(({ token }) => {
                if (!cancelled && typeof token === 'string') setMapboxToken(token);
            })
            .catch(error => console.error('Error loading map configuration:', error));
        return () => { cancelled = true; };
    }, []);

    // Map database locations to GeoJSON features
    const locationsFeatures = useMemo<LocationFeature[]>(() => {
        return locations.map(loc => ({
            type: "Feature" as const,
            properties: {
                nombre: loc.name,
                categoria: loc.category,
                imagen: loc.imagePath || undefined
            },
            geometry: {
                coordinates: [loc.longitude, loc.latitude] as [number, number],
                type: "Point" as const
            },
            id: loc.id
        }));
    }, [locations]);

    // Initialize panel open on desktop
    const [isPanelOpen, setIsPanelOpen] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth >= 768;
        }
        return false;
    });

    const [searchMode, setSearchMode] = useState<'explore' | 'directions'>('explore');
    const [originLocation, setOriginLocation] = useState<[number, number] | null>(null);
    const [destination, setDestination] = useState<[number, number] | null>(null);
    const [searchResults, setSearchResults] = useState<any[]>([]);

    const [transportMode, setTransportMode] = useState<'driving' | 'walking' | 'cycling'>('driving');
    const [routeStats, setRouteStats] = useState<{ driving: { duration: number }; walking: { duration: number }; cycling: { duration: number } } | null>(null);

    // Hitos: travel time from the project to each one, and the clip being watched
    const [landmarkDurations, setLandmarkDurations] = useState<Record<string, number>>({});
    const [openLandmarkSlug, setOpenLandmarkSlug] = useState<string | null>(null);
    const openLandmark = landmarks.find(l => l.slug === openLandmarkSlug) || null;

    // Proyectos: building footage (transition + loop), opened with a double
    // click on the pin or from "Ver edificio" after selecting it.
    const [openProject, setOpenProject] = useState<{ id: string; name: string } | null>(null);
    const openProjectVideo = openProject ? getProjectVideo(openProject.id, openProject.name) : null;
    const handleProjectOpen = useCallback((id: string, name: string) => setOpenProject({ id, name }), []);

    // Deliberately the Directions endpoint, not the cheaper Matrix one: the
    // route drawn when a hito is picked comes from Directions, and the two
    // disagree by minutes on some of these, which would show the same trip
    // with two different times on screen at once.
    useEffect(() => {
        if (!mapboxToken) return;
        let cancelled = false;

        const origin = `${PROJECT_COORDS[0]},${PROJECT_COORDS[1]}`;
        Promise.all(landmarks.map(landmark =>
            fetch(`https://api.mapbox.com/directions/v5/mapbox/${transportMode}/${origin};${landmark.coordinates[0]},${landmark.coordinates[1]}?access_token=${mapboxToken}`)
                .then(res => res.json() as Promise<any>)
                .then(data => data?.routes?.[0]?.duration as number | undefined)
                .catch(() => undefined)
        )).then(durations => {
            if (cancelled) return;
            const next: Record<string, number> = {};
            landmarks.forEach((landmark, i) => {
                const seconds = durations[i];
                if (typeof seconds === 'number') next[landmark.slug] = seconds;
            });
            setLandmarkDurations(next);
        });

        return () => { cancelled = true; };
    }, [transportMode, mapboxToken]);

    const rawCategories = Array.from(new Set(locationsFeatures.map((f: LocationFeature) => f.properties.categoria))).filter(Boolean) as string[];
    const otherCategories = rawCategories.filter(c => c !== 'Proyectos' && c !== 'Otros proyectos');
    const categories: string[] = ['Hitos'];
    if (rawCategories.some(c => c === 'Proyectos' || c === 'Otros proyectos')) {
        categories.push('Proyectos');
    }
    categories.push(...otherCategories);

    const filteredLandmarks = landmarks.filter((landmark) => {
        const matchesSearch = landmark.name.toLowerCase().includes(filter.toLowerCase()) ||
                              landmark.category.toLowerCase().includes(filter.toLowerCase());

        let matchesCategory = true;
        if (selectedCategory) {
            if (selectedCategory === 'Hitos') {
                matchesCategory = true;
            } else {
                matchesCategory = landmark.category.toLowerCase() === selectedCategory.toLowerCase();
            }
        }
        return matchesSearch && matchesCategory;
    });

    const filteredLocations = locationsFeatures.filter((feature: LocationFeature) => {
        // The hitos carry their own marker and are rendered first from filteredLandmarks
        if (landmarkPoiNames.has(feature.properties.nombre)) return false;

        if (selectedCategory === 'Hitos') return false;

        const matchesSearch = feature.properties.nombre.toLowerCase().includes(filter.toLowerCase());
        const matchesCategory = selectedCategory
            ? (selectedCategory === 'Proyectos'
                ? (feature.properties.categoria === 'Proyectos' || feature.properties.categoria === 'Otros proyectos')
                : feature.properties.categoria === selectedCategory)
            : true;
        return matchesSearch && matchesCategory;
    });

    // The selected pin, when it is a project with building footage
    const selectedProject = useMemo(() => {
        if (!selectedName) return null;
        const feature = locationsFeatures.find(f => f.properties.nombre === selectedName);
        if (!feature || !getProjectVideo(feature.id, feature.properties.nombre)) return null;
        return feature;
    }, [selectedName, locationsFeatures]);

    useEffect(() => {
        if (searchMode === 'directions' && filter.length > 2) {
            const timer = setTimeout(async () => {
                try {
                    if (!mapboxToken) return;
                    const response = await fetch(
                        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(filter)}.json?access_token=${mapboxToken}&country=pe&limit=5&language=es&proximity=-76.97538,-12.079162`
                    );
                    const data = (await response.json()) as any;
                    setSearchResults(data.features || []);
                } catch (error) {
                    console.error("Error searching places:", error);
                }
            }, 500);
            return () => clearTimeout(timer);
        } else if (searchMode === 'directions') {
            setSearchResults([]);
        }
    }, [filter, searchMode, mapboxToken]);

    const handleLocationSelect = (coords: [number, number], name?: string) => {
        if (name) setSelectedName(name);

        if (searchMode === 'explore') {
            setDestination(coords);
            setOriginLocation(null);
        } else {
            setOriginLocation(coords);
            setDestination(null);
        }

        if (window.innerWidth < 768) setIsPanelOpen(false);
    };

    const handleRouteCalculated = useCallback((stats: any | null) => {
        setRouteStats(prev => {
            if (JSON.stringify(prev) === JSON.stringify(stats)) return prev;
            return stats;
        });
    }, []);

    // Three states: open, peeking (its handle stays clickable so it can be
    // reopened), and fully out of the way while a hito's clip is playing.
    const panelStateClasses = openLandmark || openProject || viewMode !== 'map'
        ? 'translate-y-full pointer-events-none'
        : isPanelOpen
            ? 'translate-y-0 pointer-events-auto'
            : 'translate-y-full md:translate-y-[calc(100%-180px)] pointer-events-auto';

    const formatDuration = (seconds: number) => {
        if (!seconds) return '';
        const mins = Math.round(seconds / 60);
        return `${mins} min`;
    };

    return (
        <div
            className="w-full relative overflow-hidden bg-gray-200"
            style={{
                height: isForcedLandscape ? '100vw' : '100svh',
            }}
        >
            <div className="absolute inset-0 z-0">
                <MapComponent
                    mapboxToken={mapboxToken}
                    destination={destination}
                    origin={originLocation}
                    onMarkerClick={(coords, name) => {
                        // Only handle marker clicks in explore mode primarily, or to set destination
                        if (searchMode === 'explore') handleLocationSelect(coords, name);
                    }}
                    transportMode={transportMode}
                    onRouteCalculated={handleRouteCalculated}
                    locations={filteredLocations}
                    landmarks={landmarks}
                    landmarkDurations={landmarkDurations}
                    openLandmarkSlug={openLandmarkSlug}
                    onLandmarkOpen={setOpenLandmarkSlug}
                    onProjectOpen={handleProjectOpen}
                    padding={useMemo(() => {
                        // Only push map on desktop where panel is sidebar
                        const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
                        return {
                            top: 0,
                            bottom: 0,
                            left: (isPanelOpen && isDesktop) ? 480 : 0,
                            right: 0
                        };
                    }, [isPanelOpen])}
                />
            </div>

            {/* Top Left Controls Container */}
            {/* Burger Menu Button (Highest priority z-index so it's always above the mobile panel) */}
            <div
                className="fixed top-6 left-6 z-50 pointer-events-none"
                style={{ top: 'calc(1.5rem + env(safe-area-inset-top))', left: 'calc(1.5rem + env(safe-area-inset-left))' }}
            >
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 text-white bg-brand-primary rounded-full hover:bg-brand-dark-orange transition-colors cursor-pointer shadow-lg pointer-events-auto"
                >
                    <Menu size={24} />
                </button>
            </div>

            {/* Page Title - Lower z-index so the panel slides over it on mobile */}
            <div
                className="fixed top-6 left-20 z-30 pointer-events-none"
                style={{ top: 'calc(1.5rem + env(safe-area-inset-top))', left: 'calc(5rem + env(safe-area-inset-left))' }}
            >
                <h1 className="text-2xl font-secondary font-bold text-gray-900 bg-white/90 backdrop-blur-sm px-6 py-2 rounded-full shadow-md pointer-events-auto">
                    Direcciones
                </h1>
            </div>

            {/* Top Right Controls - Travel Modes & Info */}
            <div
                className="fixed top-6 right-16 z-30 flex flex-col gap-4 items-end pointer-events-none"
                style={{ top: 'calc(1.5rem + env(safe-area-inset-top))', right: 'calc(4rem + env(safe-area-inset-right))' }}
            >
                <div className="flex flex-col gap-2 items-end">
                    {([
                        { mode: 'driving' as const, Icon: Car, label: 'Auto' },
                        { mode: 'walking' as const, Icon: Footprints, label: 'Caminar' },
                        { mode: 'cycling' as const, Icon: Bike, label: 'Bicicleta' },
                    ]).map(({ mode, Icon, label }) => (
                        <button
                            key={mode}
                            onClick={() => setTransportMode(mode)}
                            className={`flex items-center justify-center h-10 rounded-full shadow-lg transition-all pointer-events-auto ${routeStats ? 'gap-2 px-4' : 'w-10'} ${transportMode === mode ? 'bg-brand-orange text-white scale-105' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                            title={label}
                        >
                            <Icon size={20} className="shrink-0" />
                            {routeStats && <span className="text-xs font-bold whitespace-nowrap">{formatDuration(routeStats[mode].duration)}</span>}
                        </button>
                    ))}
                </div>
            </div>

            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {/* Floating Toggle Button - Mobile Only (Visible when panel closed) */}
            {!isPanelOpen && !openLandmark && !openProject && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20 md:hidden pointer-events-auto">
                    <button
                        onClick={() => setIsPanelOpen(true)}
                        className="flex items-center gap-2 bg-brand-orange text-white px-5 py-2.5 rounded-full shadow-lg hover:bg-brand-dark-orange transition-colors"
                    >
                        <ChevronUp size={20} />
                        <span className="font-bold text-sm">Ver Panel</span>
                    </button>
                </div>
            )}

            {/* Floating Bottom Panel (Console) */}
            <div
                className={`fixed bottom-0 md:bottom-6 left-0 md:left-6 w-full md:w-[450px] bg-white md:rounded-2xl shadow-2xl z-40 flex flex-col transition-all duration-500 ease-in-out h-full md:h-auto md:max-h-[70%] ${panelStateClasses}`}
            >

                {/* Handler / Header Area */}
                <div
                    className="p-4 border-b border-gray-100 flex flex-col gap-4 cursor-pointer bg-white md:rounded-t-2xl"
                    onClick={(e) => {
                        // Prevent toggling when clicking inputs or buttons
                        if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).closest('button')) return;
                        setIsPanelOpen(!isPanelOpen);
                    }}
                >
                    {/* Header Content */}
                    <div className="flex flex-col gap-2 w-full">

                        {/* Close Handle / Arrow - Top Center (User Request) */}
                        <div className="w-full flex justify-center pb-1">
                            <button
                                className="text-gray-400 hover:text-brand-orange p-1"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsPanelOpen(!isPanelOpen);
                                }}
                            >
                                {isPanelOpen ? <ChevronDown size={24} /> : <ChevronUp size={24} />}
                            </button>
                        </div>

                        {/* Active Selection Capsule OR Clear Button */}
                        {(selectedName || filter || originLocation || destination) && (
                            <div className="flex justify-end">
                                {selectedName ? (
                                    <button
                                        onClick={() => {
                                            setFilter('');
                                            setOriginLocation(null);
                                            if (searchMode === 'directions') setDestination(null);
                                            if (searchMode === 'explore') setDestination(null);
                                            else setOriginLocation(null);
                                            setSearchResults([]);
                                            setRouteStats(null);
                                            setSelectedName(null);
                                        }}
                                        className="flex items-center gap-2 text-xs font-semibold text-white bg-brand-orange hover:bg-brand-dark-orange transition-colors px-3 py-1.5 rounded-full shadow-md"
                                    >
                                        <MapPin size={12} className="fill-current" />
                                        {selectedName}
                                        <div className="bg-white/20 rounded-full p-0.5 ml-1 hover:bg-white/30">
                                            <X size={12} />
                                        </div>
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            setFilter('');
                                            setOriginLocation(null);
                                            if (searchMode === 'directions') setDestination(null);
                                            if (searchMode === 'explore') setDestination(null);
                                            else setOriginLocation(null);
                                            setSearchResults([]);
                                            setRouteStats(null);
                                            setSelectedName(null);
                                        }}
                                        className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-brand-orange transition-colors px-2 py-1 rounded-full hover:bg-gray-100"
                                    >
                                        <X size={14} />
                                        Limpiar selección
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                            {/* Mode Tabs */}
                            <div className="flex bg-gray-100 rounded-lg p-1 shrink-0 self-start md:self-center">
                                <button
                                    onClick={() => { setSearchMode('explore'); setFilter(''); }}
                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${searchMode === 'explore' ? 'bg-white text-brand-orange shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Explorar
                                </button>
                                <button
                                    onClick={() => { setSearchMode('directions'); setFilter(''); }}
                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${searchMode === 'directions' ? 'bg-white text-brand-orange shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Cómo llegar
                                </button>
                            </div>


                            {/* Search - Inline with subtitle */}
                            <div className="relative flex-1 w-full md:max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-orange" size={16} />
                                <input
                                    type="text"
                                    placeholder={searchMode === 'explore' ? "Buscar lugares cercanos..." : "Ingresa tu ubicación..."}
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-800 focus:outline-none focus:border-brand-orange transition-colors"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content (Scrollable) */}
                <div className="flex-1 flex flex-col overflow-hidden bg-white md:rounded-b-2xl">
                    {searchMode === 'explore' && (
                        <div className="p-4 pb-2 space-y-3 shrink-0 bg-white border-b border-gray-100">
                            {/* Categories - Horizontal Scroll */}
                            <div className="flex gap-2 pb-2 overflow-x-auto scrollbar-thin">
                                <button
                                    onClick={() => setSelectedCategory(null)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-medium text-center transition-colors whitespace-nowrap shrink-0 ${!selectedCategory ? 'bg-brand-orange text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    Todos
                                </button>
                                {categories.map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-4 py-1.5 rounded-full text-xs font-medium text-center transition-colors whitespace-nowrap shrink-0 ${selectedCategory === cat ? 'bg-brand-orange text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                        title={cat}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Selected project: offer its building view */}
                    {searchMode === 'explore' && selectedProject && (
                        <div className="px-4 pt-4 shrink-0">
                            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 p-4 flex items-center gap-4 shadow-lg">
                                <div className="w-12 h-12 rounded-lg bg-white/10 p-1.5 flex items-center justify-center shrink-0">
                                    {selectedProject.properties.imagen ? (
                                        <img
                                            src={getAssetUrl(selectedProject.properties.imagen)}
                                            alt={selectedProject.properties.nombre}
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <Building2 size={22} className="text-white" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] uppercase tracking-wider text-white/60 font-semibold">Proyecto</p>
                                    <h3 className="text-sm font-bold text-white truncate">{selectedProject.properties.nombre}</h3>
                                </div>
                                <button
                                    id="view-building-button"
                                    type="button"
                                    onClick={() => handleProjectOpen(selectedProject.id, selectedProject.properties.nombre)}
                                    className="shrink-0 inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-dark-orange text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-md transition-all hover:scale-105 cursor-pointer"
                                >
                                    <Building2 size={14} />
                                    Ver edificio
                                </button>
                                {/* Warm the cache so the transition starts right away */}
                                <video
                                    key={selectedProject.id}
                                    src={getAssetUrl(getProjectVideo(selectedProject.id, selectedProject.properties.nombre)!.transition)}
                                    preload="auto"
                                    muted
                                    className="hidden"
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-4 pt-4 space-y-2">
                        {searchMode === 'explore' ? (
                            (filteredLandmarks.length > 0 || filteredLocations.length > 0) ? (
                                <>
                                    {/* Hitos renderizados primero */}
                                    {filteredLandmarks.map((landmark) => {
                                        const isSelected = selectedName === landmark.name;
                                        const duration = landmarkDurations[landmark.slug];
                                        return (
                                            <div
                                                key={landmark.slug}
                                                onClick={() => handleLocationSelect(landmark.coordinates, landmark.name)}
                                                className={`p-2.5 rounded-xl border transition-all cursor-pointer group flex items-center justify-between gap-3 shadow-xs ${
                                                    isSelected
                                                        ? 'border-brand-orange bg-orange-50/70 ring-1 ring-brand-orange'
                                                        : 'border-brand-orange/30 bg-orange-50/20 hover:border-brand-orange hover:bg-orange-50/45'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenLandmarkSlug(landmark.slug);
                                                        }}
                                                        className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-brand-orange/20 shadow-xs bg-black/5"
                                                        title="Reproducir clip"
                                                    >
                                                        <img
                                                            src={getAssetUrl(landmark.poster)}
                                                            alt={landmark.name}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                            onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                                                        />
                                                        <div className="absolute inset-0 bg-black/25 flex items-center justify-center hover:bg-black/10 transition-colors">
                                                            <div className="w-5 h-5 rounded-full bg-brand-orange text-white flex items-center justify-center shadow">
                                                                <Play size={9} className="fill-current ml-0.5" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <h3 className="text-sm font-bold text-gray-900 group-hover:text-brand-orange transition-colors truncate">
                                                                {landmark.name}
                                                            </h3>
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-orange/15 text-brand-orange tracking-wide uppercase">
                                                                Hito
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                                                            <span className="text-brand-orange font-medium">{landmark.category}</span>
                                                            {duration && (
                                                                <>
                                                                    <span className="text-gray-300">•</span>
                                                                    <span className="font-medium text-gray-600">
                                                                        A {formatDuration(duration)}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenLandmarkSlug(landmark.slug);
                                                    }}
                                                    className="px-2.5 py-1.5 rounded-lg bg-white/90 border border-brand-orange/20 hover:bg-brand-orange hover:text-white text-brand-orange transition-all shrink-0 flex items-center gap-1.5 text-xs font-semibold shadow-xs"
                                                    title="Ver clip"
                                                >
                                                    <Play size={11} className="fill-current" />
                                                    <span className="hidden sm:inline">Ver clip</span>
                                                </button>
                                            </div>
                                        );
                                    })}

                                    {/* POIs regulares */}
                                    {filteredLocations.map((feature: any) => {
                                        const isSelected = selectedName === feature.properties.nombre;
                                        return (
                                            <div
                                                key={feature.id || feature.properties.nombre}
                                                onClick={() => handleLocationSelect(feature.geometry.coordinates, feature.properties.nombre)}
                                                className={`p-3 rounded-lg border transition-all cursor-pointer group flex items-start gap-3 ${
                                                    isSelected
                                                        ? 'border-brand-orange bg-orange-50/60 ring-1 ring-brand-orange'
                                                        : 'border-gray-100 hover:border-brand-orange/30 hover:bg-orange-50/30'
                                                }`}
                                            >
                                                <div className="w-10 h-10 rounded-full bg-white p-1.5 shadow-sm border border-gray-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                                    {feature.properties.imagen ? (
                                                        <img
                                                            src={feature.properties.imagen.startsWith('http') || feature.properties.imagen.startsWith('/') ? feature.properties.imagen : `/${feature.properties.imagen}`}
                                                            alt={feature.properties.nombre}
                                                            className="w-full h-full object-contain"
                                                            onError={(e) => e.currentTarget.style.display = 'none'}
                                                        />
                                                    ) : (
                                                        <MapPin size={20} className="text-gray-400 group-hover:text-brand-orange" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-sm font-bold text-gray-800">{feature.properties.nombre}</h3>
                                                    <p className="text-xs text-brand-orange font-medium">{feature.properties.categoria}</p>
                                                </div>
                                                {getProjectVideo(feature.id, feature.properties.nombre) && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleProjectOpen(feature.id, feature.properties.nombre);
                                                        }}
                                                        className="self-center px-2.5 py-1.5 rounded-lg bg-white border border-brand-orange/20 hover:bg-brand-orange hover:text-white text-brand-orange transition-all shrink-0 flex items-center gap-1.5 text-xs font-semibold shadow-xs cursor-pointer"
                                                        title="Ver edificio"
                                                    >
                                                        <Building2 size={12} />
                                                        <span className="hidden sm:inline">Ver edificio</span>
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </>
                            ) : (
                                <div className="text-center py-10 text-gray-400 text-sm">
                                    No se encontraron resultados
                                </div>
                            )
                        ) : (
                            // Search Results for Directions
                            searchResults.length > 0 ? (
                                searchResults.map((feature: any) => (
                                    <div
                                        key={feature.id}
                                        onClick={() => handleLocationSelect(feature.center, feature.text)}
                                        className="p-3 rounded-lg border border-gray-100 hover:border-brand-orange/30 hover:bg-orange-50/30 transition-all cursor-pointer group flex items-start gap-3"
                                    >
                                        <div className="p-2 rounded bg-orange-50 text-brand-orange transition-colors">
                                            <Navigation size={18} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-800">{feature.text}</h3>
                                            <p className="text-xs text-brand-orange font-medium truncate max-w-[250px]">{feature.place_name}</p>
                                        </div>
                                    </div>
                                ))
                            ) : filter.length > 2 ? (
                                <div className="text-center py-10 text-gray-400 text-sm">
                                    Buscando...
                                </div>
                            ) : (
                                <div className="text-center py-10 text-gray-400 text-sm">
                                    Ingresa una dirección para ver la ruta
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* Hito player — takes over the space the directions panel leaves */}
            {openLandmark && (
                <div className="fixed inset-0 md:inset-auto md:top-6 md:bottom-6 md:left-6 md:w-[420px] z-50 bg-black/70 md:bg-transparent flex items-center justify-center p-4 md:p-0">
                    <div className="relative w-full h-full max-w-[420px] md:max-w-none bg-black rounded-2xl overflow-hidden shadow-2xl">
                        <video
                            key={openLandmark.slug}
                            src={getAssetUrl(openLandmark.video)}
                            poster={getAssetUrl(openLandmark.poster)}
                            autoPlay
                            controls
                            playsInline
                            className="w-full h-full object-cover"
                        />

                        {/* Title strip */}
                        <div className="absolute inset-x-0 top-0 p-4 pb-10 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                            <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">
                                {openLandmark.category}
                            </p>
                            <h2 className="text-lg font-bold text-white font-secondary leading-tight pr-10">
                                {openLandmark.name}
                            </h2>
                            {landmarkDurations[openLandmark.slug] && (
                                <p className="text-xs text-white/80 mt-1">
                                    A {formatDuration(landmarkDurations[openLandmark.slug])} del proyecto
                                </p>
                            )}
                        </div>

                        <button
                            onClick={() => setOpenLandmarkSlug(null)}
                            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-colors cursor-pointer"
                            title="Cerrar"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Project building view — transition, then loop */}
            {openProject && openProjectVideo && (
                <ProjectBuildingPlayer
                    key={openProject.id}
                    name={openProject.name}
                    video={openProjectVideo}
                    onClose={() => setOpenProject(null)}
                />
            )}

            {/* Video Transition Overlay (desactivado temporalmente) */}
            {ENABLE_INTRO_VIDEO && viewMode === 'video' && (
                <div className="fixed inset-0 z-40 bg-black flex items-center justify-center">
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        poster={posterUrl}
                        autoPlay
                        muted
                        playsInline
                        onEnded={handleVideoEnded}
                        onTimeUpdate={handleTimeUpdate}
                        className="w-full h-full object-cover"
                    />

                    <button
                        onClick={() => {
                            setViewMode('map');
                            setForcedLandscape(false);
                        }}
                        className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-full border border-white/25 bg-black/40 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-md transition hover:border-white/50 hover:bg-black/60"
                        aria-label="Saltar el video e ir al mapa"
                    >
                        <span>Saltar</span>
                        <X size={14} className="text-white/60" />
                    </button>

                    {/* Floating Button to Switch to Interactive Map — revealed
                        once the intro video passes EXPLORE_BUTTON_AT_SECONDS. */}
                    <div
                        className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-50 transition-all duration-700 ease-out ${showExploreButton ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}
                    >
                        <button
                            onClick={() => {
                                setViewMode('map');
                                setForcedLandscape(false);
                            }}
                            className="flex items-center gap-2 bg-brand-primary/90 hover:bg-brand-primary backdrop-blur-xl border border-white/20 text-white px-8 py-3.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer uppercase tracking-wider text-xs lg:text-sm font-semibold font-secondary"
                        >
                            <MapIcon size={20} />
                            <span>Explorar Mapa Interactivo</span>
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};
export default DirectionsPage;
