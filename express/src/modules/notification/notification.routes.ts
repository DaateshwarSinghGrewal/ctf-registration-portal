import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../core/http/asyncHandler.js";
import { validate } from "../../core/middleware/validate.js";
import { listMine, markAllRead, markOneRead } from "./notification.controller.js";

/**
 * Notification inbox.
 *
 * These endpoints are the durable counterpart to the `notification:new` socket
 * event: the socket covers a user who is connected, this covers everything they
 * missed. Both read the same rows, so they cannot disagree.
 */
const router = Router();

const listQuerySchema = z.object({
  // Capped: an uncapped limit lets one request ask for every notification ever.
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  unreadOnly: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

const idParamSchema = z.object({ notificationId: z.uuid() });

router.get("/", validate({ query: listQuerySchema }), asyncHandler(listMine));

router.post("/read-all", asyncHandler(markAllRead));

router.post(
  "/:notificationId/read",
  validate({ params: idParamSchema }),
  asyncHandler(markOneRead)
);

export default router;
