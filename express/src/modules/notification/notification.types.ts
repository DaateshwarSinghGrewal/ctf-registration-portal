export enum NotificationType {
  TEAM_CREATED = "TEAM_CREATED",
  MEMBER_JOINED = "MEMBER_JOINED",
  MEMBER_LEFT = "MEMBER_LEFT",
  MEMBER_REMOVED = "MEMBER_REMOVED",
  YOU_WERE_REMOVED = "YOU_WERE_REMOVED",
  JOIN_REQUEST_RECEIVED = "JOIN_REQUEST_RECEIVED",
  JOIN_REQUEST_ACCEPTED = "JOIN_REQUEST_ACCEPTED",
  JOIN_REQUEST_REJECTED = "JOIN_REQUEST_REJECTED",
  LEADER_CHANGED = "LEADER_CHANGED",
  TEAM_LOCKED = "TEAM_LOCKED",
  TEAM_UNLOCKED = "TEAM_UNLOCKED",
  TEAM_FULL = "TEAM_FULL",
  TEAM_DELETED = "TEAM_DELETED",
  REGISTRATION_CLOSING_SOON = "REGISTRATION_CLOSING_SOON",
  REGISTRATION_CLOSED = "REGISTRATION_CLOSED",
  REGISTRATION_OPENED = "REGISTRATION_OPENED",
}

/** What a caller asks to be delivered. */
export interface NotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Type-specific context — a partyId the client can navigate to, etc. */
  payload?: Record<string, unknown>;
}

/** A persisted notification, as returned by the API and pushed over a channel. */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationRecord {
  id: string;
  userid: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  readat: Date | null;
  createdat: Date;
}

export function toNotification(row: NotificationRecord): Notification {
  return {
    id: row.id,
    userId: row.userid,
    type: row.type,
    title: row.title,
    body: row.body,
    payload: row.payload,
    readAt: row.readat,
    createdAt: row.createdat,
  };
}

/**
 * A way of getting a notification to a user.
 *
 * This is the seam that keeps notifications from being "socket emits with extra
 * steps". Sockets are one delivery mechanism — they reach a user who is
 * currently connected. Web push, email or SMS reach one who is not. Adding any
 * of those means writing a class here and registering it at bootstrap; no
 * calling code changes, because callers only ever talk to the service.
 *
 * `deliver` must not throw: a channel outage is not a reason to fail the
 * business action that triggered the notification. Implementations swallow and
 * log their own failures.
 */
export interface NotificationChannel {
  readonly name: string;
  deliver(notification: Notification): Promise<void>;
}
