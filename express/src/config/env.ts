import "dotenv/config";

/**
 * DATABASE_URL replaces the individual DB_* vars here because that is what
 * the connection pool actually reads (shared/db/pg.ts builds the Pool from a
 * connectionString). The DB_* vars were required but never consumed, so the
 * server refused to boot over unused config while leaving the one variable
 * that matters unvalidated. They remain exported below for compatibility.
 */
const required = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "FRONTEND_URL",
  "JWT_SECRET",
  "DATABASE_URL",
] as const;

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(
    `❌  Missing required environment variables:\n${missing.map((k) => `   • ${k}`).join("\n")}`
  );
  process.exit(1);
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? "development",

  googleClientId: process.env.GOOGLE_CLIENT_ID!,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI!,

  frontendUrl: process.env.FRONTEND_URL!,

  jwtSecret: process.env.JWT_SECRET!,

  cookieDomain: process.env.COOKIE_DOMAIN || undefined,

  databaseUrl: process.env.DATABASE_URL!,

  // Optional: unused by the pool, kept so nothing importing them breaks.
  dbUser: process.env.DB_USER,
  dbHost: process.env.DB_HOST,
  dbName: process.env.DB_NAME,
  dbPassword: process.env.DB_PASSWORD,
  dbPort: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
} as const;
