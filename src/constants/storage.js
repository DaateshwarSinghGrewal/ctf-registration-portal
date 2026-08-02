/** Browser storage keys, namespaced to avoid collisions on shared origins. */
export const STORAGE_KEYS = {
  /**
   * Invite code of the team the user most recently created or joined.
   *
   * The backend exposes GET /party/:partyId but no "my current party"
   * route, so the code is remembered client-side to survive a refresh.
   * It is not sensitive — it is the same code shared with teammates — and
   * every read is re-validated against the API before being trusted.
   */
  activePartyId: 'somnium.team.activePartyId'
}
