import { ApiError } from "../../core/http/ApiError.js";
import pool from "../../database/pool.js";
import { recordAudit } from "../audit/audit.service.js";
import { AuditAction } from "../audit/audit.types.js";
import { emitToAll } from "../../realtime/socket.emitter.js";
import { SocketEvent } from "../../realtime/socket.events.js";

/**
 * Event-wide registration state.
 *
 * Backed by the single-row `event_settings` table, whose CHECK (id) constraint
 * makes "exactly one row" a database invariant — so no code path can create a
 * second one and leave the answer ambiguous.
 */

interface EventSettingsRecord {
  registrationopen: boolean;
  registrationclosesat: Date | null;
  updatedat: Date;
}

export interface EventSettings {
  registrationOpen: boolean;
  registrationClosesAt: Date | null;
  updatedAt: Date;
}

const COLUMNS = `
  registrationOpen     AS "registrationopen",
  registrationClosesAt AS "registrationclosesat",
  updatedAt            AS "updatedat"
`;

export async function getEventSettings(): Promise<EventSettings> {
  const result = await pool.query<EventSettingsRecord>(
    `SELECT ${COLUMNS} FROM event_settings WHERE id = TRUE;`
  );

  // Migration 003 seeds the row, so absence means the migration has not run.
  // Defaulting to open would let registrations through on an unmigrated
  // database; failing loudly is the safer answer.
  const row = result.rows[0];
  if (!row) {
    throw ApiError.internal("Event settings are missing. Run the database migrations.");
  }

  return {
    registrationOpen: row.registrationopen,
    registrationClosesAt: row.registrationclosesat,
    updatedAt: row.updatedat,
  };
}

/**
 * Guard for every write that constitutes registering.
 *
 * Enforced server-side, not just by hiding a button: once registration closes,
 * a caller replaying an earlier request must be refused too.
 *
 * The deadline is also honoured, so a `registrationClosesAt` in the past closes
 * registration without anyone having to press anything at midnight.
 */
export async function assertRegistrationOpen(): Promise<void> {
  const settings = await getEventSettings();

  if (!settings.registrationOpen) {
    throw ApiError.forbidden("Registration is closed.");
  }

  if (settings.registrationClosesAt && settings.registrationClosesAt.getTime() <= Date.now()) {
    throw ApiError.forbidden("Registration has closed.");
  }
}

/**
 * Opens or closes registration and tells every connected client.
 *
 * The broadcast is what makes Phase 4's "no page reloads" true for this state:
 * a client that had the create-team form open finds out immediately rather than
 * on its next request.
 */
export async function setRegistrationOpen(
  isOpen: boolean,
  actorId: string,
  closesAt?: Date | null
): Promise<EventSettings> {
  const result = await pool.query<EventSettingsRecord>(
    `UPDATE event_settings
     SET registrationOpen = $1,
         registrationClosesAt = COALESCE($2, registrationClosesAt),
         updatedAt = CURRENT_TIMESTAMP,
         updatedBy = $3
     WHERE id = TRUE
     RETURNING ${COLUMNS};`,
    [isOpen, closesAt ?? null, actorId]
  );

  const row = result.rows[0];
  if (!row) {
    throw ApiError.internal("Event settings are missing. Run the database migrations.");
  }

  await recordAudit({
    actorId,
    action: isOpen ? AuditAction.REGISTRATION_OPENED : AuditAction.REGISTRATION_CLOSED,
    targetType: "event",
    targetId: "registration",
    metadata: { closesAt: closesAt ?? null },
  });

  emitToAll(isOpen ? SocketEvent.REGISTRATION_OPENED : SocketEvent.REGISTRATION_CLOSED, {
    at: new Date().toISOString(),
  });

  return {
    registrationOpen: row.registrationopen,
    registrationClosesAt: row.registrationclosesat,
    updatedAt: row.updatedat,
  };
}
