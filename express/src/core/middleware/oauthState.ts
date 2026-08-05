import crypto from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { env, isOriginAllowed } from "../../config/env.js";

/**
 * Stateless CSRF protection for the OAuth callback.
 *
 * Without a `state` nonce, `GET /auth/google/callback` accepts any `code` an
 * attacker can get a victim's browser to load — a login-CSRF that signs the
 * victim into the attacker's Google account. Passport's built-in `state: true`
 * solves this with a session store; that would mean adding express-session
 * plus a Redis store to maintain, for one nonce.
 *
 * Instead the nonce is held in a short-lived httpOnly cookie and compared to
 * the `state` Google echoes back. The cookie is the secret and the query
 * parameter is the claim, so an attacker who can supply neither cannot forge
 * the pair.
 *
 * SameSite must be `lax`, not `strict`: the callback arrives as a cross-site
 * top-level redirect from Google, and a strict cookie is withheld there —
 * which would make every sign-in fail the check.
 */

const STATE_COOKIE = "oauth_state";
/** Records which site origin started the flow, so the callback returns there. */
export const ORIGIN_COOKIE = "oauth_origin";
const STATE_TTL_MS = 10 * 60 * 1000;

const STATE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.cookie.secure,
  sameSite: "lax",
  path: "/auth",
  domain: env.cookie.domain,
} as const;

/**
 * The origin of the page that started sign-in, if it is one we allow.
 *
 * Read from Referer, not Origin: a top-level GET navigation — which is what
 * sign-in is — generally carries no Origin header.
 *
 * Every candidate goes through isOriginAllowed, so this can only ever name an
 * origin the API already trusts. Skipping that check would turn the OAuth
 * callback into an open redirect.
 */
function callerOrigin(req: Request): string | null {
  const referer = req.get("referer");
  if (!referer) return null;

  try {
    const { origin } = new URL(referer);
    return isOriginAllowed(origin) ? origin : null;
  } catch {
    return null;
  }
}

/**
 * Issues the nonce and hands it to Passport as the `state` parameter.
 *
 * Passport reads options from the handler it is given, so the value is stashed
 * on the request for the authenticate call that follows to pick up.
 *
 * The caller's origin is recorded alongside it. Without that, the callback can
 * only redirect to the single canonical FRONTEND_URL — so signing in from a Vite
 * dev server that had to move to another port would deposit the user on a port
 * with nothing serving it.
 */
export function issueOAuthState(req: Request, res: Response, next: NextFunction): void {
  const nonce = crypto.randomBytes(32).toString("base64url");

  res.cookie(STATE_COOKIE, nonce, { ...STATE_COOKIE_OPTIONS, maxAge: STATE_TTL_MS });

  const origin = callerOrigin(req);
  if (origin) {
    res.cookie(ORIGIN_COOKIE, origin, { ...STATE_COOKIE_OPTIONS, maxAge: STATE_TTL_MS });
  }

  req.oauthState = nonce;

  next();
}

/**
 * Verifies the echoed `state` against the cookie, then clears it so a nonce is
 * single-use. On mismatch the browser is redirected to the SPA with an error —
 * the callback is a top-level navigation, so a JSON body would render as raw
 * text in the address bar.
 */
export function verifyOAuthState(
  onFailure: (req: Request, res: Response, message: string) => void
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const expected: unknown = req.cookies?.[STATE_COOKIE];
    const received = req.query.state;

    res.clearCookie(STATE_COOKIE, STATE_COOKIE_OPTIONS);

    if (
      typeof expected !== "string" ||
      typeof received !== "string" ||
      expected.length === 0 ||
      // Constant-time compare: a length-independent early-exit comparison on a
      // value an attacker can vary is a (small) oracle.
      expected.length !== received.length ||
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received))
    ) {
      onFailure(req, res, "Sign-in session expired or was tampered with. Please try again.");
      return;
    }

    next();
  };
}

declare global {
  namespace Express {
    interface Request {
      /** Set by issueOAuthState for the authenticate handler that follows. */
      oauthState?: string;
    }
  }
}
