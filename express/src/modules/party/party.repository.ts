import type { PoolClient } from "pg";
import pool from "../../database/pool.js";
import type { PartyMemberRecord, PartyRecord, PartyVisibility } from "./party.types.js";

/**
 * Data access for teams.
 *
 * Every function takes an optional `client`, defaulting to the pool. That is
 * what lets the service compose several of them inside one transaction: a
 * membership change reads the roster and then writes based on what it read, so
 * the read and the write must see the same snapshot. Without it, two concurrent
 * leaves could each observe two members, each decide it is not the last one
 * out, and leave an empty team behind.
 */

type Db = Pick<PoolClient, "query"> | typeof pool;

/**
 * Column list for `parties`, optionally table-qualified for joins.
 *
 * A function rather than a string constant so a joined query cannot end up with
 * an ambiguous bare `id`, and so the aliases are declared exactly once — the
 * lowercase aliases have to match PartyRecord's keys, and two divergent copies
 * of that list is how a silently-undefined field gets shipped.
 */
const partyColumns = (alias = ""): string => {
  const p = alias ? `${alias}.` : "";
  return `
    ${p}id,
    ${p}name,
    ${p}passwordHash AS "passwordhash",
    ${p}leaderId     AS "leaderid",
    ${p}maxPlayers   AS "maxplayers",
    ${p}visibility,
    ${p}isLocked     AS "islocked",
    ${p}createdAt    AS "createdat",
    ${p}updatedAt    AS "updatedat"
  `;
};

const PARTY_COLUMNS = partyColumns();

export function findParty(partyId: string, db: Db = pool): Promise<PartyRecord | null> {
  return db
    .query<PartyRecord>(`SELECT ${PARTY_COLUMNS} FROM parties WHERE id = $1;`, [partyId])
    .then((result) => result.rows[0] ?? null);
}

export function listParties(limit: number, offset: number, db: Db = pool): Promise<PartyRecord[]> {
  return db
    .query<PartyRecord>(`SELECT ${PARTY_COLUMNS} FROM parties ORDER BY createdAt DESC LIMIT $1 OFFSET $2;`, [limit, offset])
    .then((result) => result.rows);
}

export function countParties(db: Db = pool): Promise<number> {
  return db.query<{ count: string }>(`SELECT count(*) FROM parties;`).then((result) => parseInt(result.rows[0]?.count ?? "0", 10));
}

export function listPublicParties(db: Db = pool): Promise<(PartyRecord & { membercount: string })[]> {
  return db.query<(PartyRecord & { membercount: string })>(`
    SELECT p.id, p.name, p.passwordHash AS "passwordhash", p.leaderId AS "leaderid",
           p.maxPlayers AS "maxplayers", p.visibility, p.isLocked AS "islocked",
           p.createdAt AS "createdat", p.updatedAt AS "updatedat",
           COUNT(pm.userId) AS "membercount"
    FROM parties p
    LEFT JOIN party_members pm ON pm.partyId = p.id
    WHERE p.visibility = 'PUBLIC' AND p.isLocked = false
    GROUP BY p.id
    ORDER BY p.createdAt DESC
  `).then(res => res.rows);
}

/**
 * Reads the team and takes a row lock for the rest of the transaction.
 *
 * This is the serialisation point for every membership mutation: concurrent
 * joins, leaves and kicks on the same team queue behind each other here, so the
 * capacity check and the insert that follows it cannot interleave.
 */
export function findPartyForUpdate(
  partyId: string,
  client: PoolClient
): Promise<PartyRecord | null> {
  return client
    .query<PartyRecord>(`SELECT ${PARTY_COLUMNS} FROM parties WHERE id = $1 FOR UPDATE;`, [
      partyId,
    ])
    .then((result) => result.rows[0] ?? null);
}

export function findPartyByName(name: string, db: Db = pool): Promise<PartyRecord | null> {
  return db
    .query<PartyRecord>(`SELECT ${PARTY_COLUMNS} FROM parties WHERE LOWER(name) = LOWER($1);`, [
      name,
    ])
    .then((result) => result.rows[0] ?? null);
}

/** The team a user belongs to, if any. A user is in at most one team. */
export function findPartyByMember(userId: string, db: Db = pool): Promise<PartyRecord | null> {
  return db
    .query<PartyRecord>(
      `SELECT ${partyColumns("p")}
       FROM parties p
       JOIN party_members pm ON pm.partyId = p.id
       WHERE pm.userId = $1
       LIMIT 1;`,
      [userId]
    )
    .then((result) => result.rows[0] ?? null);
}

export function findMembers(partyId: string, db: Db = pool): Promise<PartyMemberRecord[]> {
  return db
    .query<PartyMemberRecord>(
      `SELECT pm.userId AS "userid", u.username, pm.joinedAt AS "joinedat"
       FROM party_members pm
       JOIN user_auth u ON u.userId = pm.userId
       WHERE pm.partyId = $1
       ORDER BY pm.joinedAt ASC;`,
      [partyId]
    )
    .then((result) => result.rows);
}

export function isMember(partyId: string, userId: string, db: Db = pool): Promise<boolean> {
  return db
    .query(`SELECT 1 FROM party_members WHERE partyId = $1 AND userId = $2 LIMIT 1;`, [
      partyId,
      userId,
    ])
    .then((result) => result.rowCount === 1);
}

export function insertParty(
  party: {
    id: string;
    name: string;
    passwordHash: string | null;
    leaderId: string;
    maxPlayers: number;
    visibility: PartyVisibility;
  },
  client: PoolClient
): Promise<PartyRecord> {
  return client
    .query<PartyRecord>(
      `INSERT INTO parties (id, name, passwordHash, leaderId, maxPlayers, visibility)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${PARTY_COLUMNS};`,
      [
        party.id,
        party.name,
        party.passwordHash,
        party.leaderId,
        party.maxPlayers,
        party.visibility,
      ]
    )
    .then((result) => result.rows[0]!);
}

export async function addMember(
  partyId: string,
  userId: string,
  db: Db = pool
): Promise<void> {
  await db.query(
    `INSERT INTO party_members (partyId, userId) VALUES ($1, $2)
     ON CONFLICT (partyId, userId) DO NOTHING;`,
    [partyId, userId]
  );
}

export async function removeMember(
  partyId: string,
  userId: string,
  db: Db = pool
): Promise<boolean> {
  const result = await db.query(
    `DELETE FROM party_members WHERE partyId = $1 AND userId = $2;`,
    [partyId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function deleteParty(partyId: string, db: Db = pool): Promise<boolean> {
  // party_members and party_join_requests cascade from the FK.
  const result = await db.query(`DELETE FROM parties WHERE id = $1;`, [partyId]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Applies a partial update and bumps updatedAt.
 *
 * Column names are taken from a fixed allow-list rather than the caller's keys,
 * so no request-derived string can reach the SQL text. Values stay
 * parameterised.
 */
const UPDATABLE = {
  name: "name",
  passwordHash: "passwordHash",
  leaderId: "leaderId",
  visibility: "visibility",
  isLocked: "isLocked",
} as const;

export async function updateParty(
  partyId: string,
  changes: Partial<{
    name: string;
    passwordHash: string | null;
    leaderId: string;
    visibility: PartyVisibility;
    isLocked: boolean;
  }>,
  db: Db = pool
): Promise<PartyRecord | null> {
  const assignments: string[] = [];
  const params: unknown[] = [];

  for (const [key, column] of Object.entries(UPDATABLE)) {
    if (!(key in changes)) continue;
    params.push(changes[key as keyof typeof changes]);
    assignments.push(`${column} = $${params.length}`);
  }

  if (assignments.length === 0) return findParty(partyId, db);

  params.push(partyId);
  const result = await db.query<PartyRecord>(
    `UPDATE parties SET ${assignments.join(", ")}, updatedAt = CURRENT_TIMESTAMP
     WHERE id = $${params.length}
     RETURNING ${PARTY_COLUMNS};`,
    params
  );
  return result.rows[0] ?? null;
}

export function partyIdExists(partyId: string, db: Db = pool): Promise<boolean> {
  return db
    .query(`SELECT 1 FROM parties WHERE id = $1 LIMIT 1;`, [partyId])
    .then((result) => result.rowCount === 1);
}
