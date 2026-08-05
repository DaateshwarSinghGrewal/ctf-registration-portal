/**
 * Player profile endpoints — express/src/modules/profile/profile.routes.ts
 *
 * The six registration fields the team modals collect. The backend requires a
 * saved profile before a user can create or join a team, so these are submitted
 * as part of those flows rather than on a separate screen.
 *
 * A user only ever reads or writes their own profile; the id comes from the
 * session, never from the path.
 */

import { api } from './client.js'

/** GET /profile — returns null when the user has not filled it in yet. */
export async function getProfile({ signal } = {}) {
  const payload = await api.get('/profile', { signal })
  return payload?.data ?? null
}

/**
 * PUT /profile — creates or replaces the profile.
 *
 * PUT rather than POST because the form always submits every field, so this is
 * idempotent replacement. A 409 means the roll number is already registered to
 * another account.
 */
export async function saveProfile({
  fullName,
  phone,
  discordUsername,
  year,
  branch,
  rollNumber
}) {
  const payload = await api.put('/profile', {
    fullName,
    phone,
    discordUsername,
    year,
    branch,
    rollNumber
  })
  return payload?.data ?? null
}
