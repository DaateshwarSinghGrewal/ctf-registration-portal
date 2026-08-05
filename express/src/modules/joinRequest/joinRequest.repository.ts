import type { PoolClient } from "pg";
import pool from "../../database/pool.js";
import { JoinRequestStatus, type JoinRequestRecord } from "./joinRequest.types.js";

type Db = Pick<PoolClient, "query"> | typeof pool;

/** Joins user_auth so a leader sees who is asking, not a bare UUID. */
const COLUMNS = `
  r.id::text   AS id,
  r.partyId    AS "partyid",
  r.userId     AS "userid",
  u.username,
  r.status,
  r.createdAt  AS "createdat",
  r.resolvedAt AS "resolvedat"
`;

const FROM = `FROM party_join_requests r JOIN user_auth u ON u.userId = r.userId`;

export function insertRequest(
  partyId: string,
  userId: string,
  db: Db = pool
): Promise<JoinRequestRecord | null> {
  // ON CONFLICT DO NOTHING against the partial unique index makes "one open
  // request per user per team" a database guarantee instead of a
  // check-then-insert race. A null return means one was already pending.
  return db
    .query<{ id: string }>(
      `INSERT INTO party_join_requests (partyId, userId)
       VALUES ($1, $2)
       ON CONFLICT (partyId, userId) WHERE status = 'PENDING' DO NOTHING
       RETURNING id::text AS id;`,
      [partyId, userId]
    )
    .then((result) => {
      const id = result.rows[0]?.id;
      return id ? findRequestById(id, db) : null;
    });
}

export function findRequestById(id: string, db: Db = pool): Promise<JoinRequestRecord | null> {
  return db
    .query<JoinRequestRecord>(`SELECT ${COLUMNS} ${FROM} WHERE r.id = $1;`, [id])
    .then((result) => result.rows[0] ?? null);
}

/**
 * Reads a request and locks it for the rest of the transaction, so two leaders
 * (or a leader and the requester cancelling) cannot resolve the same request
 * twice.
 */
export function findRequestForUpdate(
  id: string,
  client: PoolClient
): Promise<JoinRequestRecord | null> {
  return client
    .query<JoinRequestRecord>(
      // FOR UPDATE OF r: the join to user_auth is for display only, and locking
      // that row too would serialise unrelated requests from the same user.
      `SELECT ${COLUMNS} ${FROM} WHERE r.id = $1 FOR UPDATE OF r;`,
      [id]
    )
    .then((result) => result.rows[0] ?? null);
}

export function listRequestsForParty(
  partyId: string,
  status: JoinRequestStatus | undefined,
  db: Db = pool
): Promise<JoinRequestRecord[]> {
  const params: unknown[] = [partyId];
  let filter = "";
  if (status) {
    params.push(status);
    filter = `AND r.status = $${params.length}`;
  }

  return db
    .query<JoinRequestRecord>(
      `SELECT ${COLUMNS} ${FROM}
       WHERE r.partyId = $1 ${filter}
       ORDER BY r.createdAt ASC;`,
      params
    )
    .then((result) => result.rows);
}

/** The caller's own requests — lets a user see what they are waiting on. */
export function listRequestsForUser(
  userId: string,
  db: Db = pool
): Promise<JoinRequestRecord[]> {
  return db
    .query<JoinRequestRecord>(
      `SELECT ${COLUMNS} ${FROM}
       WHERE r.userId = $1
       ORDER BY r.createdAt DESC;`,
      [userId]
    )
    .then((result) => result.rows);
}

export async function resolveRequest(
  id: string,
  status: JoinRequestStatus,
  resolvedBy: string,
  db: Db = pool
): Promise<boolean> {
  const result = await db.query(
    // The status guard makes this idempotent: a duplicate accept affects no rows
    // rather than re-running the side effects.
    `UPDATE party_join_requests
     SET status = $1, resolvedAt = CURRENT_TIMESTAMP, resolvedBy = $2
     WHERE id = $3 AND status = 'PENDING';`,
    [status, resolvedBy, id]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Cancels a user's other open requests once they join a team.
 *
 * Without this, a user who joined team A still has a pending request to team B,
 * and accepting it later would silently fail the "already in a team" check —
 * leaving B's leader looking at a request that can never succeed.
 */
export async function cancelOtherPendingRequests(
  userId: string,
  exceptPartyId: string,
  db: Db = pool
): Promise<void> {
  await db.query(
    `UPDATE party_join_requests
     SET status = 'CANCELLED', resolvedAt = CURRENT_TIMESTAMP
     WHERE userId = $1 AND status = 'PENDING' AND partyId <> $2;`,
    [userId, exceptPartyId]
  );
}
