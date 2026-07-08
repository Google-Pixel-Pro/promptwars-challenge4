import type {
  StadiumState,
  ZoneRisk,
  AdvisorResponse,
  OperationalRecommendation,
  RecommendationCategory,
  IncidentSeverity,
  IncidentCategory,
} from '@/types';

/**
 * Rule-based recommendation generator. Used whenever GEMINI_API_KEY is
 * unset or the Gemini call fails, so the app is always fully functional —
 * cloning the repo and running `npm run dev` with no configuration produces
 * a working, sensible command center, not a broken demo. It is also what the
 * unit tests exercise, since it has no network dependency.
 *
 * Priority and category are both derived from *structured* data
 * (ZoneRisk.worstIncident) rather than by pattern-matching the human-readable
 * contributingFactors strings. That distinction matters in practice: a
 * string-matching version of this file initially escalated a low-severity
 * "escalator out of service" facility report to the same priority-1 /
 * "medical" treatment as a high-severity security incident, just because
 * both happened to contain the word "incident". Branching on the actual
 * severity and category fields instead makes that class of bug impossible.
 */

const INCIDENT_CATEGORY_TO_RECOMMENDATION: Record<IncidentCategory, RecommendationCategory> = {
  medical: 'medical',
  security: 'security',
  'crowd-surge': 'gate-management',
  facility: 'facility',
};

const INCIDENT_SEVERITY_PRIORITY: Record<IncidentSeverity, OperationalRecommendation['priority']> = {
  critical: 1,
  high: 1,
  medium: 2,
  low: 3,
};

function occupancyPriority(risk: ZoneRisk): OperationalRecommendation['priority'] {
  if (risk.riskLevel === 'critical') return 1;
  if (risk.riskLevel === 'high') return 2;
  return 3;
}

/** Lower number = more urgent, so the effective priority is whichever signal
 * (crowd density or incident severity) demands faster action. */
function priorityForRisk(risk: ZoneRisk): OperationalRecommendation['priority'] {
  const fromOccupancy = occupancyPriority(risk);
  const fromIncident = risk.worstIncident ? INCIDENT_SEVERITY_PRIORITY[risk.worstIncident.severity] : 3;
  return Math.min(fromOccupancy, fromIncident) as OperationalRecommendation['priority'];
}

function categoryForRisk(risk: ZoneRisk): RecommendationCategory {
  if (risk.worstIncident) {
    return INCIDENT_CATEGORY_TO_RECOMMENDATION[risk.worstIncident.category];
  }
  if (risk.occupancyRatio >= 0.9) return 'gate-management';
  if (risk.contributingFactors.some((factor) => factor.toLowerCase().includes('inflow'))) {
    return 'transportation';
  }
  return 'communication';
}

function actionForRisk(risk: ZoneRisk, state: StadiumState): OperationalRecommendation {
  const zone = state.zones.find((candidate) => candidate.id === risk.zoneId);
  const label = zone?.label ?? risk.zoneId;
  const priority = priorityForRisk(risk);

  let action = `Increase steward presence at ${label} and monitor for the next 10 minutes.`;
  let rationale = `Risk score ${risk.riskScore}/100 (${risk.riskLevel}). ${
    risk.contributingFactors[0] ?? 'Elevated relative to baseline.'
  }`;

  if (risk.worstIncident && (risk.worstIncident.severity === 'high' || risk.worstIncident.severity === 'critical')) {
    action = `Dispatch the nearest ${risk.worstIncident.category} response team to ${label} immediately.`;
    rationale = risk.contributingFactors.join(' ');
  } else if (risk.worstIncident) {
    action = `Log and route a ${risk.worstIncident.category} team to ${label} when available.`;
    rationale = risk.contributingFactors.join(' ');
  } else if (risk.riskLevel === 'critical') {
    action = `Open the nearest overflow route and hold new entry at ${label} until occupancy drops below 90%.`;
    rationale = `${label} has reached critical risk (${risk.riskScore}/100): ${risk.contributingFactors.join('; ')}.`;
  } else if (risk.riskLevel === 'high') {
    action = `Deploy two additional stewards to ${label} and trigger a queue-management announcement.`;
  }

  return {
    id: `fallback-${risk.zoneId}`,
    priority,
    action,
    rationale,
    targetZoneIds: [risk.zoneId],
    category: categoryForRisk(risk),
  };
}

export function generateFallbackRecommendations(
  state: StadiumState,
  zoneRisks: ZoneRisk[]
): AdvisorResponse {
  const actionable = zoneRisks
    .filter((risk) => risk.riskLevel !== 'nominal' || risk.worstIncident !== null)
    .slice(0, 5);
  const recommendations = actionable.map((risk) => actionForRisk(risk, state));

  return {
    generatedAt: new Date().toISOString(),
    overallRiskLevel: zoneRisks[0]?.riskLevel ?? 'nominal',
    recommendations,
    source: 'fallback-heuristic',
  };
}
