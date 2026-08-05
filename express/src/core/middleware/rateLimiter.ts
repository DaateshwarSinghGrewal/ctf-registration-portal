import type { NextFunction, Request, RequestHandler, Response } from "express";
import { redis } from "../../database/redis.js";
import { ApiError } from "../http/ApiError.js";
import { logger } from "../logger.js";

/**
 * Sliding-window rate limiter, Redis-backed when available.
 *
 * Two fixes over the previous version:
 *  - it keyed on `req.user?.id`, but the JWT claim is `userId`, so every
 *    authenticated caller silently fell back to IP — and everyone behind one
 *    NAT shared a single budget.
 *  - Redis was a hard dependency. It is now optional: with no REDIS_URL the
 *    window is kept in memory, which is correct for a single instance. Run
 *    more than one and you need Redis, or each instance enforces its own quota.
 */

interface RateLimitOptions {
  windowMs: number;
  max: number;
  /** Namespaces the counter so separate limiters cannot consume each other's budget. */
  keyPrefix: string;
  message?: string;
}

/** Timestamps of recent hits per key. Trimmed on read; no separate sweep needed. */
const memoryWindows = new Map<string, number[]>();

function countInMemory(key: string, windowStart: number, now: number): number {
  const hits = (memoryWindows.get(key) ?? []).filter((at) => at > windowStart);
  hits.push(now);
  memoryWindows.set(key, hits);
  // Excludes the hit just recorded, matching the Redis branch's semantics.
  return hits.length - 1;
}

async function countInRedis(
  key: string,
  windowStart: number,
  now: number,
  windowMs: number
): Promise<number> {
  const results = await redis!
    .multi()
    .zremrangebyscore(key, 0, windowStart)
    .zcard(key)
    // A unique member per hit — using the timestamp alone silently collapses
    // two requests landing in the same millisecond into one.
    .zadd(key, now, `${now}:${Math.random().toString(36).slice(2, 8)}`)
    .pexpire(key, windowMs)
    .exec();

  return (results?.[1]?.[1] as number | undefined) ?? 0;
}

export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const { windowMs, max, keyPrefix, message = "Too many requests. Please slow down." } = options;
  const retryAfterSeconds = Math.ceil(windowMs / 1000);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Per-user when signed in, per-IP otherwise: a shared IP must not let one
    // account exhaust everyone else's budget.
    const identity = req.user?.userId ?? req.ip ?? "unknown";
    const key = `rl:${keyPrefix}:${identity}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    let used: number;
    try {
      used = redis
        ? await countInRedis(key, windowStart, now, windowMs)
        : countInMemory(key, windowStart, now);
    } catch (error) {
      // Fail open: a Redis outage must not take down registration. The
      // trade-off is explicit — availability over a temporarily unenforced cap.
      logger.warn(`Rate limiter unavailable, allowing request: ${(error as Error).message}`);
      next();
      return;
    }

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - used - 1));

    if (used >= max) {
      res.setHeader("Retry-After", retryAfterSeconds);
      next(ApiError.tooManyRequests(message));
      return;
    }

    next();
  };
}
