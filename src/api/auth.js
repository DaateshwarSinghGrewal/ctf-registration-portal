/**
 * Auth endpoints — express/src/routes/auth.routes.ts
 *
 * Sign-in is a server-side OAuth flow: the browser navigates to
 * GET /auth/google, the backend handles the Google round trip, sets an
 * httpOnly JWT cookie on the API origin, and redirects back to /team.
 * There is no token for the frontend to read or store.
 */

import { api, apiUrl } from './client.js'

/** Top-level navigation target that starts the Google OAuth flow. */
export function googleSignInUrl() {
  return apiUrl('/auth/google')
}

/**
 * Returns the signed-in user, or null when there is no valid session.
 * A 401 here is the normal "signed out" answer, so it resolves to null
 * instead of throwing (and does not fire the global unauthorized handler).
 */
export async function fetchCurrentUser({ signal } = {}) {
  try {
    const payload = await api.get('/auth/me', { signal, notifyOnUnauthorized: false })
    return payload?.user ?? null
  } catch (error) {
    if (error.status === 401) return null
    throw error
  }
}

/** Clears the auth cookie server-side. */
export function logout() {
  return api.post('/auth/logout')
}
