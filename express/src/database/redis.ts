import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "../core/logger.js";

/**
 * Redis is optional.
 *
 * The previous client connected to 127.0.0.1:6379 unconditionally at import
 * time and logged every reconnect attempt, so with no Redis running the boot
 * log filled with ECONNREFUSED and buried everything else. Here it is created
 * only when REDIS_URL is configured, and connection failures are reported
 * once instead of on every retry.
 *
 * Callers must treat `null` as "no Redis": the rate limiter falls back to an
 * in-memory window and Socket.IO stays single-node. Both are correct for one
 * instance; Redis is what makes them correct across several.
 */

function create(): Redis | null {
  if (!env.redisUrl) {
    logger.info("REDIS_URL not set — in-memory rate limiting, single-node sockets");
    return null;
  }

  const client = new Redis(env.redisUrl, {
    // Fail fast rather than queueing commands forever behind a dead server:
    // a queued command would hold the HTTP request open until it timed out.
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    retryStrategy: (attempt) => Math.min(attempt * 500, 10_000),
  });

  client.on("ready", () => logger.info("Redis connected"));

  let errorReported = false;
  client.on("error", (error) => {
    if (errorReported) return;
    errorReported = true;
    logger.warn(`Redis unavailable — degrading gracefully: ${(error as Error).message}`);
  });
  client.on("ready", () => {
    errorReported = false;
  });

  return client;
}

export const redis: Redis | null = create();

export async function closeRedis(): Promise<void> {
  await redis?.quit().catch(() => {
    // Already disconnected — nothing to release.
  });
}
