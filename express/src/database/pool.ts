import { Pool, type PoolClient } from "pg";
import * as dns from "node:dns";
import * as net from "node:net";
import { env } from "../config/env.js";
import { logger } from "../core/logger.js";

/**
 * Prefer IPv4 and disable happy-eyeballs. Neon resolves to several addresses,
 * and networks that drop IPv6 surface this as an ENETUNREACH/ETIMEDOUT
 * AggregateError partway through a query rather than a clean failure.
 */
dns.setDefaultResultOrder("ipv4first");
net.setDefaultAutoSelectFamily?.(false);

export const pool = new Pool({
  connectionString: env.databaseUrl,
  // Neon presents a chain the pg default does not accept; the connection is
  // still TLS-encrypted.
  ssl: { rejectUnauthorized: false },
  max: 10,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
});

/**
 * An idle client erroring — Neon reaping an idle connection, a network blip —
 * emits on the pool. Without this listener that is an unhandled 'error' event,
 * which terminates the process.
 */
pool.on("error", (error) => {
  logger.error("Idle database client error", error);
});

/**
 * Verifies connectivity during boot. The bootstrap awaits this so the process
 * refuses to accept traffic it cannot serve; the previous version fired it off
 * unawaited and only logged, leaving the API listening but failing every
 * request.
 */
export async function assertDatabaseReachable(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    logger.info("Database connected");
  } finally {
    client.release();
  }
}

/**
 * Runs `work` in a transaction: commit on return, rollback on throw.
 *
 * Every multi-statement mutation uses this. Party membership changes read
 * state and then write based on what they read, so without a transaction two
 * concurrent requests interleave and can leave a party leaderless or over
 * capacity.
 */
export async function withTransaction<T>(
  work: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {
      // Rollback can itself fail if the connection died; the original error
      // is the one worth propagating.
    });
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}

export default pool;
