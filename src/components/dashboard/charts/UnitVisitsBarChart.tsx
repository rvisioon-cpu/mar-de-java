import React, { useState } from 'react';

interface UnitVisitsBarChartProps {
  labels: string[];
  data: number[];
  selectedIdx: number | null;
  onSelectIdx: (idx: number | null) => void;
  height?: number;
}

export default function UnitVisitsBarChart({
  labels,
  data,
  selectedIdx,
  onSelectIdx,
  height = 220
}: UnitVisitsBarChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 45; // larger padding for slanted labels
  
  // Dynamic width based on units count (90px per bar, min 600px)
  const width = Math.max(600, labels.length * 85);
  const viewHeight = height;

  const graphWidth = width - paddingLeft - paddingRight;
  const graphHeight = viewHeight - paddingTop - paddingBottom;

  const maxVal = Math.max(...data, 5);
  const colWidth = graphWidth / labels.length;
  const barWidth = Math.min(32, Math.max(12, colWidth * 0.45));

  const getBarX = (idx: number) => paddingLeft + (idx + 0.5) * colWidth;

  return (
    <div className="w-full flex flex-col bg-base-100 border border-base-200 p-6 rounded-2xl shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <span className="text-sm font-semibold tracking-wider text-slate-700">Páginas Vistas por Unidad</span>
          <p className="text-[10px] text-gray-500 mt-0.5">Haz clic en una barra para ver su historial de páginas vistas y tiempo en detalle.</p>
        </div>
        {selectedIdx !== null && (
          <button 
            onClick={() => onSelectIdx(null)}
            className="btn btn-xs bg-brand-orange/10 hover:bg-brand-orange/20 text-brand-orange border-none text-[10px] rounded-md px-2"
          >
            Limpiar selección
          </button>
        )}
      </div>

      <div className="w-full overflow-x-auto scrollbar-thin">
        <div className="relative" style={{ width: `${width}px`, height: `${viewHeight}px` }}>
          <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${viewHeight}`} preserveAspectRatio="none">
            <defs>
              {/* Horizontal linear gradient that spans across the entire graph width */}
              <linearGradient id="barHorizontalGradient" x1={paddingLeft} y1="0" x2={width - paddingRight} y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#2dd4bf" />      {/* teal */}
                <stop offset="33%" stopColor="#3b82f6" />     {/* blue */}
                <stop offset="66%" stopColor="#8b5cf6" />     {/* purple */}
                <stop offset="100%" stopColor="#ec4899" />    {/* pink */}
              </linearGradient>

              {/* Glowing filter */}
              <filter id="barGlow" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => {
              const y = paddingTop + r * graphHeight;
              const gridVal = Math.round(maxVal * (1 - r));
              return (
                <g key={idx}>
                  <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="rgba(0, 0, 0, 0.05)" />
                  <text x={paddingLeft - 8} y={y + 4} textAnchor="end" className="fill-slate-400 text-[10px] font-mono">
                    {gridVal}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {labels.map((_, idx) => {
              const x = getBarX(idx);
              const val = data[idx] || 0;
              const barHeight = (val / maxVal) * graphHeight;
              const y = paddingTop + graphHeight - barHeight;
              const rX = x - barWidth / 2;

              const isSelected = selectedIdx === idx;
              const isHovered = hoveredIdx === idx;
              const isAnySelected = selectedIdx !== null;

              // Opacity rules: full color if selected or hovered, else dim if another is selected
              const opacity = isAnySelected ? (isSelected ? 1.0 : 0.25) : 1.0;
              const strokeColor = isSelected ? '#ff6b00' : (isHovered ? 'rgba(0, 0, 0, 0.15)' : 'transparent');
              const strokeWidth = isSelected ? 2.5 : 1;

              return (
                <g
                  key={idx}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => onSelectIdx(isSelected ? null : idx)}
                  className="cursor-pointer"
                >
                  {/* Background column hover state */}
                  {isHovered && (
                    <rect
                      x={x - colWidth / 2}
                      y={paddingTop}
                      width={colWidth}
                      height={graphHeight}
                      fill="rgba(0, 0, 0, 0.015)"
                      rx="4"
                    />
                  )}

                  {/* SVG Bar with rounded corners at the top */}
                  {val > 0 && (
                    <rect
                      x={rX}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      fill="url(#barHorizontalGradient)"
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      opacity={opacity}
                      rx="8" // rounded corners
                      filter={isHovered || isSelected ? "url(#barGlow)" : undefined}
                      className="transition-all duration-300 ease-out"
                    />
                  )}

                  {/* Hidden full column click trigger */}
                  <rect
                    x={x - colWidth / 2}
                    y={paddingTop}
                    width={colWidth}
                    height={graphHeight}
                    fill="transparent"
                  />
                </g>
              );
            })}

            {/* X Axis Labels (Slanted for units to avoid overlapping) */}
            {labels.map((lbl, idx) => {
              const x = getBarX(idx);
              const y = viewHeight - 28;
              const isSelected = selectedIdx === idx;

              return (
                <text
                  key={idx}
                  x={x}
                  y={y}
                  textAnchor="end"
                  transform={`rotate(-28, ${x}, ${y})`}
                  className={`${
                    isSelected ? "fill-brand-orange font-bold text-[10px]" : "fill-slate-500 text-[9px]"
                  } font-mono cursor-pointer`}
                  onClick={() => onSelectIdx(isSelected ? null : idx)}
                >
                  {lbl.length > 18 ? `${lbl.slice(0, 15)}...` : lbl}
                </text>
              );
            })}
          </svg>

          {/* Simple Tooltip on Hover */}
          {hoveredIdx !== null && (
            <div
              className="absolute bg-base-100 border border-base-300 text-slate-800 p-2.5 rounded-lg text-xs shadow-xl z-50 pointer-events-none"
              style={{
                left: `${Math.min(getBarX(hoveredIdx) + 15, width - 150)}px`,
                top: `${paddingTop}px`,
              }}
            >
              <div className="font-bold text-slate-700 border-b border-base-200 pb-1 mb-1">{labels[hoveredIdx]}</div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Páginas vistas:</span>
                <span className="font-bold font-mono text-cyan-600">{data[hoveredIdx]?.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
