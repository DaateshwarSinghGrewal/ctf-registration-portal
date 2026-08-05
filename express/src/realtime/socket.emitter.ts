import type { Server } from "socket.io";
import { logger } from "../core/logger.js";
import { partyRoom, userRoom } from "./socket.rooms.js";
import { SocketEvent, type SocketEventName, type SocketEventPayloads } from "./socket.events.js";

/**
 * The broadcast surface services use.
 *
 * Services must not import the Socket.IO server directly: party.service would
 * then depend on the realtime server, which depends on the party repository — a
 * cycle. The instance is injected here at bootstrap and the rest of the app talks
 * to these three functions.
 *
 * Every emit is a no-op before a server is attached, rather than an error. That
 * is what lets `npm run migrate`, a script, or a test import a service without
 * standing up a websocket server.
 */

let io: Server | null = null;

export function attachSocketServer(server: Server): void {
  io = server;
}

export function detachSocketServer(): void {
  io = null;
}

/** Broadcasts to everyone in a team's room. */
export function emitToParty<E extends SocketEventName>(
  partyId: string,
  event: E,
  payload: SocketEventPayloads[E]
): void {
  if (!io) return;
  logger.debug(`emit ${event} → ${partyRoom(partyId)}`);
  io.to(partyRoom(partyId)).emit(event, payload);
}

/** Delivers to every connection belonging to one user. */
export function emitToUser<E extends SocketEventName>(
  userId: string,
  event: E,
  payload: SocketEventPayloads[E]
): void {
  if (!io) return;
  logger.debug(`emit ${event} → ${userRoom(userId)}`);
  io.to(userRoom(userId)).emit(event, payload);
}

/** Event-wide announcement — registration opening or closing. */
export function emitToAll<E extends SocketEventName>(
  event: E,
  payload: SocketEventPayloads[E]
): void {
  if (!io) return;
  logger.debug(`emit ${event} → all`);
  io.emit(event, payload);
}

/**
 * Recomputes who is online in a team and tells the room.
 *
 * Derived from the sockets actually in the room rather than a local map, so it
 * stays correct under the Redis adapter where a teammate may be connected to a
 * different instance.
 *
 * Called on every room change as well as on connect and disconnect. Emitting
 * only on connect/disconnect looked right in isolation but meant a user who
 * joined a team while already connected showed as offline to their teammates
 * until someone reloaded — the exact staleness realtime is meant to remove.
 */
export async function emitPresence(partyId: string): Promise<void> {
  if (!io) return;

  const sockets = await io.in(partyRoom(partyId)).fetchSockets();
  const onlineUserIds = [
    ...new Set(
      sockets.map((socket) => socket.data.auth?.userId).filter((id): id is string => !!id)
    ),
  ];

  io.to(partyRoom(partyId)).emit(SocketEvent.PRESENCE_UPDATE, { partyId, onlineUserIds });
}

/** Fire-and-forget presence refresh; a failure here must not fail the caller's action. */
function refreshPresence(partyId: string): void {
  void emitPresence(partyId).catch((error: unknown) => {
    logger.warn(`Presence refresh failed for ${partyId}`, error);
  });
}

/**
 * Moves a user's live sockets into a team's room.
 *
 * Room membership is resolved once at connect time from the database, which is
 * only correct for a user who was already on a team. Someone who connects first
 * and then creates or joins a team would otherwise sit outside the room and
 * receive none of its events — the team page would look frozen until a reload.
 *
 * Must be called before the event that announces the change, or the user misses
 * the very event that concerns them. Works across instances under the Redis
 * adapter.
 */
export function addUserToPartyRoom(userId: string, partyId: string): void {
  if (!io) return;
  logger.debug(`room join ${userRoom(userId)} → ${partyRoom(partyId)}`);
  io.in(userRoom(userId)).socketsJoin(partyRoom(partyId));
  refreshPresence(partyId);
}

/**
 * Removes a user's sockets from a team's room, so someone who left or was removed
 * stops receiving that team's events without having to reconnect.
 *
 * Call it after the announcing event, so the departing user still receives the
 * one that explains why.
 */
export function removeUserFromPartyRoom(userId: string, partyId: string): void {
  if (!io) return;
  logger.debug(`room leave ${userRoom(userId)} → ${partyRoom(partyId)}`);
  io.in(userRoom(userId)).socketsLeave(partyRoom(partyId));
  refreshPresence(partyId);
}

/** Empties a team's room once the team no longer exists. */
export function clearPartyRoom(partyId: string): void {
  if (!io) return;
  io.in(partyRoom(partyId)).socketsLeave(partyRoom(partyId));
}
