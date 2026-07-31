/**
 * Party (team) endpoints — express/src/routes/party.routes.ts
 *
 * Every route below sits behind authenticateUser, so all of them require a
 * valid session cookie. Controllers wrap results as { success, data }; these
 * helpers return the unwrapped `data` payload.
 */

import { api } from './client.js'

/**
 * POST /party/create
 * The backend generates the invite code and returns it as the party `id`.
 * `password` is optional — omitting it creates a team anyone with the code
 * can join.
 */
export async function createParty({ name, password, maxPlayers } = {}) {
  const payload = await api.post('/party/create', { name, password, maxPlayers })
  return payload?.data ?? null
}

/**
 * POST /party/join
 * The controller accepts the code as either `partyId` or `inviteCode`.
 */
export async function joinParty({ inviteCode, password } = {}) {
  const payload = await api.post('/party/join', { inviteCode, password })
  return payload?.data ?? null
}

/** GET /party/:partyId */
export async function getParty(partyId, { signal } = {}) {
  const payload = await api.get(`/party/${encodeURIComponent(partyId)}`, { signal })
  return payload?.data ?? null
}

/** POST /party/leave/:partyId */
export function leaveParty(partyId) {
  return api.post(`/party/leave/${encodeURIComponent(partyId)}`)
}

/** POST /party/kick — leader only. */
export async function kickPlayer({ partyId, targetUserId }) {
  const payload = await api.post('/party/kick', { partyId, targetUserId })
  return payload?.data ?? null
}
