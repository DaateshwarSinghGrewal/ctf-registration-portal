import { ApiError } from "../../core/http/ApiError.js";
import pool from "../../database/pool.js";
import {
  countUsers,
  findUserById,
  listUsers as listUserRows,
  updateUserRole,
} from "../../database/user.repository.js";
import { recordAudit } from "../audit/audit.service.js";
import { AuditAction } from "../audit/audit.types.js";
import { Role, type UserRecord } from "../auth/auth.types.js";
import {
  clearPartyRoom,
  emitToParty,
  removeUserFromPartyRoom,
} from "../../realtime/socket.emitter.js";
import { SocketEvent } from "../../realtime/socket.events.js";
import { findMembers, findParty, listParties as listPartyRows, countParties } from "../party/party.repository.js";
import { toMembers, toSummary, type PartySummary } from "../party/party.types.js";

/**
 * Admin operations.
 *
 * These bypass the leader-only rules the party module enforces — that is the
 * point of an override — so every one of them writes an audit entry. An
 * unattributable moderator action is exactly what the audit log exists to
 * prevent.
 */

export interface AdminUserView {
  userId: string;
  email: string;
  username: string;
  role: Role;
  createdAt: Date;
  lastLogin: Date | null;
}

function toView(user: UserRecord): AdminUserView {
  return {
    userId: user.userid,
    email: user.email,
    username: user.username,
    role: user.role,
    createdAt: user.createdat,
    lastLogin: user.lastlogin,
  };
}

export async function listUsers(
  limit: number,
  offset: number
): Promise<{ users: AdminUserView[]; total: number }> {
  const [rows, total] = await Promise.all([listUserRows(limit, offset), countUsers()]);
  return { users: rows.map(toView), total };
}

export async function getUser(userId: string): Promise<AdminUserView> {
  const user = await findUserById(userId);
  if (!user) throw ApiError.notFound("User not found");
  return toView(user);
}

export async function listParties(
  limit: number,
  offset: number
): Promise<{ parties: PartySummary[]; total: number }> {
  const [rows, total] = await Promise.all([listPartyRows(limit, offset), countParties()]);
  return { parties: rows.map(r => toSummary(r, 0)), total };
}

export async function changeUserRole(
  actorId: string,
  userId: string,
  role: Role
): Promise<AdminUserView> {
  // Self-demotion would leave the caller unable to undo it, and if they are the
  // only admin it locks everyone out of /admin entirely.
  if (actorId === userId && role !== Role.ADMIN) {
    throw ApiError.badRequest("You cannot remove your own admin role");
  }

  const updated = await updateUserRole(userId, role);
  if (!updated) throw ApiError.notFound("User not found");

  await recordAudit({
    actorId,
    action: AuditAction.USER_ROLE_CHANGED,
    targetType: "user",
    targetId: userId,
    metadata: { role },
  });

  return toView(updated);
}

/** Admin override: delete any team regardless of who leads it. */
export async function forceDeleteParty(actorId: string, partyId: string): Promise<void> {
  const party = await findParty(partyId);
  if (!party) throw ApiError.notFound("Team not found");

  await pool.query(`DELETE FROM parties WHERE id = $1;`, [partyId]);

  await recordAudit({
    actorId,
    action: AuditAction.PARTY_DELETED,
    targetType: "party",
    targetId: partyId,
    metadata: { name: party.name, byAdmin: true },
  });

  emitToParty(partyId, SocketEvent.TEAM_DELETED, {
    partyId,
    actor: { userId: actorId, username: "admin" },
  });
  clearPartyRoom(partyId);
}

/**
 * Admin override: remove any member from any team.
 *
 * Refuses to remove the leader. Doing so would leave the team with a leaderId
 * pointing at a non-member, and every leader check thereafter would fail for
 * everyone — the team becomes unmanageable rather than merely short-handed.
 */
export async function forceRemoveMember(
  actorId: string,
  partyId: string,
  userId: string
): Promise<void> {
  const party = await findParty(partyId);
  if (!party) throw ApiError.notFound("Team not found");

  if (party.leaderid === userId) {
    throw ApiError.badRequest(
      "Cannot remove the team leader. Delete the team, or transfer leadership first."
    );
  }

  const result = await pool.query(
    `DELETE FROM party_members WHERE partyId = $1 AND userId = $2;`,
    [partyId, userId]
  );

  if ((result.rowCount ?? 0) === 0) {
    throw ApiError.notFound("That player is not in this team");
  }

  await recordAudit({
    actorId,
    action: AuditAction.MEMBER_REMOVED,
    targetType: "party",
    targetId: partyId,
    metadata: { userId, byAdmin: true },
  });

  const members = await findMembers(partyId);
  emitToParty(partyId, SocketEvent.TEAM_MEMBER_REMOVED, {
    partyId,
    userId,
    members: toMembers(members, party.leaderid),
    actor: { userId: actorId, username: "admin" },
  });
  removeUserFromPartyRoom(userId, partyId);
}
