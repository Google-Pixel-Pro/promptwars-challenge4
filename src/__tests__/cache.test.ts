import { describe, it, expect, beforeEach } from 'vitest';
import { getCached, setCached, cacheKeyFromParts, _clearCache } from '@/lib/cache';

describe('cache', () => {
  beforeEach(() => {
    _clearCache();
  });

  it('returns undefined for a key that was never set', () => {
    expect(getCached('missing')).toBeUndefined();
  });

  it('returns the stored value before expiry', () => {
    setCached('key', { hello: 'world' }, 1000, 0);
    expect(getCached('key', 500)).toEqual({ hello: 'world' });
  });

  it('returns undefined after the TTL has elapsed', () => {
    setCached('key', 'value', 1000, 0);
    expect(getCached('key', 1500)).toBeUndefined();
  });

  it('evicts the entry once expired so it does not linger in the store', () => {
    setCached('key', 'value', 1000, 0);
    getCached('key', 1500); // triggers eviction
    expect(getCached('key', 1500)).toBeUndefined();
  });

  it('cacheKeyFromParts joins parts deterministically', () => {
    expect(cacheKeyFromParts('advisor', 'normal-flow', '')).toBe('advisor::normal-flow::');
    expect(cacheKeyFromParts('a', 'b')).not.toBe(cacheKeyFromParts('a', 'b', 'c'));
  });
});
