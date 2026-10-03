"use client";
import { useRef, useMemo, useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import MapboxMap, {
  Marker as MapboxMarker,
  NavigationControl as MapboxNavigationControl,
  FullscreenControl as MapboxFullscreenControl,
  ScaleControl as MapboxScaleControl,
  Source as MapboxSource,
  Layer as MapboxLayer,
  Popup as MapboxPopup,
} from 'react-map-gl/mapbox';
import MapLibreMap, {
  Marker as MapLibreMarker,
  NavigationControl as MapLibreNavigationControl,
  FullscreenControl as MapLibreFullscreenControl,
  ScaleControl as MapLibreScaleControl,
  Source as MapLibreSource,
  Layer as MapLibreLayer,
  Popup as MapLibrePopup,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin } from 'lucide-react';
import { locationsData, OTHER_PROJECTS_CATEGORY, PROJECT_LOCATION } from '@/data/locations';
import { getAssetUrl } from '@/utils/assets';
import config from '@/config/config';
import LandmarkMarker from './LandmarkMarker';
import type { Landmark } from '@/data/landmarks';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
const MAPBOX_STYLE = process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL || 'mapbox://styles/rvisioon/cmu75eceh006i01s72u5e54ee';

// Each renderer's child controls depend on its own React context, so select
// the complete component family together at build time.
const Map = (MAPBOX_TOKEN ? MapboxMap : MapLibreMap) as any;
const Marker = (MAPBOX_TOKEN ? MapboxMarker : MapLibreMarker) as any;
const NavigationControl = (MAPBOX_TOKEN ? MapboxNavigationControl : MapLibreNavigationControl) as any;
const FullscreenControl = (MAPBOX_TOKEN ? MapboxFullscreenControl : MapLibreFullscreenControl) as any;
const ScaleControl = (MAPBOX_TOKEN ? MapboxScaleControl : MapLibreScaleControl) as any;
const Source = (MAPBOX_TOKEN ? MapboxSource : MapLibreSource) as any;
const Layer = (MAPBOX_TOKEN ? MapboxLayer : MapLibreLayer) as any;
const Popup = (MAPBOX_TOKEN ? MapboxPopup : MapLibrePopup) as any;

// Pages injects NEXT_PUBLIC_* values at build time. Keep the map usable when
// that build variable is missing instead of letting Mapbox abort initialization
// before any marker can mount.
const FALLBACK_MAP_STYLE = {
  version: 8 as const,
  sources: {
    openStreetMap: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'open-street-map',
      type: 'raster' as const,
      source: 'openStreetMap',
    },
  ],
};

// Initial view state centering on Residencial Mar de Java (Salamanca, Ate, Lima)
const INITIAL_VIEW_STATE = {
  latitude: PROJECT_LOCATION.coordinates[1],
  longitude: PROJECT_LOCATION.coordinates[0],
  zoom: 16,
  bearing: 0,
  pitch: 0
};

interface RouteStats {
    duration: number; // seconds
    distance: number; // meters
}

interface MapProps {
    destination?: [number, number] | null; // [lng, lat]
    origin?: [number, number] | null; // [lng, lat]
    padding?: { top: number; bottom: number; left: number; right: number };
    onMarkerClick?: (coordinates: [number, number], name?: string) => void;
    transportMode?: 'driving' | 'walking' | 'cycling';
    onRouteCalculated?: (stats: { driving: RouteStats; walking: RouteStats; cycling: RouteStats } | null) => void;
    locations?: any[]; // Feature[]
    landmarks?: Landmark[];
    /** Travel time from the project to each landmark, in seconds, keyed by slug. */
    landmarkDurations?: Record<string, number>;
    /** Slug of the clip currently playing, if any. */
    openLandmarkSlug?: string | null;
    onLandmarkOpen?: (slug: string) => void;
}

export default function MapComponent({ destination, origin, padding, onMarkerClick, transportMode = 'driving', onRouteCalculated, locations, landmarks, landmarkDurations, openLandmarkSlug, onLandmarkOpen }: MapProps) {
  const mapRef = useRef<any>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const [routeStats, setRouteStats] = useState<RouteStats | null>(null);
  // Only one hito card shows at a time, and it is lifted above the project pin.
  const [activeLandmark, setActiveLandmark] = useState<string | null>(null);

  // Use passed locations or default to all if not provided (fallback)
  const displayLocations = locations || locationsData.features;

  // Fetch Route when destination changes
  useEffect(() => {
    const fetchRoute = async () => {
        try {
            if (!MAPBOX_TOKEN) return;

            // Determine start and end points
            let start: [number, number];
            let end: [number, number];

            if (destination && !origin) {
                // Explore Mode: From Mar de Java TO Destination
                start = [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude];
                end = destination;
            } else if (origin) {
                // Search Mode: From Origin TO Mar de Java
                start = origin;
                end = [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude];
            } else {
                // No route to calculate
                setRouteGeoJSON(null);
                setRouteStats(null);
                if (onRouteCalculated) onRouteCalculated(null);
                return;
            }

            // Fetch estimates for all modes
            const modes = ['driving', 'walking', 'cycling'] as const;
            const requests = modes.map(mode => 
                fetch(`https://api.mapbox.com/directions/v5/mapbox/${mode}/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${MAPBOX_TOKEN}`)
                .then(res => res.json() as Promise<any>)
            );

            const results = await Promise.all(requests);
            const stats: any = {};
            let currentModeData: any = null;

            results.forEach((json, index) => {
                const mode = modes[index];
                if (json.routes && json.routes.length > 0) {
                    const data = json.routes[0];
                    stats[mode] = {
                        duration: data.duration,
                        distance: data.distance
                    };
                    if (mode === transportMode) {
                        currentModeData = data;
                    }
                } else {
                    stats[mode] = { duration: 0, distance: 0 };
                }
            });

            // Pass all stats to parent
            if (onRouteCalculated) {
                onRouteCalculated(stats);
            }

            // Render current mode route
            if (currentModeData) {
                const route = currentModeData.geometry.coordinates;
                const geojson = {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: route
                    }
                };
                
                // Only update if changed prevents some internal re-renders but mainly we rely on parent fix
                setRouteGeoJSON(geojson);
                setRouteStats({
                    duration: currentModeData.duration,
                    distance: currentModeData.distance
                });
            }

            // Fit bounds to show route
            // We want to fit bounds when route changes OR padding changes
            if (mapRef.current) {
                const minLng = Math.min(start[0], end[0]);
                const maxLng = Math.max(start[0], end[0]);
                const minLat = Math.min(start[1], end[1]);
                const maxLat = Math.max(start[1], end[1]);
                
                mapRef.current.fitBounds(
                    [[minLng, minLat], [maxLng, maxLat]],
                    { 
                        padding: padding || { top: 50, bottom: 50, left: 50, right: 50 },
                        maxZoom: 16,
                        duration: 1000 // Smooth animation
                    }
                );
            }

        } catch (error) {
            console.error("Error fetching directions:", error);
        }
    };

    fetchRoute();
  }, [destination, origin, padding, transportMode]);

  const markers = useMemo(() => {
    const list = displayLocations.map((feature: any) => {
      const isOtherProject = feature.properties.categoria?.toLocaleLowerCase('es')
        === OTHER_PROJECTS_CATEGORY.toLocaleLowerCase('es');

      return (
      <Marker
        key={feature.id || feature.properties.nombre}
        longitude={feature.geometry.coordinates[0]}
        latitude={feature.geometry.coordinates[1]}
        anchor="bottom"
        onClick={(e: any) => {
            e.originalEvent.stopPropagation();
            if (onMarkerClick) onMarkerClick(feature.geometry.coordinates, feature.properties.nombre);
        }}
      >
        <div className="relative group cursor-pointer hover:z-50">
            {feature.properties.imagen ? (
                <div className={isOtherProject
                    ? "w-16 h-16 drop-shadow-lg hover:scale-110 transition-transform"
                    : "w-12 h-12 bg-white rounded-full p-2 shadow-md flex items-center justify-center hover:scale-125 transition-transform border border-brand-orange/20"
                }>
                    <img 
                        src={getAssetUrl(feature.properties.imagen)}
                        alt={feature.properties.nombre}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                </div>
            ) : (
                <MapPin size={32} className="text-brand-orange drop-shadow-md hover:scale-125 transition-transform" />
            )}
        </div>
      </Marker>
      );
    });

      // Add Origin Marker if exists
      if (origin) {
          list.push(
              <Marker
                  key="origin-marker"
                  longitude={origin[0]}
                  latitude={origin[1]}
                  anchor="bottom"
              >
                  <div className="flex flex-col items-center z-50">
                      <div className="bg-brand-orange text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg mb-1 whitespace-nowrap">
                          Tu Ubicación
                      </div>
                      <MapPin size={28} className="text-brand-orange drop-shadow-md fill-current" />
                  </div>
              </Marker>
          );
      }

      return list;
  }, [onMarkerClick, origin, displayLocations]);

    const isForcedLandscape = useStore(state => state.isForcedLandscape);

    // Force Resize on Mount and Window Resize (Fix for gray areas)
    useEffect(() => {
        const handleResize = () => {
            if (mapRef.current) {
                mapRef.current.resize();
            }
        };

        // Initial resize after mount (with small delay to ensure container is ready)
        const timer = setTimeout(() => {
            handleResize();
        }, 100);

        // Listen for window resize events (includes orientation change)
        window.addEventListener('resize', handleResize);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Force resize when forced landscape CSS transform is applied/removed.
    // CSS rotate(90deg) doesn't fire a window resize event, so Mapbox
    // would otherwise render at the wrong dimensions.
    useEffect(() => {
        const timer = setTimeout(() => {
            if (mapRef.current) {
                mapRef.current.resize();
            }
        }, 300); // wait for CSS transform to settle
        return () => clearTimeout(timer);
    }, [isForcedLandscape]);

  return (
    <div className="w-full h-full relative">
      <Map
        ref={mapRef}
        initialViewState={INITIAL_VIEW_STATE}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAPBOX_TOKEN ? MAPBOX_STYLE : FALLBACK_MAP_STYLE}
        {...(MAPBOX_TOKEN ? { mapboxAccessToken: MAPBOX_TOKEN } : {})}
        attributionControl={!MAPBOX_TOKEN}
        padding={padding}
        scrollZoom={true}
        dragPan={true}
        dragRotate={true}
        doubleClickZoom={true}
        touchZoomRotate={true}
        touchPitch={true}
      >
        <NavigationControl position="top-right" />
        <FullscreenControl position="top-right" />
        <ScaleControl />

        {/* Route Layer */}
        {routeGeoJSON && (
            <Source id="route" type="geojson" data={routeGeoJSON}>
                <Layer
                    id="route"
                    type="line"
                    source="route"
                    layout={{
                        'line-join': 'round',
                        'line-cap': 'round'
                    }}
                    paint={{
                        'line-color': config.colors.main, // Brand blue (Mar de Java)
                        'line-width': 4,
                        'line-opacity': 0.8
                    }}
                />
            </Source>
        )}

        {markers}

        {/* Hitos — the surroundings that carry their own clip */}
        {(landmarks || []).map(landmark => (
            <Marker
                key={landmark.slug}
                longitude={landmark.coordinates[0]}
                latitude={landmark.coordinates[1]}
                anchor="bottom"
                style={{ zIndex: activeLandmark === landmark.slug ? 10000 : 100 }}
            >
                <LandmarkMarker
                    landmark={landmark}
                    duration={landmarkDurations?.[landmark.slug]}
                    active={activeLandmark === landmark.slug && !openLandmarkSlug}
                    onActiveChange={(slug, active) => setActiveLandmark(prev => active ? slug : (prev === slug ? null : prev))}
                    onSelect={(l) => onMarkerClick?.(l.coordinates, l.name)}
                    onOpen={(slug) => onLandmarkOpen?.(slug)}
                />
            </Marker>
        ))}

        {/* Mar de Java Marker (Main Project) */}
        <Marker longitude={INITIAL_VIEW_STATE.longitude} latitude={INITIAL_VIEW_STATE.latitude} anchor="bottom" style={{ zIndex: 9999 }}>
            <div className="relative flex flex-col items-center group cursor-pointer" style={{ zIndex: 9999 }}>
                 {/* Popup Card - Hover Only */}
                 <div className="absolute bottom-full mb-4 w-48 bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto">
                    <div className="h-24 w-full relative">
                        <img 
                            src={getAssetUrl('building/photos/face_0_daylight.png')} 
                            className="w-full h-full object-cover"
                            alt="Mar de Java"
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-gray-900/80 backdrop-blur-sm rounded text-[8px] font-bold text-white uppercase tracking-wider">
                            Edificio Boutique
                        </div>
                    </div>
                    <div className="p-2">
                        <h3 className="text-xs font-bold text-gray-900 leading-tight mb-0.5">{config.company?.buildingName || 'Residencial Mar de Java'}</h3>
                    </div>
                 </div>

                 {/* The supplied artwork already includes the full map-pin silhouette. */}
                 <div className="relative z-50 w-24 h-24 drop-shadow-xl group-hover:scale-110 transition-transform duration-300">
                    <img
                        src={getAssetUrl(PROJECT_LOCATION.markerImage)}
                        className="w-full h-full object-contain"
                        alt={config.appName}
                    />
                 </div>
            </div>
        </Marker>

        {/* Route Info Popup */}
        {destination && routeStats && (
            <Popup
                longitude={destination[0]}
                latitude={destination[1]}
                anchor="bottom"
                offset={50} // Move it up above the pin
                closeButton={false}
                closeOnClick={false}
                className="z-10"
            >
                <div className="p-2 text-center bg-white rounded-lg shadow-sm">
                    <p className="text-lg font-bold text-gray-900 leading-none">
                        {Math.round(routeStats.duration / 60)} <span className="text-xs font-normal text-gray-500">min</span>
                    </p>
                    <p className="text-xs font-medium text-brand-orange">
                        {(routeStats.distance / 1000).toFixed(1)} km
                    </p>
                </div>
            </Popup>
        )}
      </Map>
    </div>
  );
}
