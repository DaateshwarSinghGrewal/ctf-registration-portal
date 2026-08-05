import type { Request, Response } from "express";
import { ok } from "../../core/http/respond.js";
import * as service from "./profile.service.js";
import type { ProfileInput } from "./profile.types.js";

/** `data: null` rather than a 404 — "no profile yet" is the normal first state. */
export async function getMyProfile(req: Request, res: Response): Promise<void> {
  const profile = await service.getProfile(req.user!.userId);
  ok(res, profile, profile ? "OK" : "No profile yet");
}

export async function saveMyProfile(req: Request, res: Response): Promise<void> {
  const profile = await service.saveProfile(req.user!.userId, req.body as ProfileInput);
  ok(res, profile, "Profile saved");
}
