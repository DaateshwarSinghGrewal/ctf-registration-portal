import type { Request, Response } from "express";
import { ok } from "../../core/http/respond.js";
import { pathParam } from "../../core/http/params.js";
import { queryAuditLog } from "../audit/audit.service.js";
import type { Role } from "../auth/auth.types.js";
import { validatedQuery } from "../../core/middleware/validate.js";
import * as service from "./admin.service.js";

export async function listUsers(req: Request, res: Response): Promise<void> {
  const { limit, offset } = validatedQuery<{ limit: number; offset: number }>(req);
  ok(res, await service.listUsers(limit, offset));
}

export async function getUser(req: Request, res: Response): Promise<void> {
  ok(res, await service.getUser(pathParam(req, "userId")));
}

export async function changeUserRole(req: Request, res: Response): Promise<void> {
  const { role } = req.body as { role: Role };
  const user = await service.changeUserRole(req.user!.userId, pathParam(req, "userId"), role);
  ok(res, user, "Role updated");
}

export async function deleteParty(req: Request, res: Response): Promise<void> {
  await service.forceDeleteParty(req.user!.userId, pathParam(req, "partyId"));
  ok(res, null, "Team deleted");
}

export async function removeMember(req: Request, res: Response): Promise<void> {
  await service.forceRemoveMember(req.user!.userId, pathParam(req, "partyId"), pathParam(req, "userId"));
  ok(res, null, "Member removed from team");
}

export async function listAuditLog(req: Request, res: Response): Promise<void> {
  const { limit, offset, action, actorId } = validatedQuery<{
    limit: number;
    offset: number;
    action?: string;
    actorId?: string;
  }>(req);

  ok(res, await queryAuditLog({ limit, offset, action, actorId }));
}
