import { api } from './client.js'

/** GET /admin/users */
export async function listUsers(limit = 50, offset = 0) {
  const payload = await api.get(`/admin/users?limit=${limit}&offset=${offset}`)
  return payload?.data ?? { users: [], total: 0 }
}

/** GET /admin/users/:userId */
export async function getUser(userId) {
  const payload = await api.get(`/admin/users/${encodeURIComponent(userId)}`)
  return payload?.data ?? null
}

/** PATCH /admin/users/:userId/role */
export async function changeUserRole(userId, role) {
  const payload = await api.patch(`/admin/users/${encodeURIComponent(userId)}/role`, { role })
  return payload?.data ?? null
}

/** GET /admin/parties */
export async function listParties(limit = 50, offset = 0) {
  const payload = await api.get(`/admin/parties?limit=${limit}&offset=${offset}`)
  return payload?.data ?? { parties: [], total: 0 }
}

/** DELETE /admin/parties/:partyId */
export async function deleteParty(partyId) {
  const payload = await api.delete(`/admin/parties/${encodeURIComponent(partyId)}`)
  return payload?.data ?? null
}

/** DELETE /admin/parties/:partyId/members/:userId */
export async function removeMember(partyId, userId) {
  const payload = await api.delete(`/admin/parties/${encodeURIComponent(partyId)}/members/${encodeURIComponent(userId)}`)
  return payload?.data ?? null
}

/** PATCH /admin/registration */
export async function updateRegistration(registrationOpen, registrationClosesAt = null) {
  const payload = await api.patch(`/admin/registration`, { registrationOpen, registrationClosesAt })
  return payload?.data ?? null
}

/** GET /admin/audit */
export async function listAuditLog(limit = 50, offset = 0, action = null) {
  let url = `/admin/audit?limit=${limit}&offset=${offset}`
  if (action) url += `&action=${encodeURIComponent(action)}`
  const payload = await api.get(url)
  return payload?.data ?? { entries: [], total: 0 }
}
