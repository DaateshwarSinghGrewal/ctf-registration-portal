import type { Request, Response } from "express";
import { created, ok } from "../../core/http/respond.js";
import { pathParam } from "../../core/http/params.js";
import { ApiError } from "../../core/http/ApiError.js";
import { findUserById } from "../../database/user.repository.js";
import type { Actor } from "../../realtime/socket.events.js";
import * as service from "./joinRequest.service.js";

async function resolveActor(req: Request): Promise<Actor> {
  const { userId } = req.user!;
  const user = await findUserById(userId);
  if (!user) throw ApiError.unauthorized("Your account no longer exists");
  return { userId, username: user.username };
}

export async function requestToJoin(req: Request, res: Response): Promise<void> {
  const actor = await resolveActor(req);
  const request = await service.requestToJoin(pathParam(req, "partyId"), actor.userId, actor);
  created(res, request, "Join request sent");
}

export async function listPendingRequests(req: Request, res: Response): Promise<void> {
  const requests = await service.listPendingRequests(pathParam(req, "partyId"), req.user!.userId);
  ok(res, requests);
}

export async function listMyRequests(req: Request, res: Response): Promise<void> {
  ok(res, await service.listMyRequests(req.user!.userId));
}

export async function acceptRequest(req: Request, res: Response): Promise<void> {
  const actor = await resolveActor(req);
  const request = await service.acceptRequest(pathParam(req, "requestId"), actor.userId, actor);
  ok(res, request, "Join request accepted");
}

export async function rejectRequest(req: Request, res: Response): Promise<void> {
  const actor = await resolveActor(req);
  const request = await service.rejectRequest(pathParam(req, "requestId"), actor.userId, actor);
  ok(res, request, "Join request declined");
}

export async function cancelRequest(req: Request, res: Response): Promise<void> {
  const actor = await resolveActor(req);
  await service.cancelRequest(pathParam(req, "requestId"), actor.userId, actor);
  ok(res, null, "Join request withdrawn");
}
