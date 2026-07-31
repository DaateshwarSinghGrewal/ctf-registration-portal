import pool from "../../../shared/db/pg.js";
import type { UserAuthRecord } from "../types/auth.types.js";
import { Role } from "../types/auth.types.js";

// Identifiers are unquoted to match schema.sql, where the columns were
// declared unquoted and therefore folded to lowercase by Postgres.
// `userId` values are UUIDs, so they are passed through as strings.

export async function getAllUsers(): Promise<UserAuthRecord[]> {
  const result = await pool.query<UserAuthRecord>(
    `SELECT * FROM user_auth ORDER BY userid ASC`
  );
  return result.rows;
}

export async function getUserById(userId: string): Promise<UserAuthRecord | null> {
  const result = await pool.query<UserAuthRecord>(
    `SELECT * FROM user_auth WHERE userid = $1 LIMIT 1`,
    [userId]
  );
  return result.rows[0] ?? null;
}

export async function updateUserRole(
  userId: string,
  role: Role
): Promise<UserAuthRecord | null> {
  const result = await pool.query<UserAuthRecord>(
    `UPDATE user_auth SET role = $1 WHERE userid = $2 RETURNING *`,
    [role, userId]
  );
  return result.rows[0] ?? null;
}

export async function forceDeleteParty(partyId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM parties WHERE id = $1`,
    [partyId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function forceRemovePartyMember(
  partyId: string,
  userId: string
): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM party_members WHERE partyid = $1 AND userid = $2`,
    [partyId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}
