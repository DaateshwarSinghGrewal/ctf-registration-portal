import type { Request, Response } from "express";
import { created, ok } from "../../core/http/respond.js";
import { pathParam } from "../../core/http/params.js";
import { findUserById } from "../../database/user.repository.js";
import { ApiError } from "../../core/http/ApiError.js";
import type { Actor } from "../../realtime/socket.events.js";
import * as partyService from "./party.service.js";
import type { PartyVisibility } from "./party.types.js";

/**
 * Resolves the acting user's display name for events and notifications.
 *
 * The JWT carries only id/email/role, and "rishank left the team" is far more
 * useful than a UUID. Read per action rather than baked into the token so a
 * username change is reflected immediately.
 */
async function resolveActor(req: Request): Promise<Actor> {
  const { userId } = req.user!;
  const user = await findUserById(userId);

  if (!user) {
    // The token is valid but the account is gone — the same condition /auth/me
    // treats as signed out.
    throw ApiError.unauthorized("Your account no longer exists");
  }

  return { userId, username: user.username };
}

export async function createParty(req: Request, res: Response): Promise<void> {
  const actor = await resolveActor(req);
  const { name, password, maxPlayers, visibility } = req.body as {
    name: string;
    password?: string;
    maxPlayers?: number;
    visibility?: PartyVisibility;
  };

  const party = await partyService.createParty(
    { leaderId: actor.userId, name, password, maxPlayers, visibility },
    actor
  );

  created(res, party, "Team created");
}

export async function joinParty(req: Request, res: Response): Promise<void> {
  const actor = await resolveActor(req);
  const { partyId, password } = req.body as { partyId: string; password?: string };

  const party = await partyService.joinParty(partyId, actor.userId, password, actor);
  ok(res, party, "Joined team");
}

/** The team the caller belongs to. `data: null` when they are in none. */
export async function getMyParty(req: Request, res: Response): Promise<void> {
  const party = await partyService.getMyParty(req.user!.userId);
  ok(res, party, party ? "OK" : "You are not in a team");
}

export async function getParty(req: Request, res: Response): Promise<void> {
  const party = await partyService.getPartyDetails(pathParam(req, "partyId"));
  ok(res, party);
}

export async function leaveParty(req: Request, res: Response): Promise<void> {
  const actor = await resolveActor(req);
  await partyService.leaveParty(pathParam(req, "partyId"), actor.userId, actor);
  ok(res, null, "Left team");
}

export async function deleteParty(req: Request, res: Response): Promise<void> {
  const actor = await resolveActor(req);
  await partyService.deleteParty(pathParam(req, "partyId"), actor.userId, actor);
  ok(res, null, "Team disbanded");
}

export async function renameParty(req: Request, res: Response): Promise<void> {
  const actor = await resolveActor(req);
  const { name } = req.body as { name: string };

  const party = await partyService.renameParty(pathParam(req, "partyId"), actor.userId, name, actor);
  ok(res, party, "Team renamed");
}

export async function setPassword(req: Request, res: Response): Promise<void> {
  const actor = await resolveActor(req);
  const { password } = req.body as { password: string | null };

  const party = await partyService.setPartyPassword(
    pathParam(req, "partyId"),
    actor.userId,
    password,
    actor
  );
  ok(res, party, password === null ? "Team password removed" : "Team password updated");
}

export async function setVisibility(req: Request, res: Response): Promise<void> {
  const actor = await resolveActor(req);
  const { visibility } = req.body as { visibility: PartyVisibility };

  const party = await partyService.setPartyVisibility(
    pathParam(req, "partyId"),
    actor.userId,
    visibility,
    actor
  );
  ok(res, party, "Team visibility updated");
}

export async function setLock(req: Request, res: Response): Promise<void> {
  const actor = await resolveActor(req);
  const { isLocked } = req.body as { isLocked: boolean };

  const party = await partyService.setPartyLock(
    pathParam(req, "partyId"),
    actor.userId,
    isLocked,
    actor
  );
  ok(res, party, isLocked ? "Team locked" : "Team unlocked");
}

export async function transferLeadership(req: Request, res: Response): Promise<void> {
  const actor = await resolveActor(req);
  const { newLeaderId } = req.body as { newLeaderId: string };

  const party = await partyService.transferLeadership(
    pathParam(req, "partyId"),
    actor.userId,
    newLeaderId,
    actor
  );
  ok(res, party, "Leadership transferred");
}

/** RESTful member removal — DELETE /party/:partyId/members/:userId. */
export async function removeMember(req: Request, res: Response): Promise<void> {
  const actor = await resolveActor(req);

  const party = await partyService.removeMemberFromParty(
    pathParam(req, "partyId"),
    actor.userId,
    pathParam(req, "userId"),
    actor
  );
  ok(res, party, "Member removed");
}

/**
 * Legacy POST /party/kick, kept because the existing SPA calls it
 * (client/src/api/party.js). Delegates to the same service function as the
 * RESTful route rather than duplicating the logic.
 */
export async function kickMember(req: Request, res: Response): Promise<void> {
  const actor = await resolveActor(req);
  const { partyId, targetUserId } = req.body as { partyId: string; targetUserId: string };

  const party = await partyService.removeMemberFromParty(
    partyId,
    actor.userId,
    targetUserId,
    actor
  );
  ok(res, party, "Member removed");
}
