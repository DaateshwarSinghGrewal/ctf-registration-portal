import "dotenv/config";
import { z } from "zod";

/**
 * Validated configuration. Imported first by src/index.ts so the process
 * fails fast — before the db pool, redis client or passport strategy read
 * process.env at import time — with one message listing everything missing,
 * rather than surfacing as a confusing runtime error later.
 *
 * The previous DB_* variables are gone: they were required at boot but never
 * read by anything (the pool builds from DATABASE_URL), so the server refused
 * to start over configuration that had no effect.
 */

const csv = (value: string): string[] =>
  value
    .split(",")
    .map((entry) => entry.trim().replace(/\/+$/, ""))
    .filter(Boolean);

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.url("GOOGLE_REDIRECT_URI must be an absolute URL"),

  /**
   * Comma-separated so one deployment can serve the hosted site and a local
   * dev server. The first entry is canonical — it is the post-sign-in
   * redirect target; the rest only widen the CORS allow-list.
   */
  FRONTEND_URL: z.string().min(1).transform(csv).refine((urls) => urls.length > 0, {
    message: "FRONTEND_URL must contain at least one origin",
  }),

  /** 32 chars minimum: a short HS256 secret is brute-forceable offline. */
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),

  /** Absent = no Redis. Rate limiting falls back to in-memory; sockets stay single-node. */
  REDIS_URL: z.string().min(1).optional(),

  COOKIE_DOMAIN: z.string().min(1).optional(),
  COOKIE_SAMESITE: z.enum(["none", "lax", "strict"]).optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const lines = parsed.error.issues.map(
    (issue) => `   • ${issue.path.join(".") || "(root)"}: ${issue.message}`
  );
  console.error(`Invalid environment configuration:\n${lines.join("\n")}`);
  process.exit(1);
}

const raw = parsed.data;
const isProduction = raw.NODE_ENV === "production";

/**
 * When the SPA and the API sit on different domains the session cookie is
 * cross-site, and browsers drop a SameSite=Lax cookie on those requests — so
 * /auth/me would always 401 and sign-in would appear to fail silently.
 * SameSite=None fixes it, and is only honoured on a Secure cookie.
 */
const cookieSameSite = raw.COOKIE_SAMESITE ?? (isProduction ? "none" : "lax");

export const env = {
  nodeEnv: raw.NODE_ENV,
  isProduction,
  port: raw.PORT,

  databaseUrl: raw.DATABASE_URL,

  google: {
    clientId: raw.GOOGLE_CLIENT_ID,
    clientSecret: raw.GOOGLE_CLIENT_SECRET,
    redirectUri: raw.GOOGLE_REDIRECT_URI,
  },

  /** Canonical site origin — the post-sign-in redirect target. */
  frontendUrl: raw.FRONTEND_URL[0]!,
  /** Every origin allowed through CORS and the Socket.IO handshake. */
  frontendUrls: raw.FRONTEND_URL,

  jwtSecret: raw.JWT_SECRET,

  redisUrl: raw.REDIS_URL,

  cookie: {
    domain: raw.COOKIE_DOMAIN,
    sameSite: cookieSameSite,
    // SameSite=None is ignored by browsers unless the cookie is also Secure.
    secure: cookieSameSite === "none" || isProduction,
  },
} as const;

/** localhost on any port, over http or https, including the IPv6 loopback. */
const LOOPBACK_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

/**
 * Decides whether a browser origin may call the API.
 *
 * Production is strict: only the origins in FRONTEND_URL.
 *
 * Development additionally accepts any loopback origin, whatever the port. Vite
 * silently moves to 5174 when 5173 is taken ("Port 5173 is in use, trying
 * another one…"), and with a fixed allow-list every request from the new port is
 * CORS-blocked. The browser reports a blocked request identically to an
 * unreachable one, so this surfaces as "cannot reach the server" while the
 * server is plainly running — which sends you debugging the wrong thing.
 *
 * A missing Origin header is allowed through: that is a same-origin navigation,
 * curl, or a health probe, none of which the browser applies CORS to.
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  if (env.frontendUrls.includes(origin)) return true;
  return !env.isProduction && LOOPBACK_ORIGIN.test(origin);
}
