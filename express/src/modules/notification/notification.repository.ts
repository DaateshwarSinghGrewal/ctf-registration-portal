import pool from "../../database/pool.js";
import type { NotificationInput, NotificationRecord } from "./notification.types.js";

const COLUMNS = `
  id::text AS id,
  userId   AS "userid",
  type,
  title,
  body,
  payload,
  readAt    AS "readat",
  createdAt AS "createdat"
`;

export async function insertNotification(
  input: NotificationInput
): Promise<NotificationRecord> {
  const result = await pool.query<NotificationRecord>(
    `INSERT INTO notifications (userId, type, title, body, payload)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${COLUMNS};`,
    [input.userId, input.type, input.title, input.body, JSON.stringify(input.payload ?? {})]
  );
  return result.rows[0]!;
}

/**
 * Bulk insert for fan-out to a whole team.
 *
 * One multi-row INSERT rather than a loop: notifying a team of four was four
 * round trips to Neon, and the latency shows up directly in the request that
 * triggered it.
 */
export async function insertNotifications(
  inputs: NotificationInput[]
): Promise<NotificationRecord[]> {
  if (inputs.length === 0) return [];

  const values: string[] = [];
  const params: unknown[] = [];

  inputs.forEach((input, index) => {
    const base = index * 5;
    values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);
    params.push(
      input.userId,
      input.type,
      input.title,
      input.body,
      JSON.stringify(input.payload ?? {})
    );
  });

  const result = await pool.query<NotificationRecord>(
    `INSERT INTO notifications (userId, type, title, body, payload)
     VALUES ${values.join(", ")}
     RETURNING ${COLUMNS};`,
    params
  );
  return result.rows;
}

export async function listNotifications(
  userId: string,
  limit: number,
  offset: number,
  unreadOnly: boolean
): Promise<NotificationRecord[]> {
  const result = await pool.query<NotificationRecord>(
    `SELECT ${COLUMNS} FROM notifications
     WHERE userId = $1 ${unreadOnly ? "AND readAt IS NULL" : ""}
     ORDER BY createdAt DESC
     LIMIT $2 OFFSET $3;`,
    [userId, limit, offset]
  );
  return result.rows;
}

export async function countUnread(userId: string): Promise<number> {
  const result = await pool.query<{ total: string }>(
    `SELECT COUNT(*) AS total FROM notifications WHERE userId = $1 AND readAt IS NULL;`,
    [userId]
  );
  return Number(result.rows[0]?.total ?? 0);
}

/**
 * Marks one notification read. Scoped by userId in the WHERE clause, not just
 * by id — otherwise any authenticated user could mark another user's
 * notification read by guessing its UUID.
 */
export async function markRead(userId: string, notificationId: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE notifications SET readAt = CURRENT_TIMESTAMP
     WHERE id = $1 AND userId = $2 AND readAt IS NULL;`,
    [notificationId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function markAllRead(userId: string): Promise<number> {
  const result = await pool.query(
    `UPDATE notifications SET readAt = CURRENT_TIMESTAMP
     WHERE userId = $1 AND readAt IS NULL;`,
    [userId]
  );
  return result.rowCount ?? 0;
}
