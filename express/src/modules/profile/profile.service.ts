import { ApiError } from "../../core/http/ApiError.js";
import { recordAudit } from "../audit/audit.service.js";
import { AuditAction } from "../audit/audit.types.js";
import { findProfile, hasProfile, upsertProfile } from "./profile.repository.js";
import { toProfile, type Profile, type ProfileInput } from "./profile.types.js";

const UNIQUE_VIOLATION = "23505";

export async function getProfile(userId: string): Promise<Profile | null> {
  const row = await findProfile(userId);
  return row ? toProfile(row) : null;
}

/**
 * Creates or updates the caller's profile.
 *
 * The roll-number uniqueness check is delegated to the database's partial
 * unique index rather than a preceding SELECT: a check-then-insert leaves a
 * window where two concurrent submissions both pass the check, and duplicate
 * registrations are exactly what that constraint exists to prevent.
 */
export async function saveProfile(userId: string, input: ProfileInput): Promise<Profile> {
  const existed = await hasProfile(userId);

  try {
    const row = await upsertProfile(userId, input);

    await recordAudit({
      actorId: userId,
      action: existed ? AuditAction.PROFILE_UPDATED : AuditAction.PROFILE_CREATED,
      targetType: "user",
      targetId: userId,
    });

    return toProfile(row);
  } catch (error) {
    if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
      throw ApiError.conflict(
        "That roll number is already registered to another account."
      );
    }
    throw error;
  }
}

/**
 * Guard used by the team routes: a team of anonymous accounts is useless to an
 * event organiser, so a profile is required before creating or joining one.
 */
export async function assertProfileComplete(userId: string): Promise<void> {
  if (!(await hasProfile(userId))) {
    throw ApiError.forbidden(
      "Complete your player profile before creating or joining a team."
    );
  }
}
