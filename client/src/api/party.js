/**
 * Team (party) endpoints — express/src/modules/party/party.routes.ts
 *
 * Every route here sits behind authenticateUser, so all of them need a valid
 * session cookie. Controllers reply with { success, message, data }; these
 * helpers return the unwrapped `data`.
 *
 * The UI calls them teams; the API calls them parties. Same entity — the paths
 * were kept as-is so nothing had to be renamed across the boundary.
 */

import { api } from './client.js'

/**
 * GET /party/me — the team the signed-in user belongs to, or null.
 *
 * This is the source of truth for "am I in a team?". The invite code used to be
 * cached in localStorage because no such endpoint existed, which went stale the
 * moment the user was removed from a team while away.
 */
export async function getMyParty({ signal } = {}) {
  const payload = await api.get('/party/me', { signal })
  return payload?.data ?? null
}

/**
 * POST /party/create — the backend generates the invite code and returns it as
 * the team's `id`. Requires a completed profile.
 */
export async function createParty({ name, password, maxPlayers, visibility } = {}) {
  const payload = await api.post('/party/create', { name, password, maxPlayers, visibility })
  return payload?.data ?? null
}

/** POST /party/join — instant join for PUBLIC teams. Codes are case-insensitive. */
export async function joinParty({ inviteCode, password } = {}) {
  const payload = await api.post('/party/join', { inviteCode, password })
  return payload?.data ?? null
}

/** POST /party/leave/:partyId — the caller leaves their own team. */
export function leaveParty(partyId) {
  return api.post(`/party/leave/${encodeURIComponent(partyId)}`)
}

/** DELETE /party/:partyId — leader disbands the team. */
export function deleteParty(partyId) {
  return api.delete(`/party/${encodeURIComponent(partyId)}`)
}

/** DELETE /party/:partyId/members/:userId — leader removes a member. */
export async function removeMember({ partyId, userId }) {
  const payload = await api.delete(
    `/party/${encodeURIComponent(partyId)}/members/${encodeURIComponent(userId)}`
  )
  return payload?.data ?? null
}
