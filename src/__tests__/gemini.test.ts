import { describe, it, expect } from 'vitest';
import { keepOnlyRealZones } from '@/lib/gemini';
import { getScenario } from '@/data/scenarios';
import type { OperationalRecommendation } from '@/types';

function makeRec(overrides: Partial<OperationalRecommendation> = {}): OperationalRecommendation {
  return {
    id: 'test-rec',
    priority: 1,
    action: 'Do something',
    rationale: 'Because reasons',
    targetZoneIds: ['gate-a-lower'],
    category: 'communication',
    ...overrides,
  };
}

describe('keepOnlyRealZones', () => {
  const scenario = getScenario('normal-flow');
  if (!scenario) throw new Error('fixture scenario missing');

  it('keeps a recommendation that references a real zone ID', () => {
    const result = keepOnlyRealZones([makeRec({ targetZoneIds: ['gate-a-lower'] })], scenario);
    expect(result).toHaveLength(1);
  });

  it('drops a recommendation that references a zone ID that does not exist', () => {
    const result = keepOnlyRealZones([makeRec({ targetZoneIds: ['gate-z-imaginary'] })], scenario);
    expect(result).toHaveLength(0);
  });

  it('drops a recommendation with an empty targetZoneIds array', () => {
    const result = keepOnlyRealZones([makeRec({ targetZoneIds: [] })], scenario);
    expect(result).toHaveLength(0);
  });

  it('drops a recommendation only if ANY referenced zone is fake, even if others are real', () => {
    const result = keepOnlyRealZones(
      [makeRec({ targetZoneIds: ['gate-a-lower', 'gate-nonexistent'] })],
      scenario
    );
    expect(result).toHaveLength(0);
  });

  it('filters a mixed batch, keeping only the recommendations grounded in real zones', () => {
    const recs = [
      makeRec({ id: 'real-1', targetZoneIds: ['gate-a-lower'] }),
      makeRec({ id: 'fake-1', targetZoneIds: ['gate-imaginary'] }),
      makeRec({ id: 'real-2', targetZoneIds: ['gate-b-lower'] }),
    ];
    const result = keepOnlyRealZones(recs, scenario);
    expect(result.map((r) => r.id)).toEqual(['real-1', 'real-2']);
  });

  it('returns an empty array when given no recommendations', () => {
    expect(keepOnlyRealZones([], scenario)).toEqual([]);
  });
});
