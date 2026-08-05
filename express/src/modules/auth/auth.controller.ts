import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { ApiError } from "../../core/http/ApiError.js";
import { ok } from "../../core/http/respond.js";
import { TOKEN_COOKIE } from "../../core/middleware/authenticateUser.js";
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
 * Builds an absolute URL on the frontend origin.
 *
 * The OAuth callback is a top-level browser navigation, so a failure has to come
 * back as a redirect the SPA can render — a JSON body would be shown to the user
 * as raw text on the API's domain.
 */
export function frontendUrl(path: string, params?: Record<string, string>): string {
  const url = new URL(path, env.frontendUrl);
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

/** Shared failure exit for the whole OAuth flow. */
export function redirectWithError(res: Response, message: string): void {
  res.redirect(frontendUrl("/auth", { error: message }));
}

export async function googleCallback(req: Request, res: Response): Promise<void> {
  const profile = req.user as unknown as GoogleProfile | undefined;

  if (!profile?.googleId || !profile.email) {
    redirectWithError(res, "Google authentication failed. Please try again.");
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

    res.redirect(frontendUrl("/team"));
  } catch (error) {
    // Handled here rather than delegated to errorHandler: that would send JSON,
    // and this response is a browser navigation.
    logger.error("Google callback failed", error);
    redirectWithError(res, "Sign-in failed. Please try again.");
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
