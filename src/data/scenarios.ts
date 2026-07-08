import type { Zone, StadiumState, ScenarioId, MatchContext, WeatherContext, IncidentReport } from '@/types';

/**
 * Demo data assumptions (see README "Assumptions" section for the full list):
 *
 * - Grounded in MetLife Stadium, East Rutherford, NJ — the confirmed venue for
 *   the FIFA World Cup 2026 final, capacity ~82,500.
 * - Eight zones represent a seating section paired with the concourse behind
 *   its gate. "capacity" is the safe combined seating + concourse throughput
 *   capacity for that cluster, not raw seat count — so occupancy can
 *   legitimately approach/exceed 100% during concourse convergence events
 *   (e.g. halftime) even though the seating bowl itself is not "overfull".
 * - All numbers are illustrative simulation data for demonstrating the
 *   decision-support logic, not live sensor feeds from an actual match.
 */

function zone(input: Omit<Zone, 'level'> & { level: Zone['level'] }): Zone {
  return input;
}

const ZONES: Record<string, Zone> = {
  'gate-a-lower': zone({
    id: 'gate-a-lower',
    label: 'Gate A · Lower Bowl',
    gate: 'A',
    level: 'lower',
    capacity: 11000,
    occupancy: 0,
    inflowRatePerMin: 0,
    outflowRatePerMin: 0,
    nearestExitZoneIds: ['gate-b-lower', 'gate-d-lower'],
    accessibleRoute: true,
  }),
  'gate-b-lower': zone({
    id: 'gate-b-lower',
    label: 'Gate B · Lower Bowl',
    gate: 'B',
    level: 'lower',
    capacity: 11000,
    occupancy: 0,
    inflowRatePerMin: 0,
    outflowRatePerMin: 0,
    nearestExitZoneIds: ['gate-a-lower', 'gate-c-lower'],
    accessibleRoute: false,
  }),
  'gate-c-lower': zone({
    id: 'gate-c-lower',
    label: 'Gate C · Lower Bowl',
    gate: 'C',
    level: 'lower',
    capacity: 10500,
    occupancy: 0,
    inflowRatePerMin: 0,
    outflowRatePerMin: 0,
    nearestExitZoneIds: ['gate-b-lower', 'gate-d-lower'],
    accessibleRoute: true,
  }),
  'gate-d-lower': zone({
    id: 'gate-d-lower',
    label: 'Gate D · Lower Bowl',
    gate: 'D',
    level: 'lower',
    capacity: 10500,
    occupancy: 0,
    inflowRatePerMin: 0,
    outflowRatePerMin: 0,
    nearestExitZoneIds: ['gate-c-lower', 'gate-a-lower'],
    accessibleRoute: false,
  }),
  'gate-e-upper': zone({
    id: 'gate-e-upper',
    label: 'Gate E · Upper Deck',
    gate: 'E',
    level: 'upper',
    capacity: 10000,
    occupancy: 0,
    inflowRatePerMin: 0,
    outflowRatePerMin: 0,
    nearestExitZoneIds: ['gate-f-upper', 'gate-h-upper'],
    accessibleRoute: false,
  }),
  'gate-f-upper': zone({
    id: 'gate-f-upper',
    label: 'Gate F · Upper Deck',
    gate: 'F',
    level: 'upper',
    capacity: 10000,
    occupancy: 0,
    inflowRatePerMin: 0,
    outflowRatePerMin: 0,
    nearestExitZoneIds: ['gate-e-upper', 'gate-g-upper'],
    accessibleRoute: false,
  }),
  'gate-g-upper': zone({
    id: 'gate-g-upper',
    label: 'Gate G · Upper Deck',
    gate: 'G',
    level: 'upper',
    capacity: 9500,
    occupancy: 0,
    inflowRatePerMin: 0,
    outflowRatePerMin: 0,
    nearestExitZoneIds: ['gate-f-upper', 'gate-h-upper'],
    accessibleRoute: false,
  }),
  'gate-h-upper': zone({
    id: 'gate-h-upper',
    label: 'Gate H · Upper Deck',
    gate: 'H',
    level: 'upper',
    capacity: 9500,
    occupancy: 0,
    inflowRatePerMin: 0,
    outflowRatePerMin: 0,
    nearestExitZoneIds: ['gate-g-upper', 'gate-e-upper'],
    accessibleRoute: false,
  }),
};

function withFlow(
  id: string,
  occupancy: number,
  inflowRatePerMin: number,
  outflowRatePerMin: number
): Zone {
  const base = ZONES[id];
  if (!base) throw new Error(`Unknown zone id: ${id}`);
  return { ...base, occupancy, inflowRatePerMin, outflowRatePerMin };
}

const VENUE: Omit<MatchContext, 'matchLabel' | 'minutesToKickoff' | 'phase'> = {
  stadiumName: 'MetLife Stadium',
  hostCity: 'East Rutherford, NJ',
  capacity: 82500,
};

const CLEAR: WeatherContext = { condition: 'clear', temperatureC: 24 };
const HEAT: WeatherContext = { condition: 'heat', temperatureC: 29 };

const NO_INCIDENTS: IncidentReport[] = [];

const SCENARIOS: Record<ScenarioId, StadiumState> = {
  'normal-flow': {
    scenarioId: 'normal-flow',
    scenarioLabel: 'Normal Flow · Pre-Match Arrival',
    match: { ...VENUE, matchLabel: 'Knockout Stage Fixture', minutesToKickoff: 45, phase: 'pre-match' },
    weather: CLEAR,
    incidents: NO_INCIDENTS,
    zones: [
      withFlow('gate-a-lower', 4800, 120, 20),
      withFlow('gate-b-lower', 5200, 130, 25),
      withFlow('gate-c-lower', 4600, 110, 20),
      withFlow('gate-d-lower', 5000, 125, 22),
      withFlow('gate-e-upper', 4200, 95, 15),
      withFlow('gate-f-upper', 4400, 100, 15),
      withFlow('gate-g-upper', 3900, 90, 12),
      withFlow('gate-h-upper', 4100, 95, 14),
    ],
  },

  'halftime-rush': {
    scenarioId: 'halftime-rush',
    scenarioLabel: 'Halftime Rush · Concourse Convergence',
    match: { ...VENUE, matchLabel: 'Knockout Stage Fixture', minutesToKickoff: -47, phase: 'halftime' },
    weather: HEAT,
    incidents: NO_INCIDENTS,
    zones: [
      withFlow('gate-a-lower', 8200, 180, 90),
      withFlow('gate-b-lower', 8600, 190, 95),
      withFlow('gate-c-lower', 7800, 170, 90),
      withFlow('gate-d-lower', 8000, 175, 88),
      withFlow('gate-e-upper', 8700, 260, 110),
      withFlow('gate-f-upper', 9850, 300, 100),
      withFlow('gate-g-upper', 9600, 285, 95),
      withFlow('gate-h-upper', 8300, 220, 105),
    ],
  },

  'post-match-exodus': {
    scenarioId: 'post-match-exodus',
    scenarioLabel: 'Post-Match Exodus · Full-Time Egress',
    match: { ...VENUE, matchLabel: 'Knockout Stage Fixture', minutesToKickoff: -103, phase: 'post-match' },
    weather: CLEAR,
    incidents: NO_INCIDENTS,
    zones: [
      withFlow('gate-a-lower', 9200, 10, 340),
      withFlow('gate-b-lower', 8600, 10, 360),
      withFlow('gate-c-lower', 8100, 5, 355),
      withFlow('gate-d-lower', 10100, 15, 240),
      withFlow('gate-e-upper', 7600, 5, 330),
      withFlow('gate-f-upper', 7200, 5, 345),
      withFlow('gate-g-upper', 7400, 5, 335),
      withFlow('gate-h-upper', 9450, 20, 230),
    ],
  },

  'security-incident': {
    scenarioId: 'security-incident',
    scenarioLabel: 'Security Incident · In-Play',
    match: { ...VENUE, matchLabel: 'Knockout Stage Fixture', minutesToKickoff: -20, phase: 'in-play' },
    weather: CLEAR,
    incidents: [
      {
        id: 'inc-001',
        zoneId: 'gate-c-lower',
        category: 'security',
        severity: 'high',
        reportedAtMinute: -18,
        description: 'Reported altercation between spectators, section behind Gate C.',
      },
      {
        id: 'inc-002',
        zoneId: 'gate-g-upper',
        category: 'facility',
        severity: 'low',
        reportedAtMinute: -25,
        description: 'One of two escalators out of service near Gate G concourse.',
      },
    ],
    zones: [
      withFlow('gate-a-lower', 7900, 40, 35),
      withFlow('gate-b-lower', 8100, 45, 35),
      withFlow('gate-c-lower', 7600, 60, 30),
      withFlow('gate-d-lower', 7800, 40, 35),
      withFlow('gate-e-upper', 7200, 35, 30),
      withFlow('gate-f-upper', 7500, 35, 30),
      withFlow('gate-g-upper', 7100, 40, 25),
      withFlow('gate-h-upper', 7300, 35, 30),
    ],
  },
};

export const SCENARIO_META: Array<{ id: ScenarioId; label: string; description: string }> = [
  {
    id: 'normal-flow',
    label: 'Normal Flow',
    description: 'Pre-match arrival, 45 minutes to kickoff. Baseline operating conditions.',
  },
  {
    id: 'halftime-rush',
    label: 'Halftime Rush',
    description: 'Simultaneous concourse convergence across upper-deck gates during heat.',
  },
  {
    id: 'post-match-exodus',
    label: 'Post-Match Exodus',
    description: 'Full-time egress bottleneck at gates feeding the transit hub.',
  },
  {
    id: 'security-incident',
    label: 'Security Incident',
    description: 'Moderate occupancy, but an active high-severity incident in-play.',
  },
];

export function getScenario(id: ScenarioId): StadiumState | undefined {
  return SCENARIOS[id];
}

export function listScenarios(): StadiumState[] {
  return Object.values(SCENARIOS);
}
