import { useState } from 'react';
import { Keypoint } from '../types';

interface KeypointTelemetryRadarProps {
  keypoints: Keypoint[];
}

export default function KeypointTelemetryRadar({ keypoints }: KeypointTelemetryRadarProps) {
  const [hoveredPoint, setHoveredPoint] = useState<Keypoint | null>(null);

  // SVG dimensions
  const svgWidth = 600;
  const svgHeight = 340;

  // Dynamically scale coordinates from image space to radar canvas
  const allX = keypoints.flatMap((k) => [k.x, k.refX]);
  const allY = keypoints.flatMap((k) => [k.y, k.refY]);
  const minX = allX.length ? Math.min(...allX) : 0;
  const maxX = allX.length ? Math.max(...allX) : 600;
  const minY = allY.length ? Math.min(...allY) : 0;
  const maxY = allY.length ? Math.max(...allY) : 340;
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);

  const padX = 40;
  const padY = 35;
  const usableW = svgWidth - padX * 2;
  const usableH = svgHeight - padY * 2;

  const sx = (x: number) => padX + ((x - minX) / spanX) * usableW;
  const sy = (y: number) => padY + ((y - minY) / spanY) * usableH;

  return (
    <div className="bg-[#080C12] border border-[#1C2737] rounded-lg p-4 relative shadow-xl flex flex-col justify-between space-y-3">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1A2536] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#3FD0E0] animate-pulse"></div>
          <h3 className="text-[10px] font-mono font-bold text-slate-200 uppercase tracking-wider">
            RANSAC DISPERSION MATRIX ({keypoints.length} TIE-POINTS)
          </h3>
        </div>
        <div className="text-[9px] font-mono text-slate-500">
          SOLVING: <span className="text-[#3FD0E0]">RIFT2-PHASE_CONGRUENCY</span>
        </div>
      </div>

      {/* Radar scatter canvas area */}
      <div className="relative h-72 lg:h-80 w-full bg-[#06090F] rounded-md border border-slate-800 overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full block"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="radarRadial" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3FD0E0" stopOpacity="0.06" />
              <stop offset="60%" stopColor="#101826" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#06090F" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background subtle radar glow */}
          <rect width={svgWidth} height={svgHeight} fill="url(#radarRadial)" />

          {/* Telemetry Coordinate Grid Lines */}
          {[100, 200, 300, 400, 500].map((gx) => (
            <line
              key={`grid-x-${gx}`}
              x1={gx}
              y1={0}
              x2={gx}
              y2={svgHeight}
              stroke="#131C28"
              strokeWidth="0.75"
            />
          ))}
          {[60, 120, 180, 240, 300].map((gy) => (
            <line
              key={`grid-y-${gy}`}
              x1={0}
              y1={gy}
              x2={svgWidth}
              y2={gy}
              stroke="#131C28"
              strokeWidth="0.75"
            />
          ))}

          {/* Radar concentric circular range rings */}
          <circle
            cx={svgWidth / 2}
            cy={svgHeight / 2}
            r={50}
            fill="none"
            stroke="#172435"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
          <circle
            cx={svgWidth / 2}
            cy={svgHeight / 2}
            r={105}
            fill="none"
            stroke="#1B2A3E"
            strokeWidth="1"
          />
          <circle
            cx={svgWidth / 2}
            cy={svgHeight / 2}
            r={160}
            fill="none"
            stroke="#172435"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* Center axis crosshairs */}
          <line
            x1={svgWidth / 2}
            y1={15}
            x2={svgWidth / 2}
            y2={svgHeight - 15}
            stroke="#1B293E"
            strokeWidth="1"
          />
          <line
            x1={20}
            y1={svgHeight / 2}
            x2={svgWidth - 20}
            y2={svgHeight / 2}
            stroke="#1B293E"
            strokeWidth="1"
          />

          {/* Monospace Axis Coordinate Labels */}
          <text x={8} y={20} fill="#4B607E" fontSize="9" fontFamily="monospace">
            0,0
          </text>
          <text x={svgWidth - 45} y={svgHeight - 8} fill="#4B607E" fontSize="9" fontFamily="monospace">
            600,340
          </text>
          <text x={svgWidth / 2 + 5} y={15} fill="#4B607E" fontSize="9" fontFamily="monospace">
            Y-NADIR
          </text>
          <text x={svgWidth - 55} y={svgHeight / 2 - 6} fill="#4B607E" fontSize="9" fontFamily="monospace">
            X-ORBIT
          </text>

          {/* Faint displacement vectors connecting source tie-point to reference position */}
          {keypoints.map((kp) => (
            <line
              key={`vector-${kp.id}`}
              x1={sx(kp.x)}
              y1={sy(kp.y)}
              x2={sx(kp.refX)}
              y2={sy(kp.refY)}
              stroke="rgba(63, 208, 224, 0.45)"
              strokeWidth={hoveredPoint?.id === kp.id ? 2 : 1}
              strokeDasharray={hoveredPoint?.id === kp.id ? undefined : '2 2'}
            />
          ))}

          {/* Keypoints render with sequential staggered animations */}
          {keypoints.map((kp, idx) => {
            const isHovered = hoveredPoint?.id === kp.id;
            const ptX = sx(kp.x);
            const ptY = sy(kp.y);
            const refPtX = sx(kp.refX);
            const refPtY = sy(kp.refY);
            return (
              <g
                key={kp.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint(kp)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {/* Reference point (Cyan outline ring) */}
                <circle
                  cx={refPtX}
                  cy={refPtY}
                  r={isHovered ? 4.5 : 2.75}
                  fill="none"
                  stroke="#3FD0E0"
                  strokeWidth="1.5"
                  opacity={0.85}
                />

                {/* Source point (Amber solid circle) */}
                <circle
                  cx={ptX}
                  cy={ptY}
                  r={isHovered ? 5.5 : 3.5}
                  fill="#FF9F43"
                  className="animate-fadeIn"
                  style={{
                    animationDelay: `${idx * 34}ms`,
                    animationFillMode: 'both'
                  }}
                />

                {/* Concentric radar targeting pulse on hover */}
                {isHovered && (
                  <circle
                    cx={ptX}
                    cy={ptY}
                    r={11}
                    fill="none"
                    stroke="#FF9F43"
                    strokeWidth="1"
                    strokeDasharray="3 2"
                    className="animate-spin"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Dynamic HUD Inspector Overlay */}
        <div className="absolute bottom-2.5 left-2.5 p-2.5 rounded bg-[#090D13]/90 backdrop-blur border border-slate-700/80 text-[11px] font-mono pointer-events-none max-w-sm">
          {hoveredPoint ? (
            <div className="space-y-0.5 animate-fadeIn">
              <div className="text-amber-400 font-bold flex items-center justify-between">
                <span>POINT TELEMETRY: {hoveredPoint.id}</span>
                <span className="text-[10px] text-emerald-400 font-normal">
                  RANSAC INLIER
                </span>
              </div>
              <div className="text-slate-300">
                SOURCE CH-2: [{hoveredPoint.x}, {hoveredPoint.y}] px
              </div>
              <div className="text-cyan-300">
                REF LROC: [{hoveredPoint.refX}, {hoveredPoint.refY}] px
              </div>
              <div className="text-emerald-400">
                RESIDUAL: {hoveredPoint.residual.toFixed(2)} px (&Delta;X={hoveredPoint.dx}px, &Delta;Y={hoveredPoint.dy}px)
              </div>
            </div>
          ) : (
            <div className="text-slate-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>HOVER OVER ANY TIE-POINT TO READ SUB-PIXEL VECTOR TELEMETRY</span>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-3 bg-[#0A0E14]/90 backdrop-blur border border-slate-800 px-3 py-1.5 rounded text-[10px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF9F43]" />
            <span className="text-slate-300">CH-2 OHRC (Source)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-[#3FD0E0]" />
            <span className="text-slate-300">LRO NAC (Reference)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
