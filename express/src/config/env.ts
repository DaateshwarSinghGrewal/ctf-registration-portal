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

const nodeEnv = process.env.NODE_ENV ?? "development";

/**
 * FRONTEND_URL accepts a comma-separated list so one deployment can serve
 * both the hosted site and a local dev server. The first entry is canonical:
 * it is where the OAuth callback redirects. The rest only widen CORS.
 */
const frontendUrls = process.env
  .FRONTEND_URL!.split(",")
  .map((url) => url.trim().replace(/\/+$/, ""))
  .filter(Boolean);

/**
 * When the site and the API are on different domains (e.g. Vercel + a
 * separate API host), the session cookie is cross-site: browsers drop a
 * SameSite=Lax cookie on those requests, so /auth/me would always 401 and
 * sign-in would appear to silently fail. SameSite=None fixes that, and
 * browsers only honour it on a Secure (HTTPS) cookie.
 *
 * Defaults to none+secure in production and lax in development; override
 * with COOKIE_SAMESITE if the API is served from the same domain.
 */
const cookieSameSite = (process.env.COOKIE_SAMESITE ??
  (nodeEnv === "production" ? "none" : "lax")) as "none" | "lax" | "strict";

export const env = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv,

  googleClientId: process.env.GOOGLE_CLIENT_ID!,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI!,

  /** Canonical site origin — the post-sign-in redirect target. */
  frontendUrl: frontendUrls[0]!,
  /** Every origin allowed through CORS. */
  frontendUrls,

  jwtSecret: process.env.JWT_SECRET!,

  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  cookieSameSite,
  // SameSite=None is ignored by browsers unless the cookie is also Secure.
  cookieSecure: cookieSameSite === "none" || nodeEnv === "production",

  databaseUrl: process.env.DATABASE_URL!,

  // Optional: unused by the pool, kept so nothing importing them breaks.
  dbUser: process.env.DB_USER,
  dbHost: process.env.DB_HOST,
  dbName: process.env.DB_NAME,
  dbPassword: process.env.DB_PASSWORD,
  dbPort: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
} as const;
