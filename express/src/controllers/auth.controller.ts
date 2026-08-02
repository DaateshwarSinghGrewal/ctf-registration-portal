import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { findOrCreateUserFromGoogle } from "../services/auth.service.js";
import { getUserById } from "../services/admin.service.js";
import { signAccessToken } from "../utils/jwt.js";
import { Role } from "../types/auth.types.js";
import type { GoogleProfilePayload, JwtPayload } from "../types/auth.types.js";

const TOKEN_COOKIE = "token";
const COOKIE_MAX_AGE_MS = 5 * 60 * 60 * 1000;

/**
 * Attributes shared by setting and clearing the session cookie. A browser
 * only removes a cookie when these match the ones it was stored with, so
 * they must not drift apart between googleCallback and logout.
 */
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
  domain: env.cookieDomain,
  path: "/",
} as const;

/**
 * Builds an absolute URL on the frontend origin. The OAuth callback is a
 * top-level browser navigation, so failures have to come back as a redirect
 * the SPA can render — a JSON body would be shown to the user as raw text.
 */
function frontendUrl(path: string, params?: Record<string, string>): string {
  const url = new URL(path, env.frontendUrl);
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

export async function googleCallback(req: Request, res: Response): Promise<void> {
  try {
    const profile = req.user as unknown as GoogleProfilePayload | undefined;

    if (!profile?.googleId || !profile?.email) {
      res.redirect(frontendUrl("/auth", { error: "Google authentication failed" }));
      return;
    }

    const user = await findOrCreateUserFromGoogle(profile);

    const payload: JwtPayload = {
      userId: user.userid,
      email: user.email,
      // schema.sql has no `role` column yet, so the upsert cannot return one.
      // Default to PLAYER rather than signing an undefined claim — that would
      // make requireAdmin compare against undefined.
      role: (user.role as Role | undefined) ?? Role.PLAYER,
    };

    // lastLogin is refreshed by the upsert itself — no extra write needed.
    const token = signAccessToken(payload);

    res.cookie(TOKEN_COOKIE, token, {
      ...COOKIE_OPTIONS,
      maxAge: COOKIE_MAX_AGE_MS,
    });

    res.redirect(frontendUrl("/team"));
  } catch (error) {
    console.error("Google callback error:", error);
    res.redirect(frontendUrl("/auth", { error: "Sign-in failed. Please try again." }));
  }
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie(TOKEN_COOKIE, COOKIE_OPTIONS);

  res.status(200).json({ message: "Logged out" });
}

/**
 * Current-user endpoint the frontend uses to rehydrate auth state on load
 * and after a page refresh. The JWT carries only id/email/role, so the
 * display name is read from `user_auth`; if that read fails the token claims
 * are still returned rather than logging a valid session out.
 */
export async function me(req: Request, res: Response): Promise<void> {
  const claims = req.user as JwtPayload;

  try {
    const record = await getUserById(claims.userId);

    res.status(200).json({
      user: {
        userId: claims.userId,
        email: claims.email,
        role: claims.role,
        username: record?.username ?? claims.email,
      },
    });
  } catch (error) {
    console.error("me error:", error);
    res.status(200).json({ user: claims });
  }
}
