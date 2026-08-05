/**
 * Every auditable action in the system.
 *
 * A closed enum rather than free strings: an audit log whose `action` values
 * are typo'd is unqueryable, and these are the values an admin filters on.
 */
export enum AuditAction {
  USER_SIGNED_IN = "USER_SIGNED_IN",
  USER_ROLE_CHANGED = "USER_ROLE_CHANGED",

  PROFILE_CREATED = "PROFILE_CREATED",
  PROFILE_UPDATED = "PROFILE_UPDATED",

  PARTY_CREATED = "PARTY_CREATED",
  PARTY_RENAMED = "PARTY_RENAMED",
  PARTY_DELETED = "PARTY_DELETED",
  PARTY_PASSWORD_SET = "PARTY_PASSWORD_SET",
  PARTY_PASSWORD_REMOVED = "PARTY_PASSWORD_REMOVED",
  PARTY_VISIBILITY_CHANGED = "PARTY_VISIBILITY_CHANGED",
  PARTY_LOCKED = "PARTY_LOCKED",
  PARTY_UNLOCKED = "PARTY_UNLOCKED",
  PARTY_LEADER_CHANGED = "PARTY_LEADER_CHANGED",

  MEMBER_JOINED = "MEMBER_JOINED",
  MEMBER_LEFT = "MEMBER_LEFT",
  MEMBER_REMOVED = "MEMBER_REMOVED",

  JOIN_REQUEST_CREATED = "JOIN_REQUEST_CREATED",
  JOIN_REQUEST_ACCEPTED = "JOIN_REQUEST_ACCEPTED",
  JOIN_REQUEST_REJECTED = "JOIN_REQUEST_REJECTED",
  JOIN_REQUEST_CANCELLED = "JOIN_REQUEST_CANCELLED",

  REGISTRATION_OPENED = "REGISTRATION_OPENED",
  REGISTRATION_CLOSED = "REGISTRATION_CLOSED",
}

export interface AuditEntry {
  /** Null for system-initiated actions (a scheduled registration close). */
  actorId: string | null;
  action: AuditAction;
  /** Coarse kind of the thing acted on — "party", "user", "event". */
  targetType: string;
  targetId?: string | null;
  /** Action-specific context: the old and new name on a rename, etc. */
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

export interface AuditLogRecord {
  id: string;
  actorid: string | null;
  actorusername: string | null;
  action: AuditAction;
  targettype: string;
  targetid: string | null;
  metadata: Record<string, unknown>;
  ipaddress: string | null;
  createdat: Date;
}
