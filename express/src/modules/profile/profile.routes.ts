import { Router } from "express";
import { asyncHandler } from "../../core/http/asyncHandler.js";
import { validate } from "../../core/middleware/validate.js";
import { getMyProfile, saveMyProfile } from "./profile.controller.js";
import { profileInputSchema } from "./profile.schema.js";

/**
 * A user only ever reads or writes their own profile, so the id comes from the
 * session rather than the path. There is deliberately no /profile/:userId —
 * phone numbers and roll numbers are not public.
 *
 * KNOWN GAP: nothing can read another user's profile, including an admin. That
 * means the six registration fields this table exists to collect cannot be
 * retrieved by an organiser through the API at all — only by querying the
 * database directly. An admin-scoped read belongs in the admin module; see the
 * "Not built yet" section of endpoint.md.
 */
const router = Router();

router.get("/", asyncHandler(getMyProfile));

// PUT, not POST: the client submits the whole form every time, so this is
// idempotent replacement rather than incremental creation.
router.put("/", validate({ body: profileInputSchema }), asyncHandler(saveMyProfile));

export default router;
