import type { Request, Response } from "express";
import { ok } from "../../core/http/respond.js";
import { pathParam } from "../../core/http/params.js";
import { validatedQuery } from "../../core/middleware/validate.js";
import * as service from "./notification.service.js";

export async function listMine(req: Request, res: Response): Promise<void> {
  const { limit, offset, unreadOnly } = validatedQuery<{
    limit: number;
    offset: number;
    unreadOnly: boolean;
  }>(req);

  const result = await service.getInbox(req.user!.userId, { limit, offset, unreadOnly });
  ok(res, result);
}

export async function markOneRead(req: Request, res: Response): Promise<void> {
  await service.readNotification(req.user!.userId, pathParam(req, "notificationId"));
  ok(res, null, "Notification marked read");
}

export async function markAllRead(req: Request, res: Response): Promise<void> {
  const updated = await service.readAllNotifications(req.user!.userId);
  ok(res, { updated }, "Notifications marked read");
}
