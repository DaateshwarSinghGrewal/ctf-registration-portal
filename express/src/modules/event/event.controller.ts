import type { Request, Response } from "express";
import { ok } from "../../core/http/respond.js";
import { getEventSettings, setRegistrationOpen } from "./event.service.js";

/**
 * Public read of registration state — no authentication.
 *
 * The landing page has to show whether registration is open before anyone signs
 * in, and there is nothing sensitive here.
 */
export async function getStatus(_req: Request, res: Response): Promise<void> {
  ok(res, await getEventSettings());
}

/** Admin-only. Mounted under /admin, so the role gate is applied there. */
export async function updateStatus(req: Request, res: Response): Promise<void> {
  const { registrationOpen, registrationClosesAt } = req.body as {
    registrationOpen: boolean;
    registrationClosesAt?: string | null;
  };

  const settings = await setRegistrationOpen(
    registrationOpen,
    req.user!.userId,
    registrationClosesAt ? new Date(registrationClosesAt) : null
  );

  ok(res, settings, registrationOpen ? "Registration opened" : "Registration closed");
}
