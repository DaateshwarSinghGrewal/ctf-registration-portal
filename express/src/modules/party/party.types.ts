/**
 * `userId` is user_auth.userid — a UUID — so it is carried as a string end to
 * end. `partyId` is the six-character invite code and doubles as the primary
 * key: the code is the team's public handle, and a separate surrogate id would
 * mean every lookup by code needed a join.
 */

export enum PartyVisibility {
  /** Joinable immediately with the invite code (and password, if one is set). */
  PUBLIC = "PUBLIC",
  /** The code only lets you request; the leader must accept. */
  PRIVATE = "PRIVATE",
}

export interface PartyMember {
  userId: string;
  username: string;
  isLeader: boolean;
  joinedAt: Date;
}

/**
 * Team without its roster — what list endpoints and the create response
 * return.
 *
 * `hasPassword` rather than the hash: whether a team is password-protected is
 * information the UI needs, and the hash is not.
 */
export interface PartySummary {
  id: string;
  name: string;
  leaderId: string;
  maxPlayers: number;
  memberCount: number;
  hasPassword: boolean;
  visibility: PartyVisibility;
  isLocked: boolean;
  createdAt: Date;
}

export interface PartyDetails extends PartySummary {
  members: PartyMember[];
}

/** Row shape of `parties` (unquoted columns → lowercase keys). */
export interface PartyRecord {
  id: string;
  name: string;
  passwordhash: string | null;
  leaderid: string;
  maxplayers: number;
  visibility: PartyVisibility;
  islocked: boolean;
  createdat: Date;
  updatedat: Date;
}

export interface PartyMemberRecord {
  userid: string;
  username: string;
  joinedat: Date;
}

export interface CreatePartyInput {
  leaderId: string;
  name: string;
  password?: string;
  maxPlayers?: number;
  visibility?: PartyVisibility;
}

export function toSummary(row: PartyRecord, memberCount: number): PartySummary {
  return {
    id: row.id,
    name: row.name,
    leaderId: row.leaderid,
    maxPlayers: row.maxplayers,
    memberCount,
    hasPassword: row.passwordhash !== null,
    visibility: row.visibility,
    isLocked: row.islocked,
    createdAt: row.createdat,
  };
}

export function toMembers(rows: PartyMemberRecord[], leaderId: string): PartyMember[] {
  return rows.map((row) => ({
    userId: row.userid,
    username: row.username,
    isLeader: row.userid === leaderId,
    joinedAt: row.joinedat,
  }));
}

export function toDetails(row: PartyRecord, memberRows: PartyMemberRecord[]): PartyDetails {
  return {
    ...toSummary(row, memberRows.length),
    members: toMembers(memberRows, row.leaderid),
  };
}
