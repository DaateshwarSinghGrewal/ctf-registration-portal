import type { Notification } from "../modules/notification/notification.types.js";
import type { PartyDetails, PartyMember, PartySummary } from "../modules/party/party.types.js";
import type { JoinRequest, JoinRequestStatus } from "../modules/joinRequest/joinRequest.types.js";

/**
 * The complete set of server → client events.
 *
 * Names are declared once here and referenced everywhere, so a broadcast and the
 * listener for it cannot drift apart over a typo — a mistake that is invisible in
 * a stringly-typed `io.emit("team:memberJoined")` until someone notices the UI
 * never updates.
 *
 * Client → server events are deliberately absent. Realtime here is one-way:
 * state changes go through the REST API, which owns validation, authorisation and
 * the audit trail, and the socket reports what happened. Accepting mutations over
 * the socket would mean a second, parallel implementation of all three.
 */
export const SocketEvent = {
  // --- team lifecycle, broadcast to the team's room ---
  TEAM_CREATED: "team:created",
  TEAM_RENAMED: "team:renamed",
  TEAM_DELETED: "team:deleted",
  TEAM_UPDATED: "team:updated",
  TEAM_LOCKED: "team:locked",
  TEAM_UNLOCKED: "team:unlocked",
  TEAM_LEADER_CHANGED: "team:leaderChanged",

  // --- membership ---
  TEAM_MEMBER_JOINED: "team:memberJoined",
  TEAM_MEMBER_LEFT: "team:memberLeft",
  TEAM_MEMBER_REMOVED: "team:memberRemoved",

  // --- join requests ---
  TEAM_JOIN_REQUEST_CREATED: "team:joinRequestCreated",
  TEAM_JOIN_REQUEST_RESOLVED: "team:joinRequestResolved",

  // --- event-wide, broadcast to everyone connected ---
  REGISTRATION_OPENED: "registration:opened",
  REGISTRATION_CLOSED: "registration:closed",

  // --- per-user ---
  NOTIFICATION_NEW: "notification:new",
  PRESENCE_UPDATE: "presence:update",
} as const;

export type SocketEventName = (typeof SocketEvent)[keyof typeof SocketEvent];

/** Who caused an event — lets a client ignore the echo of its own action. */
export interface Actor {
  userId: string;
  username: string;
}

/**
 * Payload for each event.
 *
 * Membership events carry the full member list alongside the delta. The delta
 * alone would force every client to rebuild state from an event stream and
 * silently diverge if one event were missed during a reconnect; sending the
 * authoritative list makes each event self-healing.
 */
export interface SocketEventPayloads {
  [SocketEvent.TEAM_CREATED]: { party: PartySummary; actor: Actor };
  [SocketEvent.TEAM_RENAMED]: {
    partyId: string;
    name: string;
    previousName: string;
    actor: Actor;
  };
  [SocketEvent.TEAM_DELETED]: { partyId: string; actor: Actor };
  [SocketEvent.TEAM_UPDATED]: { party: PartyDetails; actor: Actor };
  [SocketEvent.TEAM_LOCKED]: { partyId: string; actor: Actor };
  [SocketEvent.TEAM_UNLOCKED]: { partyId: string; actor: Actor };
  [SocketEvent.TEAM_LEADER_CHANGED]: {
    partyId: string;
    leaderId: string;
    previousLeaderId: string;
    members: PartyMember[];
    actor: Actor;
  };

  [SocketEvent.TEAM_MEMBER_JOINED]: {
    partyId: string;
    member: PartyMember;
    members: PartyMember[];
    actor: Actor;
  };
  [SocketEvent.TEAM_MEMBER_LEFT]: {
    partyId: string;
    userId: string;
    members: PartyMember[];
    actor: Actor;
  };
  [SocketEvent.TEAM_MEMBER_REMOVED]: {
    partyId: string;
    userId: string;
    members: PartyMember[];
    actor: Actor;
  };

  [SocketEvent.TEAM_JOIN_REQUEST_CREATED]: { partyId: string; request: JoinRequest };
  [SocketEvent.TEAM_JOIN_REQUEST_RESOLVED]: {
    partyId: string;
    requestId: string;
    status: JoinRequestStatus;
    actor: Actor;
  };

  [SocketEvent.REGISTRATION_OPENED]: { at: string };
  [SocketEvent.REGISTRATION_CLOSED]: { at: string };

  [SocketEvent.NOTIFICATION_NEW]: { notification: Notification; unreadCount: number };
  [SocketEvent.PRESENCE_UPDATE]: { partyId: string; onlineUserIds: string[] };
}
