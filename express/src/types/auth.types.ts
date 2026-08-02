export enum Role {
  PLAYER = "PLAYER",
  ADMIN = "ADMIN",
}

export interface JwtPayload {
  /** user_auth.userid — a UUID (see shared/db/schema.sql). */
  userId: string;
  email: string;
  role: Role;
}

/**
 * Row shape of the `user_auth` table.
 *
 * schema.sql declares its columns unquoted, so Postgres folds them to
 * lowercase and `SELECT *` returns lowercase keys — hence `userid`, not
 * `userId`. Queries must therefore not quote these identifiers.
 *
 * `role` is optional because schema.sql has no `role` column yet, even
 * though the admin routes and JWT depend on one.
 */
export interface UserAuthRecord {
  userid: string;
  googleid: string;
  email: string;
  username: string;
  createdat: Date;
  lastlogin: Date | null;
  role?: string;
}

export interface GoogleProfilePayload {
  googleId: string;
  email: string;
  displayName: string;
}
