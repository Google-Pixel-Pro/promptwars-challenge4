import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/accessibility/route';
import { _resetRateLimitStore } from '@/lib/rateLimit';

function makeRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/accessibility', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('POST /api/accessibility', () => {
  beforeEach(() => {
    _resetRateLimitStore();
  });

  it('returns the zone itself when it already has an accessible entrance', async () => {
    const response = await POST(
      makeRequest(
        { need: 'wheelchair', currentZoneId: 'gate-a-lower', scenarioId: 'normal-flow' },
        { 'x-forwarded-for': 'a11y-client-1' }
      )
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.recommendedZoneId).toBe('gate-a-lower');
  });

  it('redirects to the nearest accessible neighbor when the current zone has no accessible entrance', async () => {
    const response = await POST(
      makeRequest(
        { need: 'wheelchair', currentZoneId: 'gate-b-lower', scenarioId: 'normal-flow' },
        { 'x-forwarded-for': 'a11y-client-2' }
      )
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    // gate-b-lower is not accessible in the mock dataset; its nearest
    // neighbors are gate-a-lower and gate-c-lower, both of which are.
    expect(['gate-a-lower', 'gate-c-lower']).toContain(data.recommendedZoneId);
  });

  it('falls back to a deterministic template (no AI call) when GEMINI_API_KEY is unset', async () => {
    const response = await POST(
      makeRequest(
        { need: 'low-vision', currentZoneId: 'gate-e-upper', scenarioId: 'normal-flow' },
        { 'x-forwarded-for': 'a11y-client-3' }
      )
    );
    const data = await response.json();
    expect(data.source).toBe('fallback-template');
    expect(typeof data.guidance).toBe('string');
    expect(data.guidance.length).toBeGreaterThan(0);
  });

  it('returns 400 for an unknown zone ID', async () => {
    const response = await POST(
      makeRequest(
        { need: 'wheelchair', currentZoneId: 'gate-does-not-exist', scenarioId: 'normal-flow' },
        { 'x-forwarded-for': 'a11y-client-4' }
      )
    );
    expect(response.status).toBe(404);
  });

  it('returns 400 for an invalid accessibility need', async () => {
    const response = await POST(
      makeRequest(
        { need: 'telepathy', currentZoneId: 'gate-a-lower', scenarioId: 'normal-flow' },
        { 'x-forwarded-for': 'a11y-client-5' }
      )
    );
    expect(response.status).toBe(400);
  });
});
