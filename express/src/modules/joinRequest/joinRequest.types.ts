export enum JoinRequestStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  /** Withdrawn by the requester before the leader acted on it. */
  CANCELLED = "CANCELLED",
}

export interface JoinRequestRecord {
  id: string;
  partyid: string;
  userid: string;
  username: string;
  status: JoinRequestStatus;
  createdat: Date;
  resolvedat: Date | null;
}

export interface JoinRequest {
  id: string;
  partyId: string;
  userId: string;
  username: string;
  status: JoinRequestStatus;
  createdAt: Date;
  resolvedAt: Date | null;
}

export function toJoinRequest(row: JoinRequestRecord): JoinRequest {
  return {
    id: row.id,
    partyId: row.partyid,
    userId: row.userid,
    username: row.username,
    status: row.status,
    createdAt: row.createdat,
    resolvedAt: row.resolvedat,
  };
}
