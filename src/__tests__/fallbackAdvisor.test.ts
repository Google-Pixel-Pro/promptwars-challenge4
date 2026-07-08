import { describe, it, expect } from 'vitest';
import { generateFallbackRecommendations } from '@/lib/fallbackAdvisor';
import { scoreStadium } from '@/lib/riskEngine';
import { getScenario } from '@/data/scenarios';

describe('generateFallbackRecommendations', () => {
  it('recommends nothing for a scenario with only nominal zones', () => {
    const scenario = getScenario('normal-flow');
    if (!scenario) throw new Error('fixture scenario missing');
    const zoneRisks = scoreStadium(scenario);
    const advisor = generateFallbackRecommendations(scenario, zoneRisks);
    // normal-flow is designed to stay under the "elevated" threshold
    expect(advisor.recommendations.every((rec) => rec.priority === 3)).toBe(true);
  });

  it('produces a priority-1 recommendation for the security-incident scenario, correctly categorized as security (not medical)', () => {
    const scenario = getScenario('security-incident');
    if (!scenario) throw new Error('fixture scenario missing');
    const zoneRisks = scoreStadium(scenario);
    const advisor = generateFallbackRecommendations(scenario, zoneRisks);
    const securityRec = advisor.recommendations.find((rec) => rec.targetZoneIds.includes('gate-c-lower'));
    expect(securityRec?.priority).toBe(1);
    expect(securityRec?.category).toBe('security');
  });

  it('does not escalate a low-severity facility incident to priority 1 just because it is "an incident"', () => {
    const scenario = getScenario('security-incident');
    if (!scenario) throw new Error('fixture scenario missing');
    const zoneRisks = scoreStadium(scenario);
    const advisor = generateFallbackRecommendations(scenario, zoneRisks);
    const facilityRec = advisor.recommendations.find((rec) => rec.targetZoneIds.includes('gate-g-upper'));
    // gate-g-upper only has a *low*-severity facility incident and moderate
    // occupancy in this scenario, so it must not be ranked as urgently as the
    // high-severity security incident at gate-c-lower.
    expect(facilityRec?.category).toBe('facility');
    expect(facilityRec?.priority).toBeGreaterThan(1);
  });

  it('every recommendation targets a zone ID that actually exists in the scenario', () => {
    const scenario = getScenario('halftime-rush');
    if (!scenario) throw new Error('fixture scenario missing');
    const zoneRisks = scoreStadium(scenario);
    const advisor = generateFallbackRecommendations(scenario, zoneRisks);
    const realIds = new Set(scenario.zones.map((z) => z.id));
    for (const rec of advisor.recommendations) {
      for (const zoneId of rec.targetZoneIds) {
        expect(realIds.has(zoneId)).toBe(true);
      }
    }
  });

  it('sets source to fallback-heuristic', () => {
    const scenario = getScenario('post-match-exodus');
    if (!scenario) throw new Error('fixture scenario missing');
    const zoneRisks = scoreStadium(scenario);
    const advisor = generateFallbackRecommendations(scenario, zoneRisks);
    expect(advisor.source).toBe('fallback-heuristic');
  });

  it('caps recommendations at 5 even with more at-risk zones', () => {
    const scenario = getScenario('halftime-rush');
    if (!scenario) throw new Error('fixture scenario missing');
    const zoneRisks = scoreStadium(scenario);
    const advisor = generateFallbackRecommendations(scenario, zoneRisks);
    expect(advisor.recommendations.length).toBeLessThanOrEqual(5);
  });
});
