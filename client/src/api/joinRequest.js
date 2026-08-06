import { api } from './client.js'

/** POST /party/:partyId/requests — Request to join a private team. */
export async function requestToJoin(partyId) {
  const payload = await api.post(`/party/${encodeURIComponent(partyId)}/requests`)
  return payload?.data ?? null
}

/** GET /party/:partyId/requests — Leader only. Lists pending join requests. */
export async function listPendingRequests(partyId, { signal } = {}) {
  const payload = await api.get(`/party/${encodeURIComponent(partyId)}/requests`, { signal })
  return payload?.data ?? []
}

/** GET /party/requests/mine — Lists caller's own join requests. */
export async function listMyRequests({ signal } = {}) {
  const payload = await api.get('/party/requests/mine', { signal })
  return payload?.data ?? []
}

/** POST /join-requests/:requestId/accept — Leader only. Approves a request. */
export async function acceptRequest(requestId) {
  const payload = await api.post(`/join-requests/${encodeURIComponent(requestId)}/accept`)
  return payload?.data ?? null
}

/** POST /join-requests/:requestId/reject — Leader only. Rejects a request. */
export async function rejectRequest(requestId) {
  const payload = await api.post(`/join-requests/${encodeURIComponent(requestId)}/reject`)
  return payload?.data ?? null
}

/** DELETE /join-requests/:requestId — Caller withdraws their own pending request. */
export async function cancelRequest(requestId) {
  const payload = await api.delete(`/join-requests/${encodeURIComponent(requestId)}`)
  return payload?.data ?? null
}
