export enum Role {
  PLAYER = "PLAYER",
  ADMIN = "ADMIN",
}

/**
 * Claims carried by the session JWT. Deliberately minimal: anything mutable
 * (username, profile completeness) is read from the database per request, so a
 * change takes effect immediately rather than waiting out the token lifetime.
 */
export interface JwtPayload {
  /** user_auth.userid — a UUID. */
  userId: string;
  email: string;
  role: Role;
}

/**
 * Row shape of `user_auth`.
 *
 * Its columns were declared unquoted, so Postgres folded them to lowercase and
 * returns lowercase keys — hence `userid`, not `userId`. Queries against this
 * table must not quote these identifiers.
 *
 * `role` is now non-optional: migration 001 declares the column that the live
 * database already had, so it is always present.
 */
export interface UserRecord {
  userid: string;
  googleid: string;
  email: string;
  username: string;
  role: Role;
  createdat: Date;
  lastlogin: Date | null;
}

/** The subset of a verified Google profile this app consumes. */
export interface GoogleProfile {
  googleId: string;
  email: string;
}

/** Shape returned by GET /auth/me. */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  username: string;
  role: Role;
  /** Lets the client gate team actions behind a completed registration. */
  hasProfile: boolean;
}
