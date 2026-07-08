import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, _resetRateLimitStore } from '@/lib/rateLimit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    _resetRateLimitStore();
  });

  it('allows the first request for a fresh key', () => {
    const result = checkRateLimit('client-1', 0, 5);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('blocks once the limit within the window is exceeded', () => {
    for (let i = 0; i < 5; i += 1) {
      checkRateLimit('client-2', 0, 5);
    }
    const result = checkRateLimit('client-2', 0, 5);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('resets the count after the window elapses', () => {
    for (let i = 0; i < 5; i += 1) {
      checkRateLimit('client-3', 0, 5);
    }
    const blocked = checkRateLimit('client-3', 30_000, 5);
    expect(blocked.allowed).toBe(false);

    const afterWindow = checkRateLimit('client-3', 60_001, 5);
    expect(afterWindow.allowed).toBe(true);
  });

  it('tracks separate clients independently', () => {
    for (let i = 0; i < 5; i += 1) {
      checkRateLimit('client-a', 0, 5);
    }
    const clientA = checkRateLimit('client-a', 0, 5);
    const clientB = checkRateLimit('client-b', 0, 5);
    expect(clientA.allowed).toBe(false);
    expect(clientB.allowed).toBe(true);
  });
});
