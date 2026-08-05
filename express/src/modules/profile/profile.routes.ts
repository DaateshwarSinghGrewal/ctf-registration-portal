import { Router } from "express";
import { asyncHandler } from "../../core/http/asyncHandler.js";
import { validate } from "../../core/middleware/validate.js";
import { getMyProfile, saveMyProfile } from "./profile.controller.js";
import { profileInputSchema } from "./profile.schema.js";

/**
 * A user only ever reads or writes their own profile, so the id comes from the
 * session rather than the path. There is deliberately no /profile/:userId —
 * phone numbers and roll numbers are not public, and admins read them through
 * the admin module instead.
 */
const router = Router();

router.get("/", asyncHandler(getMyProfile));

// PUT, not POST: the client submits the whole form every time, so this is
// idempotent replacement rather than incremental creation.
router.put("/", validate({ body: profileInputSchema }), asyncHandler(saveMyProfile));

export default router;
