import { Pool, type PoolClient } from "pg";
import { env } from "../config/env.js";
import { logger } from "../core/logger.js";


const needsSsl = env.databaseUrl.includes("sslmode=require");

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: needsSsl ? true : false,
  max: 10,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
});


pool.on("error", (error) => {
  logger.error("Idle database client error", error);
});


export async function assertDatabaseReachable(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    logger.info("Database connected");
  } finally {
    client.release();
  }
}


export async function withTransaction<T>( work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {

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
