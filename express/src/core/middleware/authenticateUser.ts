import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../../utils/jwt.js";
import { ApiError } from "../http/ApiError.js";

/** Name of the httpOnly cookie carrying the session JWT. */
export const TOKEN_COOKIE = "token";

/**
 * Rejects any request without a valid session cookie.
 *
 * The token lives in an httpOnly cookie rather than an Authorization header
 * because the SPA never handles it: sign-in is a server-side redirect, so
 * there is nothing for JavaScript to store and nothing for an XSS payload to
 * read.
 */
export function authenticateUser(req: Request, _res: Response, next: NextFunction): void {
  const token: unknown = req.cookies?.[TOKEN_COOKIE];

  if (typeof token !== "string" || token.length === 0) {
    next(ApiError.unauthorized("Authentication required"));
    return;
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    // Which half of a forgery attempt failed (expired vs. bad signature) is
    // withheld deliberately — it is useful only to someone probing.
    next(ApiError.unauthorized("Invalid or expired session"));
  }
}
