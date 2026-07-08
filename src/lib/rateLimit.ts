/**
 * Simple fixed-window in-memory rate limiter, keyed per client + endpoint.
 *
 * Known limitation (documented on purpose, not hidden): this resets on
 * server restart and does not share state across multiple instances. That is
 * an acceptable tradeoff for a single-instance demo deployment. A production
 * multi-instance deployment would swap this module for a shared store (e.g.
 * Redis `INCR` + `EXPIRE`) behind the same two-function interface, so nothing
 * else in the codebase would need to change.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  now: number = Date.now(),
  maxRequests: number = MAX_REQUESTS_PER_WINDOW
): RateLimitResult {
  const existing = buckets.get(key);

  if (!existing || now > existing.resetAt) {
    const resetAt = now + WINDOW_MS;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  if (existing.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: maxRequests - existing.count, resetAt: existing.resetAt };
}

/** Exposed for tests only, to avoid state leaking between test cases. */
export function _resetRateLimitStore(): void {
  buckets.clear();
}
