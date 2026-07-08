import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/advisor/route';
import { _resetRateLimitStore } from '@/lib/rateLimit';
import { _clearCache } from '@/lib/cache';

/**
 * These exercise the real exported route handler end-to-end -- validation,
 * rate limiting, the deterministic fallback path, and response shape --
 * rather than only the pure functions it's built from. GEMINI_API_KEY is
 * unset in the test environment, so every request here goes through
 * lib/fallbackAdvisor.ts, exactly like a fresh `npm run dev` with no
 * configuration.
 */

function makeRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/advisor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('POST /api/advisor', () => {
  beforeEach(() => {
    _resetRateLimitStore();
    _clearCache();
  });

  it('returns 200 with prioritized recommendations for a valid scenario', async () => {
    const response = await POST(makeRequest({ scenarioId: 'security-incident' }, { 'x-forwarded-for': 'test-client-1' }));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.source).toBe('fallback-heuristic');
    expect(Array.isArray(data.recommendations)).toBe(true);
    expect(Array.isArray(data.zoneRisks)).toBe(true);
  });

  it('the security-incident scenario response is correctly categorized (regression test)', async () => {
    const response = await POST(makeRequest({ scenarioId: 'security-incident' }, { 'x-forwarded-for': 'test-client-2' }));
    const data = await response.json();
    const securityRec = data.recommendations.find((rec: { targetZoneIds: string[] }) =>
      rec.targetZoneIds.includes('gate-c-lower')
    );
    const facilityRec = data.recommendations.find((rec: { targetZoneIds: string[] }) =>
      rec.targetZoneIds.includes('gate-g-upper')
    );
    expect(securityRec.category).toBe('security');
    expect(securityRec.priority).toBe(1);
    expect(facilityRec.category).toBe('facility');
    expect(facilityRec.priority).toBeGreaterThan(1);
  });

  it('returns 400 for an invalid scenarioId', async () => {
    const response = await POST(makeRequest({ scenarioId: 'not-a-real-scenario' }, { 'x-forwarded-for': 'test-client-3' }));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it('returns 400 for a malformed JSON body', async () => {
    const request = new NextRequest('http://localhost/api/advisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': 'test-client-4' },
      body: '{not valid json',
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('rejects an operatorNote longer than the allowed limit with 400', async () => {
    const response = await POST(
      makeRequest(
        { scenarioId: 'normal-flow', operatorNote: 'x'.repeat(500) },
        { 'x-forwarded-for': 'test-client-5' }
      )
    );
    expect(response.status).toBe(400);
  });

  it('returns 429 once a single client exceeds the rate limit', async () => {
    const clientKey = { 'x-forwarded-for': 'rate-limit-test-client' };
    let lastStatus = 200;
    for (let i = 0; i < 21; i += 1) {
      const response = await POST(makeRequest({ scenarioId: 'normal-flow' }, clientKey));
      lastStatus = response.status;
    }
    expect(lastStatus).toBe(429);
  });

  it('serves a cached response on an immediate repeat request for the same scenario', async () => {
    const clientKey = { 'x-forwarded-for': 'cache-test-client' };
    const first = await POST(makeRequest({ scenarioId: 'halftime-rush' }, clientKey));
    const firstData = await first.json();
    const second = await POST(makeRequest({ scenarioId: 'halftime-rush' }, clientKey));
    const secondData = await second.json();
    expect(firstData.cached).toBe(false);
    expect(secondData.cached).toBe(true);
  });
});
