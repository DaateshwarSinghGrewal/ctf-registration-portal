import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "../core/logger.js";
import { closePool, pool, withTransaction } from "./pool.js";

/**
 * Forward-only migration runner.
 *
 * Replaces the previous `migrate.ts`, which re-executed one schema.sql on
 * every run with no record of what had been applied — so the only safe change
 * was one that happened to be idempotent, and the deployed database silently
 * drifted from the file (user_auth.role existed in Neon but not in schema.sql).
 *
 * Each .sql file in ./migrations runs once, in filename order, inside a
 * transaction, and is recorded in schema_migrations. A failure rolls that file
 * back and stops — leaving the database on the last complete migration rather
 * than half-way through one.
 *
 * It resolves migrations relative to this module, not the working directory,
 * so `npm run migrate` behaves identically from any cwd. The old script broke
 * exactly here: it called dotenv.config() against the cwd, and the documented
 * invocation ran it from a directory with no .env, so DATABASE_URL was unset
 * and it silently tried to reach localhost.
 */

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "migrations");

async function ensureLedger(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      appliedAt  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function appliedMigrations(): Promise<Set<string>> {
  const result = await pool.query<{ name: string }>(`SELECT name FROM schema_migrations`);
  return new Set(result.rows.map((row) => row.name));
}

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

export async function runMigrations(): Promise<void> {
  await ensureLedger();
  const applied = await appliedMigrations();
  const pending = migrationFiles().filter((name) => !applied.has(name));

  if (pending.length === 0) {
    logger.info("Migrations up to date");
    return;
  }

  for (const name of pending) {
    const sql = readFileSync(join(MIGRATIONS_DIR, name), "utf8");
    logger.info(`Applying migration ${name}`);

    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query(`INSERT INTO schema_migrations (name) VALUES ($1)`, [name]);
    });
  }

  logger.info(`Applied ${pending.length} migration(s)`);
}

/**
 * Only self-executes when run directly (`npm run migrate`), so the server can
 * import runMigrations without triggering it as an import side effect.
 */
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runMigrations()
    .then(() => closePool())
    .then(() => process.exit(0))
    .catch(async (error) => {
      logger.error("Migration failed", error);
      await closePool().catch(() => undefined);
      process.exit(1);
    });
}
