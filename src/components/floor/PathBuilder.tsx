import React, { useState, useMemo } from 'react';
import { type Unit } from '@/data/floors';
import { Copy, Check, RotateCcw, Trash2, X, Ruler, Code, Layers, Maximize2 } from 'lucide-react';

interface PathBuilderProps {
  generatedPath: string;
  points: { x: number; y: number }[];
  center: { x: number; y: number };
  units?: Unit[];
  selectedUnitId?: string | null;
  onSelectUnit?: (unitId: string) => void;
  onUndo: () => void;
  onClear: () => void;
  onClose: () => void;
}

const PathBuilder = ({
  generatedPath,
  points,
  center,
  units = [],
  selectedUnitId,
  onSelectUnit,
  onUndo,
  onClear,
  onClose,
}: PathBuilderProps) => {
  const [copiedPath, setCopiedPath] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Calculate perimeter (% units of floor plan)
  const perimeter = useMemo(() => {
    if (points.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
      total += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
    }
    if (points.length > 2) {
      total += Math.hypot(points[0].x - points[points.length - 1].x, points[0].y - points[points.length - 1].y);
    }
    return total;
  }, [points]);

  // Calculate polygon area using Shoelace formula (% of plane)
  const area = useMemo(() => {
    if (points.length < 3) return 0;
    let total = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      total += points[i].x * points[j].y;
      total -= points[j].x * points[i].y;
    }
    return Math.abs(total) / 2;
  }, [points]);

  const activeUnit = useMemo(() => {
    return units.find((u) => u.id === selectedUnitId);
  }, [units, selectedUnitId]);

  // Estimated scale factor in meters per 1% if registered dimensions exist
  const estimatedMetersPerPct = useMemo(() => {
    if (activeUnit?.dimensions && area > 0) {
      return Math.sqrt(activeUnit.dimensions / area);
    }
    return null;
  }, [activeUnit, area]);

  const jsonSnippet = JSON.stringify(
    {
      path: generatedPath,
      x: center.x,
      y: center.y,
      areaPct: Number(area.toFixed(2)),
      perimeterPct: Number(perimeter.toFixed(2)),
    },
    null,
    2
  );

  const handleCopyPath = () => {
    if (!generatedPath) return;
    navigator.clipboard.writeText(generatedPath);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const handleCopyJson = () => {
    if (!generatedPath) return;
    navigator.clipboard.writeText(jsonSnippet);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-84 md:w-96 bg-gray-900/95 text-white backdrop-blur-xl p-5 rounded-2xl shadow-2xl border border-white/20 animate-fade-in font-sans max-h-[88vh] overflow-y-auto">
      {/* Top Title Bar */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
            <Ruler className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
              Medición y Trazado de Planta
            </h3>
            <p className="text-[11px] text-gray-400">
              {points.length} {points.length === 1 ? 'punto marcado' : 'puntos marcados'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          title="Cerrar herramienta"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Unit Selector (if units available) */}
      {units.length > 0 && onSelectUnit && (
        <div className="mb-3">
          <label className="block text-[11px] font-medium text-gray-300 mb-1 flex items-center gap-1">
            <Layers className="w-3 h-3 text-amber-400" />
            Asignar / Comparar con Unidad:
          </label>
          <select
            value={selectedUnitId || ''}
            onChange={(e) => onSelectUnit(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none cursor-pointer"
          >
            <option value="">-- Ninguna unidad seleccionada --</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                Unidad {u.identifier || u.id} ({u.subtitle || 'Dpto'}) {u.dimensions ? `• ${u.dimensions} m²` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Live Measurement Cards */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-gray-800/80 border border-gray-700/60 rounded-xl p-2.5">
          <div className="flex items-center justify-between text-[11px] text-gray-400 mb-0.5">
            <span>Perímetro</span>
            <Ruler className="w-3 h-3 text-amber-400" />
          </div>
          <div className="text-base font-bold font-mono text-white">
            {perimeter.toFixed(1)}%
          </div>
          {estimatedMetersPerPct && (
            <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
              ≈ {(perimeter * estimatedMetersPerPct).toFixed(1)} m
            </div>
          )}
        </div>

        <div className="bg-gray-800/80 border border-gray-700/60 rounded-xl p-2.5">
          <div className="flex items-center justify-between text-[11px] text-gray-400 mb-0.5">
            <span>Área del Polígono</span>
            <Maximize2 className="w-3 h-3 text-amber-400" />
          </div>
          <div className="text-base font-bold font-mono text-white">
            {area.toFixed(2)}%
          </div>
          {activeUnit?.dimensions ? (
            <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
              Ref: {activeUnit.dimensions} m²
            </div>
          ) : (
            <div className="text-[10px] text-gray-500 mt-0.5">
              {points.length >= 3 ? 'Polígono cerrado' : 'Traza min. 3 puntos'}
            </div>
          )}
        </div>
      </div>

      {/* Generated SVG Path Area */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-gray-300 flex items-center gap-1">
            <Code className="w-3 h-3 text-amber-400" />
            Coordenadas SVG (<code className="text-amber-300">d="..."</code>):
          </label>
          <button
            onClick={handleCopyPath}
            disabled={!generatedPath}
            className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {copiedPath ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copiar Path</span>
              </>
            )}
          </button>
        </div>
        <textarea
          readOnly
          value={generatedPath || 'Haz clic en la imagen del plano para marcar los vértices...'}
          className="w-full h-14 bg-gray-950/80 border border-gray-800 text-gray-200 p-2 rounded-lg font-mono text-[11px] leading-relaxed break-all select-all focus:outline-none focus:border-amber-500/50 resize-none"
          onClick={(e) => e.currentTarget.select()}
        />
      </div>

      {/* Centroid & JSON Snippet */}
      <div className="space-y-1 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-400">
            Centro: <strong className="text-white font-mono">x: {center.x}%, y: {center.y}%</strong>
          </span>
          <button
            onClick={handleCopyJson}
            disabled={!generatedPath}
            className="text-[11px] text-gray-300 hover:text-white flex items-center gap-1 font-medium disabled:opacity-40 cursor-pointer"
          >
            {copiedJson ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">¡JSON Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copiar JSON</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onUndo}
          disabled={points.length === 0}
          className="flex-1 py-1.5 px-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-gray-200 text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Deshacer punto</span>
        </button>

        <button
          onClick={onClear}
          disabled={points.length === 0}
          className="flex-1 py-1.5 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-medium flex items-center justify-center gap-1 border border-rose-500/30 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Reiniciar</span>
        </button>
      </div>

      {/* Helper instructions */}
      <p className="mt-3 text-[10px] text-gray-400 text-center leading-normal">
        💡 Haz clic en los vértices del plano para trazar y medir las paredes. El perímetro y área se calculan en tiempo real.
      </p>
    </div>
  );
};

export default PathBuilder;
