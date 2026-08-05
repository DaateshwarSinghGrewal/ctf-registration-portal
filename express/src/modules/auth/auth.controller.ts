import type { Request, Response } from "express";
import { env, isOriginAllowed } from "../../config/env.js";
import { ApiError } from "../../core/http/ApiError.js";
import { ok } from "../../core/http/respond.js";
import { TOKEN_COOKIE } from "../../core/middleware/authenticateUser.js";
import { ORIGIN_COOKIE } from "../../core/middleware/oauthState.js";
import { logger } from "../../core/logger.js";
import { recordAudit } from "../audit/audit.service.js";
import { AuditAction } from "../audit/audit.types.js";
import { signAccessToken } from "../../utils/jwt.js";
import { describeUser, findOrCreateUserFromGoogle } from "./auth.service.js";
import type { GoogleProfile, JwtPayload } from "./auth.types.js";

const COOKIE_MAX_AGE_MS = 5 * 60 * 60 * 1000;

/**
 * Attributes shared by setting and clearing the session cookie.
 *
 * A browser only removes a cookie when these match the ones it was stored with,
 * so they must not drift apart between the callback and logout — otherwise
 * "sign out" appears to work while the cookie survives.
 */
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.cookie.secure,
  sameSite: env.cookie.sameSite,
  domain: env.cookie.domain,
  path: "/",
} as const;

/**
 * Where to send the browser back to.
 *
 * Prefers the origin that started sign-in, recorded by issueOAuthState, so a
 * dev server running on a non-default port gets the user back rather than
 * bouncing them to a port with nothing on it. Re-validated here rather than
 * trusted from the cookie, so a tampered value cannot redirect off-site.
 *
 * Falls back to the canonical FRONTEND_URL, which is what production uses.
 */
function siteOrigin(req: Request): string {
  const recorded: unknown = req.cookies?.[ORIGIN_COOKIE];

  if (typeof recorded === "string" && isOriginAllowed(recorded)) {
    return recorded;
  }

  return env.frontendUrl;
}

/**
 * Builds an absolute URL on the frontend origin.
 *
 * The OAuth callback is a top-level browser navigation, so a failure has to come
 * back as a redirect the SPA can render — a JSON body would be shown to the user
 * as raw text on the API's domain.
 */
export function frontendUrl(
  req: Request,
  path: string,
  params?: Record<string, string>
): string {
  const url = new URL(path, siteOrigin(req));
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

/** Shared failure exit for the whole OAuth flow. */
export function redirectWithError(req: Request, res: Response, message: string): void {
  res.clearCookie(ORIGIN_COOKIE, { path: "/auth", domain: env.cookie.domain });
  res.redirect(frontendUrl(req, "/auth", { error: message }));
}

export async function googleCallback(req: Request, res: Response): Promise<void> {
  const profile = req.user as unknown as GoogleProfile | undefined;

  if (!profile?.googleId || !profile.email) {
    redirectWithError(req, res, "Google authentication failed. Please try again.");
    return;
  }

  try {
    const user = await findOrCreateUserFromGoogle(profile);

    const payload: JwtPayload = {
      userId: user.userid,
      email: user.email,
      role: user.role,
    };

    // lastLogin is refreshed by the upsert itself — no extra write needed.
    res.cookie(TOKEN_COOKIE, signAccessToken(payload), {
      ...COOKIE_OPTIONS,
      maxAge: COOKIE_MAX_AGE_MS,
    });

    await recordAudit({
      actorId: user.userid,
      action: AuditAction.USER_SIGNED_IN,
      targetType: "user",
      targetId: user.userid,
      ipAddress: req.ip ?? null,
    });

    // The recorded origin has served its purpose; a stale one must not steer a
    // later sign-in from a different port.
    const target = frontendUrl(req, "/team");
    res.clearCookie(ORIGIN_COOKIE, { path: "/auth", domain: env.cookie.domain });
    res.redirect(target);
  } catch (error) {
    // Handled here rather than delegated to errorHandler: that would send JSON,
    // and this response is a browser navigation.
    logger.error("Google callback failed", error);
    redirectWithError(req, res, "Sign-in failed. Please try again.");
  }
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie(TOKEN_COOKIE, COOKIE_OPTIONS);
  ok(res, null, "Logged out");
}

/**
 * Current-user endpoint the SPA uses to rehydrate auth state on load and after
 * a refresh.
 *
 * Reads the database rather than echoing the token claims, so a role change or
 * a newly completed profile is reflected at once. A missing row means the
 * account was deleted while its token was still valid — that is a 401, not an
 * empty user.
 */
export async function me(req: Request, res: Response): Promise<void> {
  const user = await describeUser(req.user!.userId);

  if (!user) {
    res.clearCookie(TOKEN_COOKIE, COOKIE_OPTIONS);
    throw ApiError.unauthorized("Your account no longer exists");
  }

  // Kept as { user } at the top level: the existing SPA reads `payload.user`
  // (client/src/api/auth.js), and it is also nested under `data` for the
  // envelope every other endpoint uses.
  res.status(200).json({ success: true, message: "OK", data: { user }, user });
}
