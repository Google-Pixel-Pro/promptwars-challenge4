import { Badge } from '@/components/ui/Badge';
import type { MatchContext, WeatherContext, RiskLevel } from '@/types';

const RISK_TONE: Record<RiskLevel, 'nominal' | 'elevated' | 'high' | 'critical'> = {
  nominal: 'nominal',
  elevated: 'elevated',
  high: 'high',
  critical: 'critical',
};

const PHASE_LABEL: Record<MatchContext['phase'], string> = {
  'pre-match': 'Pre-Match',
  'in-play': 'In-Play',
  halftime: 'Halftime',
  'post-match': 'Post-Match',
};

function kickoffLabel(minutes: number, phase: MatchContext['phase']): string {
  if (phase === 'pre-match') return `Kickoff in ${minutes} min`;
  return `${Math.abs(minutes)} min since kickoff`;
}

export function StatusBar({
  match,
  weather,
  overallRiskLevel,
}: {
  match: MatchContext;
  weather: WeatherContext;
  overallRiskLevel: RiskLevel;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-console-border bg-console-panel px-5 py-4 shadow-panel">
      <div>
        <p className="font-display text-lg font-semibold text-floodlight">{match.stadiumName}</p>
        <p className="text-sm text-console-muted">
          {match.hostCity} · {match.matchLabel} · capacity {match.capacity.toLocaleString()}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">{PHASE_LABEL[match.phase]}</Badge>
        <Badge tone="neutral">{kickoffLabel(match.minutesToKickoff, match.phase)}</Badge>
        <Badge tone="neutral">
          {weather.condition} · {weather.temperatureC}°C
        </Badge>
        <Badge tone={RISK_TONE[overallRiskLevel]}>Overall: {overallRiskLevel}</Badge>
      </div>
    </div>
  );
}
