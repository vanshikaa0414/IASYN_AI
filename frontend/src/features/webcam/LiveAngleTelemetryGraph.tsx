import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Activity, Target, Zap, ShieldCheck } from 'lucide-react';

interface LiveAngleTelemetryGraphProps {
  currentAngle: number;
  isTracking: boolean;
  activePhase?: string;
  rom?: number;
  maxAngle?: number;
  minAngle?: number;
  targetExtension?: number;
  flexionThreshold?: number;
}

interface Point {
  time: number;
  angle: number;
}

export const LiveAngleTelemetryGraph: React.FC<LiveAngleTelemetryGraphProps> = ({
  currentAngle,
  isTracking,
  activePhase = 'WAITING',
  rom = 0,
  maxAngle = 0,
  minAngle = 0,
  targetExtension = 168,
  flexionThreshold = 115,
}) => {
  const historyRef = useRef<Point[]>([]);
  const [history, setHistory] = useState<Point[]>([]);
  const lastUpdateTimeRef = useRef<number>(0);

  // Update buffer without lag or thrashing
  useEffect(() => {
    if (!isTracking || currentAngle <= 0) return;

    const now = performance.now();
    // Throttle data capture to ~20 Hz for ultra-smooth graph drawing
    if (now - lastUpdateTimeRef.current < 50) return;
    lastUpdateTimeRef.current = now;

    const newPoint: Point = { time: now, angle: currentAngle };
    const maxPoints = 50;

    historyRef.current.push(newPoint);
    if (historyRef.current.length > maxPoints) {
      historyRef.current.shift();
    }

    setHistory([...historyRef.current]);
  }, [currentAngle, isTracking]);

  // Graph dimensions
  const width = 600;
  const height = 160;
  const padding = { top: 20, right: 30, bottom: 25, left: 45 };

  // Y-axis range: 60° to 190°
  const minY = 60;
  const maxY = 190;

  const getY = (angle: number) => {
    const clamped = Math.max(minY, Math.min(maxY, angle));
    return padding.top + ((maxY - clamped) / (maxY - minY)) * (height - padding.top - padding.bottom);
  };

  const getX = (index: number, total: number) => {
    if (total <= 1) return padding.left;
    return padding.left + (index / (total - 1)) * (width - padding.left - padding.right);
  };

  // Generate SVG path points
  const { pathData, areaData, currentPointCoord } = useMemo(() => {
    if (history.length === 0) {
      return { pathData: '', areaData: '', currentPointCoord: null };
    }

    const points = history.map((pt, idx) => ({
      x: getX(idx, history.length),
      y: getY(pt.angle),
    }));

    // Build SVG path
    const path = points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');

    // Build area fill path
    const bottomY = height - padding.bottom;
    const area = points.length > 0
      ? `${path} L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`
      : '';

    const lastCoord = points[points.length - 1] || null;

    return { pathData: path, areaData: area, currentPointCoord: lastCoord };
  }, [history]);

  const targetY = getY(targetExtension);
  const flexionY = getY(flexionThreshold);

  return (
    <div className="glass-card p-4 sm:p-5 space-y-3">
      {/* Header telemetry info */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#A78BFA]/15 border border-[#A78BFA]/30 flex items-center justify-center text-[#A78BFA]">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>Real-Time Knee Kinematics Telemetry</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#7DE8F0] animate-ping" />
            </h4>
            <p className="text-[10px] text-[#85879C]">Continuous sagittal extension tracking &amp; threshold compliance</p>
          </div>
        </div>

        {/* Phase and Live readout badges */}
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-full bg-[#171925] border border-white/10 text-[10px] font-mono text-[#B7B8C8] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
            <span>Phase: <strong className="text-white capitalize">{activePhase.toLowerCase().replace('_', ' ')}</strong></span>
          </div>

          <div className="px-3 py-1 rounded-full bg-[#A78BFA]/15 border border-[#A78BFA]/30 text-[11px] font-bold text-[#A78BFA] font-mono">
            {isTracking ? `${currentAngle.toFixed(1)}°` : 'Standby'}
          </div>
        </div>
      </div>

      {/* SVG Waveform Chart with Glass styling */}
      <div className="relative w-full overflow-hidden rounded-xl bg-[#0B0D16]/80 border border-white/5">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-36 sm:h-44 block select-none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="telemetryAreaGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.32" />
              <stop offset="60%" stopColor="#7DE8F0" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#7DE8F0" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="telemetryStrokeGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7DE8F0" />
              <stop offset="60%" stopColor="#A78BFA" />
              <stop offset="100%" stopColor="#7C6CF5" />
            </linearGradient>

            <filter id="telemetryGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid lines */}
          <line
            x1={padding.left}
            y1={getY(180)}
            x2={width - padding.right}
            y2={getY(180)}
            stroke="rgba(255, 255, 255, 0.05)"
            strokeDasharray="3 3"
          />
          <line
            x1={padding.left}
            y1={getY(140)}
            x2={width - padding.right}
            y2={getY(140)}
            stroke="rgba(255, 255, 255, 0.05)"
            strokeDasharray="3 3"
          />
          <line
            x1={padding.left}
            y1={getY(100)}
            x2={width - padding.right}
            y2={getY(100)}
            stroke="rgba(255, 255, 255, 0.05)"
            strokeDasharray="3 3"
          />

          {/* Target Extension Reference Line (≥ 168°) */}
          <line
            x1={padding.left}
            y1={targetY}
            x2={width - padding.right}
            y2={targetY}
            stroke="#34D399"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.85"
          />
          <text
            x={width - padding.right - 5}
            y={targetY - 5}
            fill="#34D399"
            fontSize="9"
            fontWeight="bold"
            textAnchor="end"
          >
            Target Extension (≥ {targetExtension}°)
          </text>

          {/* Seated Return Flexion Reference Line (≤ 115°) */}
          <line
            x1={padding.left}
            y1={flexionY}
            x2={width - padding.right}
            y2={flexionY}
            stroke="#FBBF24"
            strokeWidth="1.2"
            strokeDasharray="4 4"
            opacity="0.7"
          />
          <text
            x={width - padding.right - 5}
            y={flexionY + 11}
            fill="#FBBF24"
            fontSize="9"
            fontWeight="bold"
            textAnchor="end"
          >
            Resting Return (≤ {flexionThreshold}°)
          </text>

          {/* Area fill under curve */}
          {areaData && (
            <path d={areaData} fill="url(#telemetryAreaGlow)" />
          )}

          {/* Waveform curve */}
          {pathData && (
            <path
              d={pathData}
              fill="none"
              stroke="url(#telemetryStrokeGradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#telemetryGlow)"
            />
          )}

          {/* Active head point with pulsing beacon */}
          {currentPointCoord && isTracking && (
            <g>
              <circle
                cx={currentPointCoord.x}
                cy={currentPointCoord.y}
                r="7"
                fill="#7DE8F0"
                opacity="0.3"
                className="animate-ping"
              />
              <circle
                cx={currentPointCoord.x}
                cy={currentPointCoord.y}
                r="4"
                fill="#7DE8F0"
                stroke="#050509"
                strokeWidth="1.5"
                filter="drop-shadow(0 0 6px #7DE8F0)"
              />
            </g>
          )}

          {/* Y-axis Labels */}
          <text x={padding.left - 8} y={getY(180) + 3} fill="#85879C" fontSize="9" textAnchor="end" fontFamily="monospace">
            180°
          </text>
          <text x={padding.left - 8} y={getY(140) + 3} fill="#85879C" fontSize="9" textAnchor="end" fontFamily="monospace">
            140°
          </text>
          <text x={padding.left - 8} y={getY(100) + 3} fill="#85879C" fontSize="9" textAnchor="end" fontFamily="monospace">
            100°
          </text>
          <text x={padding.left - 8} y={getY(60) + 3} fill="#85879C" fontSize="9" textAnchor="end" fontFamily="monospace">
            60°
          </text>
        </svg>

        {/* Empty state overlay when not tracking */}
        {(!isTracking || history.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#050509]/60 backdrop-blur-xs text-xs text-[#85879C] gap-2">
            <Zap className="w-4 h-4 text-[#A78BFA]" />
            <span>Position within webcam frame to view real-time angle trajectory</span>
          </div>
        )}
      </div>

      {/* Telemetry Summary Badges Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
        <div className="glass-panel p-2">
          <span className="text-[10px] text-[#85879C] block uppercase font-bold tracking-wider">Active Angle</span>
          <span className="font-mono font-bold text-white text-sm">
            {isTracking ? `${currentAngle.toFixed(1)}°` : '—'}
          </span>
        </div>
        <div className="glass-panel p-2">
          <span className="text-[10px] text-[#85879C] block uppercase font-bold tracking-wider">Max Extension</span>
          <span className="font-mono font-bold text-[#34D399] text-sm">
            {maxAngle > 0 ? `${maxAngle.toFixed(1)}°` : '—'}
          </span>
        </div>
        <div className="glass-panel p-2">
          <span className="text-[10px] text-[#85879C] block uppercase font-bold tracking-wider">Excursion (ROM)</span>
          <span className="font-mono font-bold text-[#A78BFA] text-sm">
            {rom > 0 ? `${rom.toFixed(1)}°` : '—'}
          </span>
        </div>
        <div className="glass-panel p-2">
          <span className="text-[10px] text-[#85879C] block uppercase font-bold tracking-wider">Criteria Status</span>
          <span className={`text-[11px] font-bold ${currentAngle >= targetExtension ? 'text-[#34D399]' : 'text-[#85879C]'}`}>
            {currentAngle >= targetExtension ? '✓ Target Reached' : `${Math.max(0, Math.round(targetExtension - currentAngle))}° to target`}
          </span>
        </div>
      </div>
    </div>
  );
};
