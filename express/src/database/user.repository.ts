import pool from "./pool.js";
import { Role, type UserRecord } from "../modules/auth/auth.types.js";

const RETURNING = `
  RETURNING userId    AS "userid",
            googleId  AS "googleid",
            email,
            username,
            role,
            createdAt AS "createdat",
            lastLogin AS "lastlogin"
`;

/** user_auth.username is VARCHAR(50); the suffix must still fit inside it. */
const USERNAME_MAX = 50;
const SUFFIX_LENGTH = 5;
const UNIQUE_VIOLATION = "23505";

/**
 * Derives a username from the email local part. Restricted to characters that
 * are safe to display and reference, so an address like `a.b+tag@x.com` cannot
 * produce a username that has to be escaped everywhere it is rendered.
 */
function baseUsernameFrom(email: string): string {
  const local = email.split("@")[0] ?? "";
  const cleaned = local.toLowerCase().replace(/[^a-z0-9._-]/g, "");
  const trimmed = cleaned.slice(0, USERNAME_MAX - SUFFIX_LENGTH);
  return trimmed.length >= 2 ? trimmed : "player";
}

/**
 * Creates the user on first sign-in, or refreshes lastLogin on a return visit.
 *
 * Keyed on googleId, not email: Google is the identity provider, and a user who
 * changes their Google email must stay the same account rather than becoming a
 * second one (which would orphan their team membership).
 *
 * `role` is passed in from the ADMIN_EMAILS allow-list and re-applied on every
 * sign-in, so removing an address from the list demotes that account on its
 * next login. It is COALESCEd on insert so the column default still governs
 * when no role is supplied.
 */
export async function upsertGoogleUser(
  googleId: string,
  email: string,
  role: Role
): Promise<UserRecord> {
  const base = baseUsernameFrom(email);

  // UNIQUE(username) can collide with an unrelated account that already took
  // the derived name. Retry with a random suffix rather than failing sign-in;
  // bounded, because an unbounded loop on a persistent conflict would hang.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const username =
      attempt === 0
        ? base
        : `${base}_${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const result = await pool.query<UserRecord>(
        `INSERT INTO user_auth (googleId, email, username, role, lastLogin)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (googleId) DO UPDATE
           SET lastLogin = NOW(),
               email     = EXCLUDED.email,
               role      = EXCLUDED.role
         ${RETURNING};`,
        [googleId, email, username, role]
      );
      return result.rows[0]!;
    } catch (error) {
      const code = (error as { code?: string }).code;
      const isUsernameCollision =
        code === UNIQUE_VIOLATION &&
        String((error as { constraint?: string }).constraint ?? "").includes("username");

      if (!isUsernameCollision) throw error;
    }
  }

  throw new Error(`Could not derive a unique username for ${email}`);
}

export async function findUserById(userId: string): Promise<UserRecord | null> {
  const result = await pool.query<UserRecord>(
    `SELECT userId AS "userid", googleId AS "googleid", email, username, role,
            createdAt AS "createdat", lastLogin AS "lastlogin"
     FROM user_auth WHERE userId = $1;`,
    [userId]
  );
  return result.rows[0] ?? null;
}

export async function listUsers(limit: number, offset: number): Promise<UserRecord[]> {
  const result = await pool.query<UserRecord>(
    `SELECT userId AS "userid", googleId AS "googleid", email, username, role,
            createdAt AS "createdat", lastLogin AS "lastlogin"
     FROM user_auth ORDER BY createdAt DESC LIMIT $1 OFFSET $2;`,
    [limit, offset]
  );
  return result.rows;
}

export async function countUsers(): Promise<number> {
  const result = await pool.query<{ total: string }>(`SELECT COUNT(*) AS total FROM user_auth;`);
  return Number(result.rows[0]?.total ?? 0);
}

export async function updateUserRole(userId: string, role: Role): Promise<UserRecord | null> {
  const result = await pool.query<UserRecord>(
    `UPDATE user_auth SET role = $1 WHERE userId = $2 ${RETURNING};`,
    [role, userId]
  );
  return result.rows[0] ?? null;
}
