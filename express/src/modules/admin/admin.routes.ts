import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../core/http/asyncHandler.js";
import { authenticateUser } from "../../core/middleware/authenticateUser.js";
import { requireAdmin } from "../../core/middleware/authorize.js";
import { validate } from "../../core/middleware/validate.js";
import { Role } from "../auth/auth.types.js";
import { AuditAction } from "../audit/audit.types.js";
import { updateStatus } from "../event/event.controller.js";
import { partyIdSchema } from "../party/party.schema.js";
import * as controller from "./admin.controller.js";

const router = Router();

// Applied at the router, not per route: a new admin endpoint is then protected
// by default, rather than protected only if someone remembers to add the guard.
router.use(authenticateUser, requireAdmin);

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const userIdParamSchema = z.object({ userId: z.uuid("userId must be a valid user id") });

/* --- users ---------------------------------------------------------------- */
router.get("/users", validate({ query: paginationSchema }), asyncHandler(controller.listUsers));

router.get(
  "/users/:userId",
  validate({ params: userIdParamSchema }),
  asyncHandler(controller.getUser)
);

router.patch(
  "/users/:userId/role",
  validate({ params: userIdParamSchema, body: z.object({ role: z.enum(Role) }) }),
  asyncHandler(controller.changeUserRole)
);

/* --- team overrides ------------------------------------------------------- */
router.delete(
  "/parties/:partyId",
  validate({ params: z.object({ partyId: partyIdSchema }) }),
  asyncHandler(controller.deleteParty)
);

router.delete(
  "/parties/:partyId/members/:userId",
  validate({
    params: z.object({
      partyId: partyIdSchema,
      userId: z.uuid("userId must be a valid user id"),
    }),
  }),
  asyncHandler(controller.removeMember)
);

/* --- registration control ------------------------------------------------ */
router.patch(
  "/registration",
  validate({
    body: z.object({
      registrationOpen: z.boolean(),
      // ISO 8601. Optional: closing now and scheduling a close are different
      // actions, and omitting it leaves any existing deadline untouched.
      registrationClosesAt: z.iso.datetime().nullish(),
    }),
  }),
  asyncHandler(updateStatus)
);

/* --- audit --------------------------------------------------------------- */
router.get(
  "/audit",
  validate({
    query: paginationSchema.extend({
      action: z.enum(AuditAction).optional(),
      actorId: z.uuid().optional(),
    }),
  }),
  asyncHandler(controller.listAuditLog)
);

export default router;
