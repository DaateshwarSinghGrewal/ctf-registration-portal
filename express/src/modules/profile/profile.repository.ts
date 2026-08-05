import pool from "../../database/pool.js";
import type { ProfileInput, ProfileRecord } from "./profile.types.js";

const COLUMNS = `
  userId          AS "userid",
  fullName        AS "fullname",
  phone,
  discordUsername AS "discordusername",
  year,
  branch,
  rollNumber      AS "rollnumber",
  createdAt       AS "createdat",
  updatedAt       AS "updatedat"
`;

export async function findProfile(userId: string): Promise<ProfileRecord | null> {
  const result = await pool.query<ProfileRecord>(
    `SELECT ${COLUMNS} FROM player_profiles WHERE userId = $1;`,
    [userId]
  );
  return result.rows[0] ?? null;
}

/**
 * Existence check for the /auth/me gate. Kept separate from findProfile so the
 * common "do they have one?" question does not pull six columns it discards.
 */
export async function hasProfile(userId: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM player_profiles WHERE userId = $1 LIMIT 1;`,
    [userId]
  );
  return result.rowCount === 1;
}

/**
 * Creates or replaces a profile. Upsert rather than separate create/update
 * endpoints: the client always submits the whole form, so there is one
 * meaningful operation and no way for the two to disagree.
 */
export async function upsertProfile(
  userId: string,
  input: ProfileInput
): Promise<ProfileRecord> {
  const result = await pool.query<ProfileRecord>(
    `INSERT INTO player_profiles
       (userId, fullName, phone, discordUsername, year, branch, rollNumber)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (userId) DO UPDATE
       SET fullName        = EXCLUDED.fullName,
           phone           = EXCLUDED.phone,
           discordUsername = EXCLUDED.discordUsername,
           year            = EXCLUDED.year,
           branch          = EXCLUDED.branch,
           rollNumber      = EXCLUDED.rollNumber,
           updatedAt       = CURRENT_TIMESTAMP
     RETURNING ${COLUMNS};`,
    [
      userId,
      input.fullName,
      input.phone,
      input.discordUsername,
      input.year,
      input.branch,
      input.rollNumber,
    ]
  );
  return result.rows[0]!;
}
