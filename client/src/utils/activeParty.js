/**
 * Remembers which team the signed-in user belongs to across reloads.
 *
 * Needed because the party API is addressed by invite code and offers no
 * "current party for this user" lookup. Storage is best-effort: every
 * accessor tolerates localStorage being unavailable (private mode, blocked
 * cookies) and simply behaves as though no team is known.
 */

import { STORAGE_KEYS } from '../constants/storage.js'

export function readActivePartyId() {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.activePartyId) || null
  } catch {
    return null
  }
}

export function writeActivePartyId(partyId) {
  try {
    window.localStorage.setItem(STORAGE_KEYS.activePartyId, partyId)
  } catch {
    // Non-fatal: the team is still shown for the rest of this navigation.
  }
}

export function clearActivePartyId() {
  try {
    window.localStorage.removeItem(STORAGE_KEYS.activePartyId)
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}
