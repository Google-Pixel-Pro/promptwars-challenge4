'use client';

import type { Zone, ZoneRisk, RiskLevel } from '@/types';

// Kept in sync with tailwind.config.ts `colors.risk.*` -- SVG fill attributes
// cannot reference Tailwind classes directly, so the hex values are mirrored
// here deliberately rather than computed at runtime.
const RISK_COLORS: Record<RiskLevel, string> = {
  nominal: '#3FA34D',
  elevated: '#E8A33D',
  high: '#E8722D',
  critical: '#E14B4B',
};

const CENTER = { x: 200, y: 150 };

// Lower bowl (inner ring) and upper deck (outer ring) quadrant angles, in
// degrees, 0 = top, increasing clockwise. Each lower gate has a matching
// upper gate directly outside it, mirroring how upper-deck sections
// typically sit above their corresponding lower-bowl gate.
const QUADRANTS: Record<'A' | 'B' | 'C' | 'D', [number, number]> = {
  A: [-45, 45],
  B: [45, 135],
  C: [135, 225],
  D: [225, 315],
};

const GATE_TO_QUADRANT: Record<string, keyof typeof QUADRANTS> = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  E: 'A',
  F: 'B',
  G: 'C',
  H: 'D',
};

function polarPoint(rx: number, ry: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTER.x + rx * Math.sin(rad), y: CENTER.y - ry * Math.cos(rad) };
}

function ringSegmentPath(
  rxInner: number,
  ryInner: number,
  rxOuter: number,
  ryOuter: number,
  startDeg: number,
  endDeg: number
): string {
  const outerStart = polarPoint(rxOuter, ryOuter, startDeg);
  const outerEnd = polarPoint(rxOuter, ryOuter, endDeg);
  const innerEnd = polarPoint(rxInner, ryInner, endDeg);
  const innerStart = polarPoint(rxInner, ryInner, startDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${rxOuter} ${ryOuter} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${rxInner} ${ryInner} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

interface ZoneGridProps {
  zones: Zone[];
  zoneRisks: ZoneRisk[];
  selectedZoneId?: string;
  onSelectZone?: (zoneId: string) => void;
}

export function ZoneGrid({ zones, zoneRisks, selectedZoneId, onSelectZone }: ZoneGridProps) {
  const riskByZone = new Map(zoneRisks.map((risk) => [risk.zoneId, risk]));

  return (
    <div>
      <svg
        viewBox="0 0 400 300"
        role="img"
        aria-label="Stadium zone map showing live risk level per gate"
        className="w-full"
      >
        {/* Pitch */}
        <rect x={150} y={115} width={100} height={70} rx={14} fill="#173B22" stroke="#3FA34D" strokeWidth={1.5} />
        <line x1={200} y1={115} x2={200} y2={185} stroke="#3FA34D" strokeWidth={1} opacity={0.6} />
        <circle cx={200} cy={150} r={14} fill="none" stroke="#3FA34D" strokeWidth={1} opacity={0.6} />

        {zones.map((zone) => {
          const quadrant = GATE_TO_QUADRANT[zone.gate] ?? 'A';
          const [start, end] = QUADRANTS[quadrant];
          const isUpper = zone.level === 'upper';
          const path = isUpper
            ? ringSegmentPath(112, 82, 150, 112, start, end)
            : ringSegmentPath(70, 50, 108, 78, start, end);

          const risk = riskByZone.get(zone.id);
          const color = risk ? RISK_COLORS[risk.riskLevel] : '#26313F';
          const midAngle = (start + end) / 2;
          const labelRadius = isUpper ? { rx: 131, ry: 97 } : { rx: 89, ry: 64 };
          const labelPos = polarPoint(labelRadius.rx, labelRadius.ry, midAngle);
          const isSelected = selectedZoneId === zone.id;

          return (
            <g key={zone.id}>
              <path
                d={path}
                fill={color}
                fillOpacity={isSelected ? 0.95 : 0.75}
                stroke={isSelected ? '#F4F7F9' : '#0A0E13'}
                strokeWidth={isSelected ? 2 : 1.5}
                role="button"
                tabIndex={0}
                aria-label={`${zone.label}: risk ${risk?.riskLevel ?? 'unknown'}, ${
                  risk ? Math.round(risk.occupancyRatio * 100) : 0
                }% occupancy`}
                className="cursor-pointer transition-opacity focus-visible:outline-none"
                onClick={() => onSelectZone?.(zone.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectZone?.(zone.id);
                  }
                }}
              />
              <text
                x={labelPos.x}
                y={labelPos.y - 4}
                textAnchor="middle"
                className="fill-console-bg font-mono text-[9px] font-semibold"
              >
                {zone.gate}
              </text>
              <text
                x={labelPos.x}
                y={labelPos.y + 8}
                textAnchor="middle"
                className="fill-console-bg font-mono text-[8px]"
              >
                {risk?.riskScore ?? '–'}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-console-muted">
        {(Object.keys(RISK_COLORS) as RiskLevel[]).map((level) => (
          <span key={level} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: RISK_COLORS[level] }} />
            {level}
          </span>
        ))}
      </div>
    </div>
  );
}
