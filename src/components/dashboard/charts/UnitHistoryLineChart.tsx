import React, { useState } from 'react';

interface UnitHistoryLineChartProps {
  labels: string[];
  viewsData: number[];
  durationData: number[];
  unitName: string;
  height?: number;
}

export default function UnitHistoryLineChart({
  labels,
  viewsData,
  durationData,
  unitName,
  height = 200
}: UnitHistoryLineChartProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const paddingLeft = 45;
  const paddingRight = 45; // right padding for dual-axis labels
  const paddingTop = 20;
  const paddingBottom = 30;
  const width = 600;
  const viewHeight = height;

  const graphWidth = width - paddingLeft - paddingRight;
  const graphHeight = viewHeight - paddingTop - paddingBottom;

  const maxViews = Math.max(...viewsData, 5);
  const maxDuration = Math.max(...durationData, 10);

  const getCoordinates = (val: number, max: number, idx: number, total: number) => {
    const x = paddingLeft + (idx / (total - 1 || 1)) * graphWidth;
    const y = paddingTop + graphHeight - (val / max) * graphHeight;
    return { x, y };
  };

  const linePath = (data: number[], max: number) => {
    if (data.length === 0) return '';
    const points = data.map((val, idx) => getCoordinates(val, max, idx, data.length));
    
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cpX1 = curr.x + (next.x - curr.x) / 3;
      const cpY1 = curr.y;
      const cpX2 = curr.x + 2 * (next.x - curr.x) / 3;
      const cpY2 = next.y;
      path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
    }
    return path;
  };

  const formatSecs = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="w-full flex flex-col bg-base-100 border border-base-200 p-6 rounded-2xl shadow-sm relative overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-wider text-slate-700">Flujo Histórico de la Unidad</span>
          <span className="text-xs text-brand-orange font-medium mt-0.5">{unitName}</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-medium font-secondary">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
            <span className="text-slate-500">Páginas vistas (Eje Izq.)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-500">Retención (Eje Der.)</span>
          </div>
        </div>
      </div>

      <div className="relative w-full" style={{ height: `${viewHeight}px` }}>
        <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${viewHeight}`} preserveAspectRatio="none">
          <defs>
            <filter id="glowLine" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => {
            const y = paddingTop + r * graphHeight;
            const gridViews = Math.round(maxViews * (1 - r));
            const gridSecs = Math.round(maxDuration * (1 - r));
            
            return (
              <g key={idx}>
                {/* Grid line */}
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="rgba(0, 0, 0, 0.05)" strokeDasharray="3 3" />
                
                {/* Left labels (Views) */}
                <text x={paddingLeft - 8} y={y + 4} textAnchor="end" className="fill-slate-400 text-[9px] font-mono font-medium">
                  {gridViews}
                </text>
                
                {/* Right labels (Duration) */}
                <text x={width - paddingRight + 8} y={y + 4} textAnchor="start" className="fill-slate-400 text-[9px] font-mono font-medium">
                  {gridSecs}s
                </text>
              </g>
            );
          })}

          {/* Views Curve (Violet) */}
          <path
            d={linePath(viewsData, maxViews)}
            fill="transparent"
            stroke="#8b5cf6"
            strokeWidth="2.5"
            filter="url(#glowLine)"
            className="transition-all duration-700 ease-out"
          />

          {/* Duration Curve (Amber) */}
          <path
            d={linePath(durationData, maxDuration)}
            fill="transparent"
            stroke="#f59e0b"
            strokeWidth="2.5"
            filter="url(#glowLine)"
            className="transition-all duration-700 ease-out"
          />

          {/* X Axis Labels */}
          {labels.map((lbl, idx) => {
            const x = paddingLeft + (idx / (labels.length - 1 || 1)) * graphWidth;
            return (
              <text key={idx} x={x} y={viewHeight - 8} textAnchor="middle" className="fill-slate-400 text-[9px] font-mono">
                {lbl}
              </text>
            );
          })}

          {/* Interactive triggers */}
          {labels.map((_, idx) => {
            const x = paddingLeft + (idx / (labels.length - 1 || 1)) * graphWidth;
            return (
              <g key={idx} onMouseEnter={() => setActiveIdx(idx)} onMouseLeave={() => setActiveIdx(null)} className="cursor-pointer">
                {activeIdx === idx && (
                  <line x1={x} y1={paddingTop} x2={x} y2={paddingTop + graphHeight} stroke="rgba(0, 0, 0, 0.1)" strokeWidth="1" strokeDasharray="3 3" />
                )}
                <rect
                  x={x - (graphWidth / (labels.length - 1 || 1)) / 2}
                  y={paddingTop}
                  width={graphWidth / (labels.length - 1 || 1)}
                  height={graphHeight}
                  fill="transparent"
                />
                
                {/* Dots on hover */}
                {activeIdx === idx && (
                  <>
                    <circle
                      cx={getCoordinates(viewsData[idx], maxViews, idx, labels.length).x}
                      cy={getCoordinates(viewsData[idx], maxViews, idx, labels.length).y}
                      r="4.5"
                      fill="#8b5cf6"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={getCoordinates(durationData[idx], maxDuration, idx, labels.length).x}
                      cy={getCoordinates(durationData[idx], maxDuration, idx, labels.length).y}
                      r="4.5"
                      fill="#f59e0b"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* Dual Axis Tooltip overlay */}
        {activeIdx !== null && (
          <div
            className="absolute bg-base-100 border border-base-300 text-slate-800 p-2.5 rounded-lg text-xs shadow-xl flex flex-col gap-1 z-50 pointer-events-none"
            style={{
              left: `${Math.min(paddingLeft + (activeIdx / (labels.length - 1 || 1)) * graphWidth + 15, width - 150)}px`,
              top: `${paddingTop}px`,
            }}
          >
            <div className="font-bold text-slate-700 border-b border-base-200 pb-1 mb-1 font-mono">
              {labels[activeIdx]}
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                Páginas vistas:
              </span>
              <span className="font-bold font-mono text-violet-600">{viewsData[activeIdx]}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Permanencia:
              </span>
              <span className="font-bold font-mono text-amber-600">{formatSecs(durationData[activeIdx])}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
