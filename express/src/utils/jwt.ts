import jwt, { type Algorithm } from "jsonwebtoken";
import { env } from "../config/env.js";
import { Role, type JwtPayload } from "../modules/auth/auth.types.js";

/**
 * The algorithm is pinned on both sign and verify. Without an explicit
 * `algorithms` allow-list on verify, a token declaring `alg: none` would be
 * accepted, which is a complete authentication bypass.
 */
const ALGORITHM: Algorithm = "HS256";
const EXPIRES_IN = "5h";

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(
    { userId: payload.userId, email: payload.email, role: payload.role },
    env.jwtSecret,
    { algorithm: ALGORITHM, expiresIn: EXPIRES_IN }
  );
}

/**
 * Verifies a token and returns its claims. Throws when the token is expired,
 * tampered with, or structurally not one of ours — callers translate that into
 * a 401.
 *
 * The claim check matters: `jwt.verify` only proves the signature, so a token
 * signed with a valid secret but a malformed body would otherwise flow through
 * as a `req.user` with undefined fields, and `requireAdmin` would compare a
 * role that is not a Role.
 */
export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.jwtSecret, { algorithms: [ALGORITHM] });

  if (typeof decoded === "string") {
    throw new Error("Token payload is not an object");
  }

  const { userId, email, role } = decoded as Record<string, unknown>;

  if (typeof userId !== "string" || typeof email !== "string") {
    throw new Error("Token is missing required claims");
  }

  if (role !== Role.PLAYER && role !== Role.ADMIN) {
    throw new Error("Token carries an unknown role");
  }

  return { userId, email, role };
}
