/**
 * Minimal TTL cache. Its job is efficiency, not correctness: identical
 * stadium context requested twice within the TTL window (e.g. a dashboard
 * auto-refresh, or two stewards opening the same scenario) reuses one Gemini
 * call instead of paying for and waiting on a duplicate.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 30_000;

export function getCached<T>(key: string, now: number = Date.now()): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (now > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function setCached<T>(
  key: string,
  value: T,
  ttlMs: number = DEFAULT_TTL_MS,
  now: number = Date.now()
): void {
  store.set(key, { value, expiresAt: now + ttlMs });
}

export function cacheKeyFromParts(...parts: string[]): string {
  return parts.join('::');
}

/** Exposed for tests only, to avoid state leaking between test cases. */
export function _clearCache(): void {
  store.clear();
}
