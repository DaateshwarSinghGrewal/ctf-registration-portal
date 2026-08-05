/**
 * Room naming.
 *
 * Centralised because a room name is a string shared between whoever joins it
 * and whoever emits to it: build it in two places and a broadcast silently goes
 * nowhere. The prefixes also stop a party id from ever colliding with a user id
 * in the same namespace.
 */

/** Everyone in one team. Membership changes as people join and leave. */
export const partyRoom = (partyId: string): string => `party:${partyId}`;

/**
 * All of one user's connections. A user can have several — two tabs, a phone —
 * and a personal notification has to reach all of them, so it is a room rather
 * than a single socket id.
 */
export const userRoom = (userId: string): string => `user:${userId}`;
