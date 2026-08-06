import { env } from "../../config/env.js";
import { findUserById, upsertGoogleUser } from "../../database/user.repository.js";
import { hasProfile } from "../profile/profile.repository.js";
import { Role, type AuthenticatedUser, type GoogleProfile, type UserRecord } from "./auth.types.js";

/**
 * Resolves the role for an email at sign-in time.
 *
 * Role is derived from configuration rather than stored-and-forgotten because
 * there was previously no way to create the first ADMIN at all: every account
 * defaulted to PLAYER and /admin/* was unreachable by anyone, including
 * whoever needed to promote the first admin. Re-deriving on each login also
 * means removing an address from ADMIN_EMAILS demotes that account, with no
 * database surgery.
 */
function roleFor(email: string): Role | undefined {
  return env.adminEmails.includes(email.toLowerCase()) ? Role.ADMIN : undefined;
}

/**
 * Returns the `user_auth` row for a verified Google profile, creating it on
 * first sign-in. A first-time Google account is the expected entry point for a
 * registration portal, not an error.
 */
export function findOrCreateUserFromGoogle(profile: GoogleProfile): Promise<UserRecord> {
  return upsertGoogleUser(profile.googleId, profile.email, roleFor(profile.email));
}

/**
 * Builds the GET /auth/me payload.
 *
 * Reads the user fresh instead of echoing the JWT claims: a role change or a
 * newly completed profile must be visible immediately, not after the token's
 * five-hour lifetime. Returns null when the row is gone (a deleted account
 * holding a still-valid token), which the caller turns into a 401.
 */
export async function describeUser(userId: string): Promise<AuthenticatedUser | null> {
  const [user, profileExists] = await Promise.all([findUserById(userId), hasProfile(userId)]);

  if (!user) return null;

  return {
    userId: user.userid,
    email: user.email,
    username: user.username,
    role: user.role,
    hasProfile: profileExists,
  };
}
