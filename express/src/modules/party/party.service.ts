import crypto from "node:crypto";
import { ApiError } from "../../core/http/ApiError.js";
import { withTransaction } from "../../database/pool.js";
import { recordAudit } from "../audit/audit.service.js";
import { AuditAction } from "../audit/audit.types.js";
import { notify, notifyMany } from "../notification/notification.service.js";
import { NotificationType } from "../notification/notification.types.js";
import { assertRegistrationOpen } from "../event/event.service.js";
import { assertProfileComplete } from "../profile/profile.service.js";
import {
  addUserToPartyRoom,
  clearPartyRoom,
  emitToParty,
  emitToUser,
  removeUserFromPartyRoom,
} from "../../realtime/socket.emitter.js";
import { SocketEvent, type Actor } from "../../realtime/socket.events.js";
import { hashPartyPassword, verifyPartyPassword } from "./party.password.js";
import {
  addMember,
  deleteParty as deletePartyRow,
  findMembers,
  findParty,
  findPartyByMember,
  findPartyByName,
  findPartyForUpdate,
  insertParty,
  isMember,
  partyIdExists,
  removeMember,
  updateParty,
} from "./party.repository.js";
import {
  PartyVisibility,
  toDetails,
  toMembers,
  toSummary,
  type CreatePartyInput,
  type PartyDetails,
  type PartyMemberRecord,
  type PartyRecord,
  type PartySummary,
} from "./party.types.js";

const MAX_PLAYERS = 4;
const INVITE_CODE_BYTES = 3;
const MAX_CODE_ATTEMPTS = 10;

/** Six uppercase hex characters — short enough to read aloud. */
function generateInviteCode(): string {
  return crypto.randomBytes(INVITE_CODE_BYTES).toString("hex").toUpperCase();
}

async function allocateInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = generateInviteCode();
    if (!(await partyIdExists(code))) return code;
  }
  // 16.7M codes: exhausting ten draws means something is badly wrong, and
  // looping forever would hold the request open indefinitely.
  throw ApiError.internal("Could not allocate an invite code. Please try again.");
}

/* -------------------------------------------------------------------------- */
/* Reads                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Loads a team by invite code, with its roster.
 *
 * Readable by any authenticated user: the code is itself the access control, and
 * a prospective member has to see the team's name and size before asking to
 * join.
 */
export async function getPartyDetails(partyId: string): Promise<PartyDetails> {
  const party = await findParty(partyId);
  if (!party) throw ApiError.notFound("Team not found");

  return toDetails(party, await findMembers(partyId));
}

/**
 * The team the caller belongs to, or null.
 *
 * This endpoint did not exist, so the SPA cached the invite code in
 * localStorage to survive a reload — which lost the answer when storage was
 * cleared and gave a stale one if the user was removed while away. The database
 * already knows; this exposes it.
 */
export async function getMyParty(userId: string): Promise<PartyDetails | null> {
  const party = await findPartyByMember(userId);
  if (!party) return null;

  return toDetails(party, await findMembers(party.id));
}

/* -------------------------------------------------------------------------- */
/* Guards                                                                     */
/* -------------------------------------------------------------------------- */

function assertLeader(party: PartyRecord, userId: string): void {
  if (party.leaderid !== userId) {
    throw ApiError.forbidden("Only the team leader can do that");
  }
}

/** A user belongs to at most one team, so joining a second is refused. */
async function assertNotAlreadyInAParty(userId: string): Promise<void> {
  const existing = await findPartyByMember(userId);
  if (existing) {
    throw ApiError.conflict(
      `You are already in "${existing.name}". Leave it before joining another team.`
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Team lifecycle                                                             */
/* -------------------------------------------------------------------------- */

export async function createParty(
  input: CreatePartyInput,
  actor: Actor
): Promise<PartySummary> {
  await assertRegistrationOpen();
  await assertProfileComplete(input.leaderId);
  await assertNotAlreadyInAParty(input.leaderId);

  const maxPlayers = input.maxPlayers ?? MAX_PLAYERS;
  const visibility = input.visibility ?? PartyVisibility.PUBLIC;

  if (await findPartyByName(input.name)) {
    throw ApiError.conflict("A team with that name already exists");
  }

  const id = await allocateInviteCode();
  const passwordHash = input.password ? hashPartyPassword(input.password) : null;

  const party = await withTransaction(async (client) => {
    const created = await insertParty(
      { id, name: input.name, passwordHash, leaderId: input.leaderId, maxPlayers, visibility },
      client
    );
    // The leader is a member: every roster read and capacity check counts
    // members, so excluding them would let a team of four hold five people.
    await addMember(id, input.leaderId, client);
    return created;
  });

  const summary = toSummary(party, 1);

  await recordAudit({
    actorId: actor.userId,
    action: AuditAction.PARTY_CREATED,
    targetType: "party",
    targetId: id,
    metadata: { name: party.name, visibility, hasPassword: passwordHash !== null },
  });

  await notify({
    userId: actor.userId,
    type: NotificationType.TEAM_CREATED,
    title: "Team created",
    body: `You created "${party.name}". Share the code ${id} to invite others.`,
    payload: { partyId: id },
  });

  // Before the emit: the creator connected before this team existed, so their
  // socket is not in the room yet and would miss its own creation event.
  addUserToPartyRoom(actor.userId, id);
  emitToParty(id, SocketEvent.TEAM_CREATED, { party: summary, actor });

  return summary;
}

/**
 * Adds the caller to a PUBLIC team immediately.
 *
 * PRIVATE teams are refused here and go through the join-request flow instead.
 * The check is in the service rather than the controller so no alternative
 * route into this function can bypass it.
 */
export async function joinParty(
  partyId: string,
  userId: string,
  password: string | undefined,
  actor: Actor
): Promise<PartyDetails> {
  await assertRegistrationOpen();
  await assertProfileComplete(userId);
  await assertNotAlreadyInAParty(userId);

  const { party, members } = await withTransaction(async (client) => {
    // FOR UPDATE serialises concurrent joins. Without it, two requests both
    // read three of four seats taken and both insert, overfilling the team.
    const locked = await findPartyForUpdate(partyId, client);
    if (!locked) throw ApiError.notFound("No team found with that code");

    if (locked.visibility === PartyVisibility.PRIVATE) {
      throw ApiError.forbidden(
        "This team is private. Send a join request and wait for the leader to accept."
      );
    }
    if (locked.islocked) {
      throw ApiError.conflict("This team is locked and is not accepting new members");
    }

    if (locked.passwordhash) {
      if (!password || !verifyPartyPassword(password, locked.passwordhash)) {
        throw ApiError.unauthorized("Incorrect team password");
      }
    }

    const current = await findMembers(partyId, client);
    if (current.length >= locked.maxplayers) {
      throw ApiError.conflict("This team is already full");
    }

    await addMember(partyId, userId, client);
    return { party: locked, members: await findMembers(partyId, client) };
  });

  await afterMemberJoined(party, members, userId, actor);

  return toDetails(party, members);
}

/**
 * Shared tail of "someone became a member", used by the direct join and by an
 * accepted join request, so the two cannot drift in what they notify or emit.
 */
export async function afterMemberJoined(
  party: PartyRecord,
  members: PartyMemberRecord[],
  joinedUserId: string,
  actor: Actor
): Promise<void> {
  const mapped = toMembers(members, party.leaderid);
  const joined = mapped.find((member) => member.userId === joinedUserId);

  // Joined before any emit so the new member receives the roster update too.
  addUserToPartyRoom(joinedUserId, party.id);

  await recordAudit({
    actorId: actor.userId,
    action: AuditAction.MEMBER_JOINED,
    targetType: "party",
    targetId: party.id,
    metadata: { userId: joinedUserId },
  });

  // Everyone already on the team hears about the arrival; the arrival does not
  // need telling that they just joined.
  await notifyMany(
    mapped
      .filter((member) => member.userId !== joinedUserId)
      .map((member) => ({
        userId: member.userId,
        type: NotificationType.MEMBER_JOINED,
        title: "New team member",
        body: `${joined?.username ?? "A player"} joined "${party.name}".`,
        payload: { partyId: party.id, userId: joinedUserId },
      }))
  );

  if (joined) {
    emitToParty(party.id, SocketEvent.TEAM_MEMBER_JOINED, {
      partyId: party.id,
      member: joined,
      members: mapped,
      actor,
    });
  }

  if (mapped.length >= party.maxplayers) {
    await notifyMany(
      mapped.map((member) => ({
        userId: member.userId,
        type: NotificationType.TEAM_FULL,
        title: "Team full",
        body: `"${party.name}" now has all ${party.maxplayers} players.`,
        payload: { partyId: party.id },
      }))
    );
  }
}

/**
 * Removes the caller from their team.
 *
 * The three outcomes — last member out, leader leaving, ordinary member leaving
 * — are decided inside one transaction, because each depends on the roster as
 * it stands at that instant.
 */
export async function leaveParty(partyId: string, userId: string, actor: Actor): Promise<void> {
  const outcome = await withTransaction(async (client) => {
    const party = await findPartyForUpdate(partyId, client);
    if (!party) throw ApiError.notFound("Team not found");

    if (!(await isMember(partyId, userId, client))) {
      throw ApiError.conflict("You are not a member of this team");
    }

    await removeMember(partyId, userId, client);
    const remaining = await findMembers(partyId, client);

    if (remaining.length === 0) {
      await deletePartyRow(partyId, client);
      return { kind: "disbanded" as const, party, remaining };
    }

    // Leadership passes to the longest-standing remaining member rather than
    // leaving the team leaderless and unmanageable.
    if (party.leaderid === userId) {
      const heir = remaining[0]!;
      await updateParty(partyId, { leaderId: heir.userid }, client);
      return { kind: "promoted" as const, party, remaining, heirId: heir.userid };
    }

    return { kind: "left" as const, party, remaining };
  });

  const { party, remaining } = outcome;
  const leaderId = outcome.kind === "promoted" ? outcome.heirId : party.leaderid;
  const members = toMembers(remaining, leaderId);

  await recordAudit({
    actorId: actor.userId,
    action: AuditAction.MEMBER_LEFT,
    targetType: "party",
    targetId: partyId,
    metadata: { outcome: outcome.kind },
  });

  if (outcome.kind === "disbanded") {
    emitToParty(partyId, SocketEvent.TEAM_DELETED, { partyId, actor });
    clearPartyRoom(partyId);
    return;
  }

  emitToParty(partyId, SocketEvent.TEAM_MEMBER_LEFT, { partyId, userId, members, actor });
  // After the emit, so the leaver still receives the event that confirms it.
  removeUserFromPartyRoom(userId, partyId);

  await notifyMany(
    members.map((member) => ({
      userId: member.userId,
      type: NotificationType.MEMBER_LEFT,
      title: "Member left",
      body: `${actor.username} left "${party.name}".`,
      payload: { partyId },
    }))
  );

  if (outcome.kind === "promoted") {
    emitToParty(partyId, SocketEvent.TEAM_LEADER_CHANGED, {
      partyId,
      leaderId: outcome.heirId,
      previousLeaderId: userId,
      members,
      actor,
    });

    await recordAudit({
      actorId: actor.userId,
      action: AuditAction.PARTY_LEADER_CHANGED,
      targetType: "party",
      targetId: partyId,
      metadata: { from: userId, to: outcome.heirId, reason: "leader left" },
    });

    await notify({
      userId: outcome.heirId,
      type: NotificationType.LEADER_CHANGED,
      title: "You are now the leader",
      body: `You lead "${party.name}" after ${actor.username} left.`,
      payload: { partyId },
    });
  }
}

/** Leader removes another member. */
export async function removeMemberFromParty(
  partyId: string,
  leaderId: string,
  targetUserId: string,
  actor: Actor
): Promise<PartyDetails> {
  const { party, remaining } = await withTransaction(async (client) => {
    const locked = await findPartyForUpdate(partyId, client);
    if (!locked) throw ApiError.notFound("Team not found");

    assertLeader(locked, leaderId);

    if (targetUserId === leaderId) {
      throw ApiError.badRequest(
        "A leader cannot remove themselves. Transfer leadership or leave the team."
      );
    }

    if (!(await removeMember(partyId, targetUserId, client))) {
      throw ApiError.notFound("That player is not in this team");
    }

    return { party: locked, remaining: await findMembers(partyId, client) };
  });

  const members = toMembers(remaining, party.leaderid);

  await recordAudit({
    actorId: actor.userId,
    action: AuditAction.MEMBER_REMOVED,
    targetType: "party",
    targetId: partyId,
    metadata: { userId: targetUserId },
  });

  emitToParty(partyId, SocketEvent.TEAM_MEMBER_REMOVED, {
    partyId,
    userId: targetUserId,
    members,
    actor,
  });

  // The removed user has left the room, so their copy goes to their personal
  // room — otherwise the one person who most needs to know is the only one who
  // never hears about it.
  emitToUser(targetUserId, SocketEvent.TEAM_MEMBER_REMOVED, {
    partyId,
    userId: targetUserId,
    members,
    actor,
  });

  removeUserFromPartyRoom(targetUserId, partyId);

  await notify({
    userId: targetUserId,
    type: NotificationType.YOU_WERE_REMOVED,
    title: "Removed from team",
    body: `You were removed from "${party.name}".`,
    payload: { partyId },
  });

  await notifyMany(
    members
      .filter((member) => member.userId !== actor.userId)
      .map((member) => ({
        userId: member.userId,
        type: NotificationType.MEMBER_REMOVED,
        title: "Member removed",
        body: `${actor.username} removed a player from "${party.name}".`,
        payload: { partyId },
      }))
  );

  return toDetails(party, remaining);
}

export async function renameParty(
  partyId: string,
  leaderId: string,
  name: string,
  actor: Actor
): Promise<PartySummary> {
  const party = await findParty(partyId);
  if (!party) throw ApiError.notFound("Team not found");
  assertLeader(party, leaderId);

  const clash = await findPartyByName(name);
  if (clash && clash.id !== partyId) {
    throw ApiError.conflict("A team with that name already exists");
  }

  const updated = await updateParty(partyId, { name });
  if (!updated) throw ApiError.notFound("Team not found");

  const members = await findMembers(partyId);

  await recordAudit({
    actorId: actor.userId,
    action: AuditAction.PARTY_RENAMED,
    targetType: "party",
    targetId: partyId,
    metadata: { from: party.name, to: name },
  });

  emitToParty(partyId, SocketEvent.TEAM_RENAMED, {
    partyId,
    name,
    previousName: party.name,
    actor,
  });

  return toSummary(updated, members.length);
}

/** Sets or clears the team password; `null` removes it. */
export async function setPartyPassword(
  partyId: string,
  leaderId: string,
  password: string | null,
  actor: Actor
): Promise<PartySummary> {
  const party = await findParty(partyId);
  if (!party) throw ApiError.notFound("Team not found");
  assertLeader(party, leaderId);

  const updated = await updateParty(partyId, {
    passwordHash: password === null ? null : hashPartyPassword(password),
  });
  if (!updated) throw ApiError.notFound("Team not found");

  const members = await findMembers(partyId);

  await recordAudit({
    actorId: actor.userId,
    action:
      password === null ? AuditAction.PARTY_PASSWORD_REMOVED : AuditAction.PARTY_PASSWORD_SET,
    targetType: "party",
    targetId: partyId,
  });

  emitToParty(partyId, SocketEvent.TEAM_UPDATED, {
    party: toDetails(updated, members),
    actor,
  });

  return toSummary(updated, members.length);
}

export async function setPartyVisibility(
  partyId: string,
  leaderId: string,
  visibility: PartyVisibility,
  actor: Actor
): Promise<PartySummary> {
  const party = await findParty(partyId);
  if (!party) throw ApiError.notFound("Team not found");
  assertLeader(party, leaderId);

  const updated = await updateParty(partyId, { visibility });
  if (!updated) throw ApiError.notFound("Team not found");

  const members = await findMembers(partyId);

  await recordAudit({
    actorId: actor.userId,
    action: AuditAction.PARTY_VISIBILITY_CHANGED,
    targetType: "party",
    targetId: partyId,
    metadata: { from: party.visibility, to: visibility },
  });

  emitToParty(partyId, SocketEvent.TEAM_UPDATED, {
    party: toDetails(updated, members),
    actor,
  });

  return toSummary(updated, members.length);
}

export async function setPartyLock(
  partyId: string,
  leaderId: string,
  isLocked: boolean,
  actor: Actor
): Promise<PartySummary> {
  const party = await findParty(partyId);
  if (!party) throw ApiError.notFound("Team not found");
  assertLeader(party, leaderId);

  const updated = await updateParty(partyId, { isLocked });
  if (!updated) throw ApiError.notFound("Team not found");

  const members = await findMembers(partyId);
  const mapped = toMembers(members, updated.leaderid);

  await recordAudit({
    actorId: actor.userId,
    action: isLocked ? AuditAction.PARTY_LOCKED : AuditAction.PARTY_UNLOCKED,
    targetType: "party",
    targetId: partyId,
  });

  emitToParty(partyId, isLocked ? SocketEvent.TEAM_LOCKED : SocketEvent.TEAM_UNLOCKED, {
    partyId,
    actor,
  });

  await notifyMany(
    mapped
      .filter((member) => member.userId !== actor.userId)
      .map((member) => ({
        userId: member.userId,
        type: isLocked ? NotificationType.TEAM_LOCKED : NotificationType.TEAM_UNLOCKED,
        title: isLocked ? "Team locked" : "Team unlocked",
        body: `${actor.username} ${isLocked ? "locked" : "unlocked"} "${party.name}".`,
        payload: { partyId },
      }))
  );

  return toSummary(updated, members.length);
}

/** Hands leadership to another current member. */
export async function transferLeadership(
  partyId: string,
  leaderId: string,
  newLeaderId: string,
  actor: Actor
): Promise<PartyDetails> {
  const { party, members } = await withTransaction(async (client) => {
    const locked = await findPartyForUpdate(partyId, client);
    if (!locked) throw ApiError.notFound("Team not found");

    assertLeader(locked, leaderId);

    if (newLeaderId === leaderId) {
      throw ApiError.badRequest("You are already the leader");
    }

    // The new leader must already be on the team — otherwise leadership could be
    // handed to an outsider, who would then control a team they never joined.
    if (!(await isMember(partyId, newLeaderId, client))) {
      throw ApiError.badRequest("The new leader must be a member of this team");
    }

    const updated = await updateParty(partyId, { leaderId: newLeaderId }, client);
    return { party: updated!, members: await findMembers(partyId, client) };
  });

  const mapped = toMembers(members, newLeaderId);

  await recordAudit({
    actorId: actor.userId,
    action: AuditAction.PARTY_LEADER_CHANGED,
    targetType: "party",
    targetId: partyId,
    metadata: { from: leaderId, to: newLeaderId, reason: "transferred" },
  });

  emitToParty(partyId, SocketEvent.TEAM_LEADER_CHANGED, {
    partyId,
    leaderId: newLeaderId,
    previousLeaderId: leaderId,
    members: mapped,
    actor,
  });

  await notify({
    userId: newLeaderId,
    type: NotificationType.LEADER_CHANGED,
    title: "You are now the leader",
    body: `${actor.username} made you leader of "${party.name}".`,
    payload: { partyId },
  });

  return toDetails(party, members);
}

/** Leader disbands the team. */
export async function deleteParty(
  partyId: string,
  leaderId: string,
  actor: Actor
): Promise<void> {
  const { party, members } = await withTransaction(async (client) => {
    const locked = await findPartyForUpdate(partyId, client);
    if (!locked) throw ApiError.notFound("Team not found");

    assertLeader(locked, leaderId);

    const roster = await findMembers(partyId, client);
    await deletePartyRow(partyId, client);
    return { party: locked, members: roster };
  });

  await recordAudit({
    actorId: actor.userId,
    action: AuditAction.PARTY_DELETED,
    targetType: "party",
    targetId: partyId,
    metadata: { name: party.name, memberCount: members.length },
  });

  // Emitted while sockets are still in the room, so members receive it before
  // the room is torn down.
  emitToParty(partyId, SocketEvent.TEAM_DELETED, { partyId, actor });
  clearPartyRoom(partyId);

  await notifyMany(
    members
      .filter((member) => member.userid !== actor.userId)
      .map((member) => ({
        userId: member.userid,
        type: NotificationType.TEAM_DELETED,
        title: "Team disbanded",
        body: `"${party.name}" was disbanded by ${actor.username}.`,
        payload: { partyId },
      }))
  );
}
