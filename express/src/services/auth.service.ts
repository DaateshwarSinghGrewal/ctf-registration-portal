import { upsertGoogleUser } from "../../../shared/db/user_auth.js";
import type { GoogleProfilePayload, UserAuthRecord } from "../types/auth.types.js";

/**
 * Returns the `user_auth` row for a verified Google profile, creating it on
 * first sign-in. This is a registration portal, so a first-time Google
 * account is the expected entry point rather than an error.
 *
 * Delegates to the shared upsert, which owns username derivation and the
 * retry for the UNIQUE(username) collision. It also refreshes lastLogin, so
 * the sign-in path needs no separate write.
 */
export function findOrCreateUserFromGoogle(
  profile: GoogleProfilePayload
): Promise<UserAuthRecord> {
  return upsertGoogleUser(profile.googleId, profile.email, profile.displayName);
}
