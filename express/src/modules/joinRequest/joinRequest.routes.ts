import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../core/http/asyncHandler.js";
import { validate } from "../../core/middleware/validate.js";
import { createRateLimiter } from "../../core/middleware/rateLimiter.js";
import * as controller from "./joinRequest.controller.js";

const writeLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  keyPrefix: "join_request_write",
});

/**
 * Resolution endpoints for join requests, mounted at /join-requests.
 *
 * Addressed by request id rather than nested under /party/:partyId, because the
 * id alone identifies the request and the team is derived from it — a nested
 * path would carry a party id that has to be cross-checked against the request's
 * own, which is a second source of truth for no gain.
 *
 * Listing and creating requests live under the team (party.routes.ts), where the
 * team is the subject.
 */
const router = Router();

const requestIdParamSchema = z.object({
  requestId: z.uuid("requestId must be a valid request id"),
});

router.post(
  "/:requestId/accept",
  writeLimiter,
  validate({ params: requestIdParamSchema }),
  asyncHandler(controller.acceptRequest)
);

router.post(
  "/:requestId/reject",
  writeLimiter,
  validate({ params: requestIdParamSchema }),
  asyncHandler(controller.rejectRequest)
);

router.delete(
  "/:requestId",
  writeLimiter,
  validate({ params: requestIdParamSchema }),
  asyncHandler(controller.cancelRequest)
);

export default router;
