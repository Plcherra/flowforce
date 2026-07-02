type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 20;

export type BillingRateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

export function checkBillingRouteRateLimit(
  routeKey: string,
  actorKey: string,
  now = Date.now(),
): BillingRateLimitResult {
  const bucketKey = `${routeKey}:${actorKey}`;
  const existing = buckets.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }

  if (existing.count >= MAX_REQUESTS) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  buckets.set(bucketKey, existing);
  return { ok: true };
}
