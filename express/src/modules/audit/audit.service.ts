import pool from "../../database/pool.js";
import { logger } from "../../core/logger.js";
import type { AuditEntry, AuditLogRecord } from "./audit.types.js";

/**
 * Appends to the audit log.
 *
 * Deliberately never throws. Auditing is observability, not business logic:
 * failing a team creation because the audit insert hit a constraint would turn
 * a diagnostic aid into an outage. A failure is logged loudly instead, so the
 * gap is visible without being fatal.
 *
 * Callers therefore do not need to await it for correctness — but they should,
 * so the write is ordered before the response and cannot be lost to a restart.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_logs (actorId, action, targetType, targetId, metadata, ipAddress)
       VALUES ($1, $2, $3, $4, $5, $6);`,
      [
        entry.actorId,
        entry.action,
        entry.targetType,
        entry.targetId ?? null,
        JSON.stringify(entry.metadata ?? {}),
        entry.ipAddress ?? null,
      ]
    );
  } catch (error) {
    logger.error(`Failed to write audit entry ${entry.action}`, error);
  }
}

export interface AuditQuery {
  limit: number;
  offset: number;
  action?: string;
  actorId?: string;
}

/**
 * Admin-facing audit read. Joins the actor's username so the log is readable
 * without a second lookup per row, and LEFT JOINs because actorId is nulled
 * when a user is deleted — the entry must survive them.
 */
export async function queryAuditLog(query: AuditQuery): Promise<AuditLogRecord[]> {
  const filters: string[] = [];
  const params: unknown[] = [];

  if (query.action) {
    params.push(query.action);
    filters.push(`a.action = $${params.length}`);
  }
  if (query.actorId) {
    params.push(query.actorId);
    filters.push(`a.actorId = $${params.length}`);
  }

  params.push(query.limit, query.offset);

  const result = await pool.query<AuditLogRecord>(
    `SELECT a.id::text AS id,
            a.actorId    AS "actorid",
            u.username   AS "actorusername",
            a.action,
            a.targetType AS "targettype",
            a.targetId   AS "targetid",
            a.metadata,
            a.ipAddress  AS "ipaddress",
            a.createdAt  AS "createdat"
     FROM audit_logs a
     LEFT JOIN user_auth u ON u.userId = a.actorId
     ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
     ORDER BY a.createdAt DESC
     LIMIT $${params.length - 1} OFFSET $${params.length};`,
    params
  );

  return result.rows;
}
