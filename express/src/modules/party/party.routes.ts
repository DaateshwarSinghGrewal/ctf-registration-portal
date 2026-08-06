import { Router } from "express";
import { asyncHandler } from "../../core/http/asyncHandler.js";
import { validate } from "../../core/middleware/validate.js";
import { createRateLimiter } from "../../core/middleware/rateLimiter.js";
import * as controller from "./party.controller.js";
import {
  createPartySchema,
  joinPartySchema,
  kickBodySchema,
  memberParamSchema,
  partyIdParamSchema,
  renamePartySchema,
  setLockSchema,
  setPasswordSchema,
  setVisibilitySchema,
  transferLeadershipSchema,
} from "./party.schema.js";
import * as joinRequestController from "../joinRequest/joinRequest.controller.js";

/**
 * Team routes. Mounted behind `authenticateUser`, so every handler has a
 * `req.user`.
 *
 * Leader-only authorisation is enforced in the service, not by middleware here:
 * it needs the team row to know who the leader is, and duplicating that read in
 * a guard would mean two places could disagree about who is in charge.
 */
const router = Router();

/**
 * Join attempts are the one guessable surface: an invite code is six hex
 * characters, and a password-protected team is only as private as the number of
 * guesses allowed. This is the brake on both.
 */
const joinLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 10,
  keyPrefix: "party:join",
  message: "Too many join attempts. Please wait a minute.",
});

const writeLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 30,
  keyPrefix: "party:write",
});

/* --- caller's own team ---------------------------------------------------- */
// Declared before "/:partyId" so the literal segment is not captured as a code.
router.get("/me", asyncHandler(controller.getMyParty));

/* --- create / join -------------------------------------------------------- */
router.post(
  "/create",
  writeLimiter,
  validate({ body: createPartySchema }),
  asyncHandler(controller.createParty)
);

router.post(
  "/join",
  joinLimiter,
  validate({ body: joinPartySchema }),
  asyncHandler(controller.joinParty)
);

/* --- join requests (private teams) --------------------------------------- */
router.get("/requests/mine", asyncHandler(joinRequestController.listMyRequests));

router.post(
  "/:partyId/requests",
  joinLimiter,
  validate({ params: partyIdParamSchema }),
  asyncHandler(joinRequestController.requestToJoin)
);

router.get(
  "/:partyId/requests",
  validate({ params: partyIdParamSchema }),
  asyncHandler(joinRequestController.listPendingRequests)
);

/* --- membership ----------------------------------------------------------- */
router.post(
  "/leave/:partyId",
  validate({ params: partyIdParamSchema }),
  asyncHandler(controller.leaveParty)
);

// Legacy shape the existing SPA calls; same service path as the RESTful route.
router.post(
  "/kick",
  writeLimiter,
  validate({ body: kickBodySchema }),
  asyncHandler(controller.kickMember)
);

router.delete(
  "/:partyId/members/:userId",
  writeLimiter,
  validate({ params: memberParamSchema }),
  asyncHandler(controller.removeMember)
);

/* --- leader actions ------------------------------------------------------- */
router.patch(
  "/:partyId/name",
  writeLimiter,
  validate({ params: partyIdParamSchema, body: renamePartySchema }),
  asyncHandler(controller.renameParty)
);

router.patch(
  "/:partyId/password",
  writeLimiter,
  validate({ params: partyIdParamSchema, body: setPasswordSchema }),
  asyncHandler(controller.setPassword)
);

router.patch(
  "/:partyId/visibility",
  writeLimiter,
  validate({ params: partyIdParamSchema, body: setVisibilitySchema }),
  asyncHandler(controller.setVisibility)
);

router.patch(
  "/:partyId/lock",
  writeLimiter,
  validate({ params: partyIdParamSchema, body: setLockSchema }),
  asyncHandler(controller.setLock)
);

router.patch(
  "/:partyId/leader",
  writeLimiter,
  validate({ params: partyIdParamSchema, body: transferLeadershipSchema }),
  asyncHandler(controller.transferLeadership)
);

router.delete(
  "/:partyId",
  writeLimiter,
  validate({ params: partyIdParamSchema }),
  asyncHandler(controller.deleteParty)
);

/* --- read ---------------------------------------------------------------- */
router.get("/public", asyncHandler(controller.listPublicParties));

// Last: a bare "/:partyId" would otherwise shadow every literal path above.
router.get(
  "/:partyId",
  validate({ params: partyIdParamSchema }),
  asyncHandler(controller.getParty)
);

export default router;
