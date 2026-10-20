"use client";
import { useState, useRef, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { type Unit } from '@/data/floors';
import FloorSelector from '@/components/layout/FloorSelector';
import Sidebar from '@/components/layout/Sidebar';
import ConsultationModal from '@/components/UI/modals/ConsultationModal';
import UnitPopover from '@/components/floor/UnitPopover';
import UnitCard from '@/components/floor/UnitCard';
import MobileFloorNav from '@/components/floor/MobileFloorNav';
import FullScreenToggle from '@/components/UI/FullScreenToggle';
import { preloadImages } from '@/utils/preload';
import { useStore } from '@/store/useStore';
import { getAssetUrl } from '@/utils/assets';

const FloorContent = () => {
  const params = useParams();
  const floorId = params.floorId as string;
  const router = useRouter();

  const floorsData = useStore((state) => state.floorsData);
  const isForcedLandscape = useStore((state) => state.isForcedLandscape);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  // Consultation Modal State
  const [isConsultationOpen, setIsConsultationOpen] = useState(false);
  const [consultationUnitId, setConsultationUnitId] = useState<string>('');
  const [consultationUnitIdentifier, setConsultationUnitIdentifier] = useState<string>('');

  // Map & Zoom State
  const MIN_SCALE = 1.0;
  const [scale, setScale] = useState(1.1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const floor = floorsData.find((f) => f.id === floorId);

  useEffect(() => {
    setScale(MIN_SCALE);
    setPosition({ x: 0, y: 0 });
    setSelectedUnit(null);

    if (floor) {
      const loadFloorAssets = async () => {
        useStore.setState({ isLoadingAssets: true });
        try {
          await preloadImages([getAssetUrl(floor.floorPlanImage)]);
        } catch (e) {
          console.warn('Floor mount preload failed', e);
        }
        useStore.setState({ isLoadingAssets: false });

        const currentIndex = floorsData.findIndex((f) => f.id === floor.id);
        if (currentIndex !== -1) {
          const neighbors = [];
          if (currentIndex > 0) neighbors.push(getAssetUrl(floorsData[currentIndex - 1].floorPlanImage));
          if (currentIndex < floorsData.length - 1) neighbors.push(getAssetUrl(floorsData[currentIndex + 1].floorPlanImage));

          if (neighbors.length > 0) {
            preloadImages(neighbors).catch(() => {});
          }
        }
      };
      loadFloorAssets();
    }
  }, [floorId, floor, floorsData]);

  // --- Wheel & Drag Handlers ---
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleSensitivity = 0.001;
    const newScale = Math.min(Math.max(MIN_SCALE, scale - e.deltaY * scaleSensitivity), 6);
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // --- Touch Events ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setLastTouchDistance(dist);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    } else if (e.touches.length === 2 && lastTouchDistance) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );

      const delta = dist - lastTouchDistance;
      const zoomSpeed = 0.005;
      const newScale = Math.min(Math.max(MIN_SCALE, scale + delta * zoomSpeed), 6);

      setScale(newScale);
      setLastTouchDistance(dist);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setLastTouchDistance(null);
  };

  const getPolyCenter = (path: string | undefined, defaultX: number = 50, defaultY: number = 50) => {
    if (!path) return { x: defaultX, y: defaultY };
    const matches = path.matchAll(/([0-9.]+)[, ]\s*([0-9.]+)/g);
    let coords = Array.from(matches).map((m) => ({ x: parseFloat(m[1]), y: parseFloat(m[2]) }));

    if (coords.length === 0) return { x: defaultX, y: defaultY };

    const total = coords.reduce((acc, curr) => ({ x: acc.x + curr.x, y: acc.y + curr.y }), { x: 0, y: 0 });
    return {
      x: total.x / coords.length,
      y: total.y / coords.length,
    };
  };

  const handleUnitEnter = (unit: Unit) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setSelectedUnit(unit);
  };

  const handleUnitLeave = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1280) return;

    hoverTimeoutRef.current = setTimeout(() => {
      if (!isConsultationOpen) {
        setSelectedUnit(null);
      }
    }, 150);
  };

  const handleOpenConsultation = (e: React.MouseEvent, unitId: string, unitIdentifier?: string) => {
    e.stopPropagation();
    setConsultationUnitId(unitId);
    setConsultationUnitIdentifier(unitIdentifier || '');
    setIsConsultationOpen(true);
  };

  const getUnitCenter = (unit: Unit) => {
    return getPolyCenter(unit.path, unit.x, unit.y);
  };

  if (!floor)
    return <div className="h-screen bg-gray-900 text-white flex items-center justify-center">Floor not found</div>;

  return (
    <div className="h-full w-full bg-[#EBEBEB] relative overflow-hidden font-sans select-none">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Menu Button */}
      <div className="fixed top-6 left-6 z-50 group">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-white bg-brand-primary/80 hover:bg-brand-primary backdrop-blur-xl border border-white/20 rounded-full transition-all hover:scale-105 cursor-pointer shadow-lg"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>
        <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/80 backdrop-blur-md text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-secondary tracking-wider uppercase">
          Menú
        </span>
      </div>

      {/* Floor Badge */}
      <div className="fixed top-20 left-6 z-40 flex items-center gap-2">
        <div className="bg-gray-800 text-white px-4 py-2 rounded-md shadow-md text-sm font-medium uppercase tracking-wider whitespace-nowrap border border-white/10">
          <span>Planta {floor.name.replace(/Piso\s+/gi, '')}</span>
        </div>
      </div>

      <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
        <FullScreenToggle />
      </div>

      <FloorSelector />

      {/* Mobile Navigation */}
      {floorId && <MobileFloorNav currentFloorId={floorId} />}

      {/* Main Floor Plan Zoomable Area */}
      <div
        className="absolute inset-0 flex items-center justify-center cursor-default"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="relative transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            width: isForcedLandscape
              ? 'max(100vh, calc(100vw * 16 / 9))'
              : 'max(100vw, calc(100vh * 16 / 9))',
            height: isForcedLandscape
              ? 'max(100vw, calc(100vh * 9 / 16))'
              : 'max(100vh, calc(100vw * 9 / 16))',
          }}
        >
          <img
            src={getAssetUrl(floor.floorPlanImage)}
            alt={floor.name}
            className={`w-full h-full drop-shadow-2xl transition-all duration-300 contrast-[1.02] brightness-[1.02] ${
              isForcedLandscape ? 'object-contain' : 'object-cover'
            }`}
            draggable={false}
          />

          {/* Unit Polygons Overlay */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 5 }}
          >
            {floor.units.map((unit) => {
              if (!unit.path) return null;
              const isSelected = selectedUnit?.id === unit.id;

              return (
                <path
                  key={`path-${unit.id}`}
                  d={unit.path}
                  className={`
                    transition-all duration-300 cursor-pointer pointer-events-auto
                    ${isSelected ? 'fill-brand-primary/70' : 'fill-transparent hover:fill-brand-primary/20'}
                  `}
                  onMouseEnter={() => handleUnitEnter(unit)}
                  onMouseLeave={handleUnitLeave}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedUnit(unit);
                  }}
                />
              );
            })}
          </svg>

          {/* Unit Pin Badges */}
          {floor.units.map((unit) => {
            const center = getUnitCenter(unit);
            const isSelected = selectedUnit?.id === unit.id;

            const statusColor =
              unit.status === 'available'
                ? 'bg-green-500'
                : unit.status === 'reserved'
                ? 'bg-amber-400'
                : 'bg-red-400';

            return (
              <div
                key={unit.id}
                className={`absolute group transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 z-10
                ${isSelected ? 'scale-125 z-20' : 'hover:scale-110'}`}
                style={{ left: `${center.x}%`, top: `${center.y}%` }}
                onMouseEnter={() => handleUnitEnter(unit)}
                onMouseLeave={handleUnitLeave}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedUnit(unit);
                }}
              >
                <div
                  className={`cursor-pointer flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-lg border border-gray-100 transition-colors
                ${isSelected ? 'ring-2 ring-gray-900 border-transparent' : 'hover:border-gray-300'}
              `}
                >
                  {unit.subtitle !== 'Terraza' && <div className={`w-2.5 h-2.5 rounded-full ${statusColor}`} />}
                  <span className="text-xs font-bold text-gray-800">{unit.identifier || unit.id}</span>
                </div>

                {isSelected && (
                  <UnitPopover
                    unit={unit}
                    floorId={floor.id}
                    scale={scale}
                    onMouseEnter={handleUnitEnter}
                    onMouseLeave={handleUnitLeave}
                    onOpenConsultation={handleOpenConsultation}
                    onNavigate={(path) => router.push(path)}
                    openDirection={getUnitCenter(unit).y < 35 ? 'down' : 'up'}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <ConsultationModal
        isOpen={isConsultationOpen}
        onClose={() => setIsConsultationOpen(false)}
        unitId={consultationUnitId}
        unitIdentifier={consultationUnitIdentifier}
      />

      {/* Mobile Unit Modal */}
      {selectedUnit && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm xl:hidden animate-fade-in"
          onClick={() => setSelectedUnit(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl overflow-hidden shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <UnitCard
              unit={selectedUnit}
              floorId={floorId || ''}
              onOpenConsultation={handleOpenConsultation}
              onNavigate={(path) => router.push(path)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default function FloorPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-white">Cargando planta...</div>}>
      <FloorContent />
    </Suspense>
  );
}
