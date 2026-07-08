import { describe, it, expect } from 'vitest';
import {
  occupancyRatio,
  flowPressure,
  incidentPressure,
  toRiskLevel,
  scoreZone,
  scoreStadium,
  overallRiskLevel,
} from '@/lib/riskEngine';
import type { Zone, IncidentReport, StadiumState } from '@/types';

function makeZone(overrides: Partial<Zone> = {}): Zone {
  return {
    id: 'gate-a-lower',
    label: 'Gate A · Lower Bowl',
    gate: 'A',
    level: 'lower',
    capacity: 10000,
    occupancy: 5000,
    inflowRatePerMin: 50,
    outflowRatePerMin: 50,
    nearestExitZoneIds: [],
    accessibleRoute: false,
    ...overrides,
  };
}

describe('occupancyRatio', () => {
  it('returns 0 when capacity is 0 to avoid division by zero', () => {
    expect(occupancyRatio(makeZone({ capacity: 0, occupancy: 500 }))).toBe(0);
  });

  it('computes a simple ratio correctly', () => {
    expect(occupancyRatio(makeZone({ capacity: 1000, occupancy: 500 }))).toBeCloseTo(0.5);
  });

  it('clamps overshoot at 1.25 instead of growing unbounded', () => {
    expect(occupancyRatio(makeZone({ capacity: 1000, occupancy: 5000 }))).toBe(1.25);
  });

  it('never returns a negative ratio', () => {
    expect(occupancyRatio(makeZone({ capacity: 1000, occupancy: -50 }))).toBe(0);
  });
});

describe('flowPressure', () => {
  it('is 0 when inflow equals outflow', () => {
    expect(flowPressure(makeZone({ inflowRatePerMin: 100, outflowRatePerMin: 100 }))).toBe(0);
  });

  it('is positive when inflow exceeds outflow', () => {
    expect(flowPressure(makeZone({ inflowRatePerMin: 300, outflowRatePerMin: 100 }))).toBeGreaterThan(0);
  });

  it('clamps at 1 for extreme net inflow', () => {
    expect(flowPressure(makeZone({ inflowRatePerMin: 5000, outflowRatePerMin: 0 }))).toBe(1);
  });

  it('clamps at -1 for extreme net outflow', () => {
    expect(flowPressure(makeZone({ inflowRatePerMin: 0, outflowRatePerMin: 5000 }))).toBe(-1);
  });
});

describe('incidentPressure', () => {
  const incidents: IncidentReport[] = [
    { id: '1', zoneId: 'gate-a-lower', category: 'medical', severity: 'low', reportedAtMinute: 0, description: '' },
    { id: '2', zoneId: 'gate-a-lower', category: 'security', severity: 'critical', reportedAtMinute: 0, description: '' },
    { id: '3', zoneId: 'gate-b-lower', category: 'facility', severity: 'medium', reportedAtMinute: 0, description: '' },
  ];

  it('returns 0 for a zone with no incidents', () => {
    expect(incidentPressure('gate-c-lower', incidents)).toBe(0);
  });

  it('returns the worst severity among multiple incidents in the same zone', () => {
    expect(incidentPressure('gate-a-lower', incidents)).toBe(1);
  });

  it('is scoped to the requested zone only', () => {
    expect(incidentPressure('gate-b-lower', incidents)).toBe(0.4);
  });
});

describe('toRiskLevel', () => {
  it.each([
    [0, 'nominal'],
    [39, 'nominal'],
    [40, 'elevated'],
    [64, 'elevated'],
    [65, 'high'],
    [84, 'high'],
    [85, 'critical'],
    [100, 'critical'],
  ] as const)('classifies score %i as %s', (score, expected) => {
    expect(toRiskLevel(score)).toBe(expected);
  });
});

describe('scoreZone', () => {
  it('produces a nominal, low-risk score for a quiet zone', () => {
    const risk = scoreZone(makeZone({ occupancy: 2000, capacity: 10000, inflowRatePerMin: 40, outflowRatePerMin: 40 }), []);
    expect(risk.riskLevel).toBe('nominal');
    expect(risk.contributingFactors).toHaveLength(0);
  });

  it('flags high occupancy as a contributing factor', () => {
    const risk = scoreZone(makeZone({ occupancy: 9500, capacity: 10000, inflowRatePerMin: 40, outflowRatePerMin: 40 }), []);
    expect(risk.contributingFactors.some((f) => f.includes('Occupancy'))).toBe(true);
  });

  it('escalates risk when an active incident is present, even at moderate occupancy', () => {
    const incidents: IncidentReport[] = [
      { id: '1', zoneId: 'gate-a-lower', category: 'security', severity: 'high', reportedAtMinute: 0, description: '' },
    ];
    const quiet = scoreZone(makeZone({ occupancy: 5000, capacity: 10000, inflowRatePerMin: 40, outflowRatePerMin: 40 }), []);
    const withIncident = scoreZone(
      makeZone({ occupancy: 5000, capacity: 10000, inflowRatePerMin: 40, outflowRatePerMin: 40 }),
      incidents
    );
    expect(withIncident.riskScore).toBeGreaterThan(quiet.riskScore);
    expect(withIncident.contributingFactors.some((f) => f.includes('incident'))).toBe(true);
  });

  it('exposes the worst incident as structured data, not just a description string', () => {
    const incidents: IncidentReport[] = [
      { id: '1', zoneId: 'gate-a-lower', category: 'facility', severity: 'low', reportedAtMinute: 0, description: '' },
      { id: '2', zoneId: 'gate-a-lower', category: 'security', severity: 'critical', reportedAtMinute: 0, description: '' },
    ];
    const risk = scoreZone(makeZone(), incidents);
    // Must surface the CRITICAL security incident as worst, not the low facility one.
    expect(risk.worstIncident).toEqual({ severity: 'critical', category: 'security' });
  });

  it('sets worstIncident to null when there are no incidents in the zone', () => {
    const risk = scoreZone(makeZone(), []);
    expect(risk.worstIncident).toBeNull();
  });

  it('never returns a risk score outside [0, 100]', () => {
    const risk = scoreZone(
      makeZone({ occupancy: 999999, capacity: 100, inflowRatePerMin: 999999, outflowRatePerMin: 0 }),
      [{ id: '1', zoneId: 'gate-a-lower', category: 'security', severity: 'critical', reportedAtMinute: 0, description: '' }]
    );
    expect(risk.riskScore).toBeGreaterThanOrEqual(0);
    expect(risk.riskScore).toBeLessThanOrEqual(100);
  });
});

describe('scoreStadium and overallRiskLevel', () => {
  function makeState(zones: Zone[], incidents: IncidentReport[] = []): StadiumState {
    return {
      scenarioId: 'normal-flow',
      scenarioLabel: 'test',
      match: {
        stadiumName: 'Test Stadium',
        hostCity: 'Test City',
        capacity: 20000,
        matchLabel: 'Test Fixture',
        minutesToKickoff: 10,
        phase: 'pre-match',
      },
      weather: { condition: 'clear', temperatureC: 20 },
      zones,
      incidents,
    };
  }

  it('sorts zones by descending risk score', () => {
    const zones = [
      makeZone({ id: 'low', occupancy: 1000, capacity: 10000 }),
      makeZone({ id: 'high', occupancy: 9800, capacity: 10000, inflowRatePerMin: 300, outflowRatePerMin: 50 }),
    ];
    const risks = scoreStadium(makeState(zones));
    expect(risks).toHaveLength(2);
    expect(risks.at(0)?.zoneId).toBe('high');
    expect(risks.at(1)?.zoneId).toBe('low');
  });

  it('overallRiskLevel reflects the single worst zone', () => {
    const zones = [
      makeZone({ id: 'calm', occupancy: 1000, capacity: 10000 }),
      makeZone({ id: 'critical-zone', occupancy: 9999, capacity: 10000, inflowRatePerMin: 400, outflowRatePerMin: 0 }),
    ];
    const risks = scoreStadium(
      makeState(zones, [
        { id: '1', zoneId: 'critical-zone', category: 'crowd-surge', severity: 'critical', reportedAtMinute: 0, description: '' },
      ])
    );
    expect(overallRiskLevel(risks)).toBe('critical');
  });

  it('returns nominal for an empty zone list', () => {
    expect(overallRiskLevel([])).toBe('nominal');
  });
});
