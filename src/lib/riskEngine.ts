import type { Zone, ZoneRisk, RiskLevel, StadiumState, IncidentReport } from '@/types';

/**
 * Deterministic risk scoring for a single zone.
 *
 * Design intent: the parts of "logical decision making" that must be
 * reliable, explainable, and cheap to run on every request should NOT depend
 * on an LLM call. This engine is what actually decides risk; the AI layer
 * (see lib/gemini.ts) only turns already-computed risk into phrased,
 * prioritized recommendations. That separation is also why this file has
 * zero external dependencies and 100% deterministic output — it is trivial
 * to unit test and cannot hallucinate a number.
 */

const OCCUPANCY_WEIGHT = 55;
const FLOW_WEIGHT = 25;
const INCIDENT_WEIGHT = 20;

const SEVERITY_WEIGHT: Record<IncidentReport['severity'], number> = {
  low: 0.15,
  medium: 0.4,
  high: 0.75,
  critical: 1,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Occupancy as a fraction of safe capacity. Allowed to run slightly over 1.0
 * so the engine can still flag active overcrowding rather than capping it away. */
export function occupancyRatio(zone: Zone): number {
  if (zone.capacity <= 0) return 0;
  return clamp(zone.occupancy / zone.capacity, 0, 1.25);
}

/** Net inflow normalized to roughly [-1, 1]. 200/min net is treated as the
 * threshold for "high pressure" for a typical gate cluster in this model. */
export function flowPressure(zone: Zone): number {
  const net = zone.inflowRatePerMin - zone.outflowRatePerMin;
  return clamp(net / 200, -1, 1);
}

/** Worst active incident severity in the zone, or 0 if none. */
export function incidentPressure(zoneId: string, incidents: IncidentReport[]): number {
  const zoneIncidents = incidents.filter((incident) => incident.zoneId === zoneId);
  if (zoneIncidents.length === 0) return 0;
  return Math.max(...zoneIncidents.map((incident) => SEVERITY_WEIGHT[incident.severity]));
}

export function toRiskLevel(score: number): RiskLevel {
  if (score >= 85) return 'critical';
  if (score >= 65) return 'high';
  if (score >= 40) return 'elevated';
  return 'nominal';
}

export function scoreZone(zone: Zone, incidents: IncidentReport[]): ZoneRisk {
  const ratio = occupancyRatio(zone);
  const flow = flowPressure(zone);
  const incidentScore = incidentPressure(zone.id, incidents);

  const occupancyComponent = clamp(ratio, 0, 1.25) * OCCUPANCY_WEIGHT;
  const flowComponent = clamp((flow + 1) / 2, 0, 1) * FLOW_WEIGHT;
  const incidentComponent = incidentScore * INCIDENT_WEIGHT;

  const riskScore = Math.round(clamp(occupancyComponent + flowComponent + incidentComponent, 0, 100));

  const zoneIncidents = incidents.filter((i) => i.zoneId === zone.id);
  const worst =
    zoneIncidents.length > 0
      ? zoneIncidents.reduce((current, candidate) =>
          SEVERITY_WEIGHT[candidate.severity] > SEVERITY_WEIGHT[current.severity] ? candidate : current
        )
      : undefined;

  const contributingFactors: string[] = [];
  if (ratio >= 0.9) {
    contributingFactors.push(`Occupancy at ${Math.round(ratio * 100)}% of safe capacity`);
  }
  if (flow > 0.3) {
    contributingFactors.push('Net inflow exceeding safe outflow rate');
  }
  if (worst) {
    contributingFactors.push(`Active ${worst.severity} ${worst.category} incident reported`);
  }

  return {
    zoneId: zone.id,
    occupancyRatio: ratio,
    riskScore,
    riskLevel: toRiskLevel(riskScore),
    contributingFactors,
    worstIncident: worst ? { severity: worst.severity, category: worst.category } : null,
  };
}

/** Scores every zone in the stadium and returns results sorted by descending
 * risk. O(n log n) in zone count, negligible for real stadium gate counts. */
export function scoreStadium(state: StadiumState): ZoneRisk[] {
  return state.zones
    .map((zone) => scoreZone(zone, state.incidents))
    .sort((a, b) => b.riskScore - a.riskScore);
}

export function overallRiskLevel(zoneRisks: ZoneRisk[]): RiskLevel {
  const [worst] = zoneRisks;
  return worst?.riskLevel ?? 'nominal';
}
