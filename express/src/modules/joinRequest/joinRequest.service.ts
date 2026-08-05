import { ApiError } from "../../core/http/ApiError.js";
import { withTransaction } from "../../database/pool.js";
import { recordAudit } from "../audit/audit.service.js";
import { AuditAction } from "../audit/audit.types.js";
import { notify } from "../notification/notification.service.js";
import { NotificationType } from "../notification/notification.types.js";
import { assertRegistrationOpen } from "../event/event.service.js";
import { assertProfileComplete } from "../profile/profile.service.js";
import { emitToParty, emitToUser } from "../../realtime/socket.emitter.js";
import { SocketEvent, type Actor } from "../../realtime/socket.events.js";
import { afterMemberJoined } from "../party/party.service.js";
import {
  addMember,
  findMembers,
  findParty,
  findPartyByMember,
  findPartyForUpdate,
} from "../party/party.repository.js";
import { PartyVisibility } from "../party/party.types.js";
import {
  cancelOtherPendingRequests,
  findRequestForUpdate,
  insertRequest,
  listRequestsForParty,
  listRequestsForUser,
  resolveRequest,
} from "./joinRequest.repository.js";
import {
  JoinRequestStatus,
  toJoinRequest,
  type JoinRequest,
} from "./joinRequest.types.js";

/**
 * Join-request workflow for PRIVATE teams.
 *
 *   requester asks → leader is notified → leader accepts or rejects
 *   → the team room updates in realtime
 *
 * The point is that nobody enters a private team without the leader agreeing,
 * so membership is only ever written by `accept` — never by the request itself.
 */

/** Creates a pending request to join a private team. */
export async function requestToJoin(
  partyId: string,
  userId: string,
  actor: Actor
): Promise<JoinRequest> {
  await assertRegistrationOpen();
  await assertProfileComplete(userId);

  const party = await findParty(partyId);
  if (!party) throw ApiError.notFound("No team found with that code");

  const existing = await findPartyByMember(userId);
  if (existing) {
    throw ApiError.conflict(
      existing.id === partyId
        ? "You are already a member of this team"
        : `You are already in "${existing.name}". Leave it before requesting to join another.`
    );
  }

  if (party.visibility === PartyVisibility.PUBLIC) {
    // Sending them down the request path would leave them waiting on an approval
    // that is not required.
    throw ApiError.badRequest("This team is public — join it directly instead.");
  }
  if (party.islocked) {
    throw ApiError.conflict("This team is locked and is not accepting requests");
  }

  const members = await findMembers(partyId);
  if (members.length >= party.maxplayers) {
    throw ApiError.conflict("This team is already full");
  }

  const created = await insertRequest(partyId, userId);
  if (!created) {
    throw ApiError.conflict("You already have a pending request for this team");
  }

  const request = toJoinRequest(created);

  await recordAudit({
    actorId: userId,
    action: AuditAction.JOIN_REQUEST_CREATED,
    targetType: "party",
    targetId: partyId,
    metadata: { requestId: request.id },
  });

  await notify({
    userId: party.leaderid,
    type: NotificationType.JOIN_REQUEST_RECEIVED,
    title: "New join request",
    body: `${actor.username} asked to join "${party.name}".`,
    payload: { partyId, requestId: request.id, userId },
  });

  // To the room so any leader tab updates its pending list live.
  emitToParty(partyId, SocketEvent.TEAM_JOIN_REQUEST_CREATED, { partyId, request });

  return request;
}

/** Pending requests for a team — leader only. */
export async function listPendingRequests(
  partyId: string,
  leaderId: string
): Promise<JoinRequest[]> {
  const party = await findParty(partyId);
  if (!party) throw ApiError.notFound("Team not found");

  if (party.leaderid !== leaderId) {
    throw ApiError.forbidden("Only the team leader can view join requests");
  }

  const rows = await listRequestsForParty(partyId, JoinRequestStatus.PENDING);
  return rows.map(toJoinRequest);
}

/** The caller's own requests, in any state. */
export async function listMyRequests(userId: string): Promise<JoinRequest[]> {
  const rows = await listRequestsForUser(userId);
  return rows.map(toJoinRequest);
}

/**
 * Leader accepts a request; this is the only path that adds a member to a
 * private team.
 *
 * Everything that decides the outcome — the request still being pending, the
 * team still having room, the requester not having joined elsewhere meanwhile —
 * is re-checked inside the transaction under a row lock. Those facts were true
 * when the leader loaded the page and may not be now.
 */
export async function acceptRequest(
  requestId: string,
  leaderId: string,
  actor: Actor
): Promise<JoinRequest> {
  const { request, party, members } = await withTransaction(async (client) => {
    const locked = await findRequestForUpdate(requestId, client);
    if (!locked) throw ApiError.notFound("Join request not found");

    if (locked.status !== JoinRequestStatus.PENDING) {
      throw ApiError.conflict(`This request was already ${locked.status.toLowerCase()}`);
    }

    const lockedParty = await findPartyForUpdate(locked.partyid, client);
    if (!lockedParty) throw ApiError.notFound("Team not found");

    if (lockedParty.leaderid !== leaderId) {
      throw ApiError.forbidden("Only the team leader can accept join requests");
    }
    if (lockedParty.islocked) {
      throw ApiError.conflict("Unlock the team before accepting new members");
    }

    const current = await findMembers(locked.partyid, client);
    if (current.length >= lockedParty.maxplayers) {
      throw ApiError.conflict("This team is already full");
    }

    // The requester may have joined another team while this sat pending.
    if (await findPartyByMember(locked.userid, client)) {
      throw ApiError.conflict("That player has already joined another team");
    }

    await resolveRequest(requestId, JoinRequestStatus.ACCEPTED, leaderId, client);
    await addMember(locked.partyid, locked.userid, client);
    await cancelOtherPendingRequests(locked.userid, locked.partyid, client);

    return {
      request: locked,
      party: lockedParty,
      members: await findMembers(locked.partyid, client),
    };
  });

  await recordAudit({
    actorId: actor.userId,
    action: AuditAction.JOIN_REQUEST_ACCEPTED,
    targetType: "party",
    targetId: party.id,
    metadata: { requestId, userId: request.userid },
  });

  await notify({
    userId: request.userid,
    type: NotificationType.JOIN_REQUEST_ACCEPTED,
    title: "Request accepted",
    body: `You are now a member of "${party.name}".`,
    payload: { partyId: party.id },
  });

  // The accepted user's socket is not in the team room yet, so they get a direct
  // copy — the room broadcast in afterMemberJoined would miss them.
  emitToUser(request.userid, SocketEvent.TEAM_JOIN_REQUEST_RESOLVED, {
    partyId: party.id,
    requestId,
    status: JoinRequestStatus.ACCEPTED,
    actor,
  });

  emitToParty(party.id, SocketEvent.TEAM_JOIN_REQUEST_RESOLVED, {
    partyId: party.id,
    requestId,
    status: JoinRequestStatus.ACCEPTED,
    actor,
  });

  // Reuses the direct-join tail so both paths notify and emit identically.
  await afterMemberJoined(party, members, request.userid, actor);

  return { ...toJoinRequest(request), status: JoinRequestStatus.ACCEPTED, resolvedAt: new Date() };
}

export async function rejectRequest(
  requestId: string,
  leaderId: string,
  actor: Actor
): Promise<JoinRequest> {
  const { request, partyName, partyId } = await withTransaction(async (client) => {
    const locked = await findRequestForUpdate(requestId, client);
    if (!locked) throw ApiError.notFound("Join request not found");

    if (locked.status !== JoinRequestStatus.PENDING) {
      throw ApiError.conflict(`This request was already ${locked.status.toLowerCase()}`);
    }

    const party = await findParty(locked.partyid, client);
    if (!party) throw ApiError.notFound("Team not found");

    if (party.leaderid !== leaderId) {
      throw ApiError.forbidden("Only the team leader can reject join requests");
    }

    await resolveRequest(requestId, JoinRequestStatus.REJECTED, leaderId, client);
    return { request: locked, partyName: party.name, partyId: party.id };
  });

  await recordAudit({
    actorId: actor.userId,
    action: AuditAction.JOIN_REQUEST_REJECTED,
    targetType: "party",
    targetId: partyId,
    metadata: { requestId, userId: request.userid },
  });

  await notify({
    userId: request.userid,
    type: NotificationType.JOIN_REQUEST_REJECTED,
    title: "Request declined",
    body: `Your request to join "${partyName}" was declined.`,
    payload: { partyId },
  });

  emitToUser(request.userid, SocketEvent.TEAM_JOIN_REQUEST_RESOLVED, {
    partyId,
    requestId,
    status: JoinRequestStatus.REJECTED,
    actor,
  });

  emitToParty(partyId, SocketEvent.TEAM_JOIN_REQUEST_RESOLVED, {
    partyId,
    requestId,
    status: JoinRequestStatus.REJECTED,
    actor,
  });

  return { ...toJoinRequest(request), status: JoinRequestStatus.REJECTED, resolvedAt: new Date() };
}

/** The requester withdraws their own pending request. */
export async function cancelRequest(
  requestId: string,
  userId: string,
  actor: Actor
): Promise<void> {
  const { partyId } = await withTransaction(async (client) => {
    const locked = await findRequestForUpdate(requestId, client);
    if (!locked) throw ApiError.notFound("Join request not found");

    // Scoped to the owner: without this any user could cancel someone else's
    // request by id.
    if (locked.userid !== userId) {
      throw ApiError.forbidden("You can only cancel your own join requests");
    }
    if (locked.status !== JoinRequestStatus.PENDING) {
      throw ApiError.conflict(`This request was already ${locked.status.toLowerCase()}`);
    }

    await resolveRequest(requestId, JoinRequestStatus.CANCELLED, userId, client);
    return { partyId: locked.partyid };
  });

  await recordAudit({
    actorId: userId,
    action: AuditAction.JOIN_REQUEST_CANCELLED,
    targetType: "party",
    targetId: partyId,
    metadata: { requestId },
  });

  emitToParty(partyId, SocketEvent.TEAM_JOIN_REQUEST_RESOLVED, {
    partyId,
    requestId,
    status: JoinRequestStatus.CANCELLED,
    actor,
  });
}
