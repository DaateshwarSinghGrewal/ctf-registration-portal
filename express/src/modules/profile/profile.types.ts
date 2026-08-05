/** Row shape of `player_profiles` (unquoted columns → lowercase keys). */
export interface ProfileRecord {
  userid: string;
  fullname: string;
  phone: string;
  discordusername: string;
  year: number;
  branch: string;
  rollnumber: string;
  createdat: Date;
  updatedat: Date;
}

/** API representation — camelCase, as every other response uses. */
export interface Profile {
  userId: string;
  fullName: string;
  phone: string;
  discordUsername: string;
  year: number;
  branch: string;
  rollNumber: string;
  updatedAt: Date;
}

export interface ProfileInput {
  fullName: string;
  phone: string;
  discordUsername: string;
  year: number;
  branch: string;
  rollNumber: string;
}

export function toProfile(row: ProfileRecord): Profile {
  return {
    userId: row.userid,
    fullName: row.fullname,
    phone: row.phone,
    discordUsername: row.discordusername,
    year: row.year,
    branch: row.branch,
    rollNumber: row.rollnumber,
    updatedAt: row.updatedat,
  };
}
