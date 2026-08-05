import { z } from "zod";
import { PartyVisibility } from "./party.types.js";

/**
 * Invite codes are six uppercase hex characters. Upper-cased before validation
 * so a user who types their code in lowercase — or whose browser autocorrects
 * it — is not told it is invalid.
 */
export const partyIdSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(/^[0-9A-F]{6}$/, "Team code must be 6 characters (0-9, A-F)"));

const teamNameSchema = z
  .string()
  .trim()
  .min(3, "Team name must be at least 3 characters")
  .max(100, "Team name must be at most 100 characters");

/**
 * Team passwords are shared secrets typed by several people, so the rule is a
 * usable minimum rather than full password policy. The max exists because
 * scrypt's cost scales with input length — an unbounded password is a cheap way
 * to make the server do expensive work.
 */
const teamPasswordSchema = z
  .string()
  .min(4, "Team password must be at least 4 characters")
  .max(128, "Team password must be at most 128 characters");

export const createPartySchema = z.object({
  name: teamNameSchema,
  // Treats "" as "no password": the SPA's create form always submits the field.
  password: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    teamPasswordSchema.optional()
  ),
  maxPlayers: z.coerce.number().int().min(1).max(4).optional(),
  visibility: z.enum(PartyVisibility).optional(),
});

/**
 * The existing SPA sends the code as `inviteCode`; `partyId` is also accepted
 * because the previous controller took either, and dropping one would break a
 * caller. Exactly one is required.
 */
export const joinPartySchema = z
  .object({
    partyId: partyIdSchema.optional(),
    inviteCode: partyIdSchema.optional(),
    password: z.string().max(128).optional(),
  })
  .refine((body) => Boolean(body.partyId ?? body.inviteCode), {
    message: "A team code is required",
    path: ["inviteCode"],
  })
  .transform((body) => ({
    partyId: (body.partyId ?? body.inviteCode)!,
    password: body.password,
  }));

export const partyIdParamSchema = z.object({ partyId: partyIdSchema });

export const renamePartySchema = z.object({ name: teamNameSchema });

/**
 * `null` clears the password, a string sets it. Modelled as one nullable field
 * rather than separate set/remove endpoints so there is a single code path — and
 * so "remove" cannot be reached without leader authorisation that "set" has.
 */
export const setPasswordSchema = z.object({
  password: z.union([teamPasswordSchema, z.null()]),
});

export const setVisibilitySchema = z.object({
  visibility: z.enum(PartyVisibility),
});

export const setLockSchema = z.object({ isLocked: z.boolean() });

export const transferLeadershipSchema = z.object({
  newLeaderId: z.uuid("newLeaderId must be a valid user id"),
});

export const memberParamSchema = z.object({
  partyId: partyIdSchema,
  userId: z.uuid("userId must be a valid user id"),
});

/** Legacy body shape for POST /party/kick, which the SPA still calls. */
export const kickBodySchema = z.object({
  partyId: partyIdSchema,
  targetUserId: z.uuid("targetUserId must be a valid user id"),
});
