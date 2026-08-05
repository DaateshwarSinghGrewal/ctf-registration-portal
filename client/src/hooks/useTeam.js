import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useSocketEvent } from '../realtime/SocketProvider.jsx'
import { SOCKET_EVENTS } from '../realtime/events.js'
import {
  createParty,
  deleteParty,
  getMyParty,
  joinParty,
  leaveParty,
  removeMember
} from '../api/party.js'
import { saveProfile } from '../api/profile.js'

/**
 * Owns the signed-in user's team state.
 *
 * Two rules make this correct rather than merely working:
 *
 *  1. The server is the only source of truth. Nothing here invents an id, a
 *     name or a roster — the previous screen generated invite codes locally and
 *     rendered a fixed member list, so two people holding the same code saw
 *     different teams.
 *
 *  2. Socket events replace state, they do not patch it. Every membership event
 *     carries the authoritative roster, so applying it wholesale means a client
 *     that missed an event during a reconnect self-corrects on the next one
 *     instead of drifting further out of sync.
 */

const STATUS = { LOADING: 'loading', READY: 'ready', ERROR: 'error' }

export function useTeam() {
  const { user, refresh: refreshAuth } = useAuth()
  const [team, setTeam] = useState(null)
  const [status, setStatus] = useState(STATUS.LOADING)
  const [loadError, setLoadError] = useState(null)
  /**
   * Last presence snapshot, stored with the team it describes.
   *
   * Kept unconditionally and matched against the current team at render time,
   * rather than discarded when it does not match right now. A joining member
   * receives presence over the socket *before* the POST /party/join response
   * resolves, so at that instant there is no current team to compare against —
   * filtering on arrival dropped it and left them showing everyone offline.
   */
  const [presence, setPresence] = useState({ partyId: null, userIds: [] })

  const load = useCallback(async ({ signal } = {}) => {
    try {
      const current = await getMyParty({ signal })
      setTeam(current)
      setStatus(STATUS.READY)
      setLoadError(null)
      return current
    } catch (error) {
      if (error.code === 'aborted') return null
      // A 401 is handled globally by AuthContext, which signs the user out.
      setLoadError(error.message)
      setStatus(STATUS.ERROR)
      return null
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    load({ signal: controller.signal })
    return () => controller.abort()
  }, [load])

  /**
   * Applies an event only when it concerns the team currently on screen.
   *
   * A user's sockets stay in their personal room, so an event for a team they
   * have already left can still arrive — without this guard it would overwrite
   * the roster of the team they are actually in.
   */
  const applyIfCurrent = useCallback((partyId, update) => {
    setTeam((previous) => {
      if (!previous || previous.id !== partyId) return previous
      return { ...previous, ...update }
    })
  }, [])

  const withMembers = useCallback(
    (partyId, members) =>
      applyIfCurrent(partyId, { members, memberCount: members.length }),
    [applyIfCurrent]
  )

  useSocketEvent(SOCKET_EVENTS.TEAM_MEMBER_JOINED, ({ partyId, members }) =>
    withMembers(partyId, members)
  )

  useSocketEvent(SOCKET_EVENTS.TEAM_MEMBER_LEFT, ({ partyId, members }) =>
    withMembers(partyId, members)
  )

  useSocketEvent(SOCKET_EVENTS.TEAM_MEMBER_REMOVED, ({ partyId, userId, members }) => {
    // If the removed member is the current user, the team is gone from their
    // point of view — patching the roster would leave them looking at a team
    // they are no longer in.
    if (userId === user?.userId) {
      setTeam((previous) => (previous?.id === partyId ? null : previous))
      return
    }
    withMembers(partyId, members)
  })

  useSocketEvent(SOCKET_EVENTS.TEAM_LEADER_CHANGED, ({ partyId, leaderId, members }) =>
    applyIfCurrent(partyId, { leaderId, members, memberCount: members.length })
  )

  useSocketEvent(SOCKET_EVENTS.TEAM_RENAMED, ({ partyId, name }) =>
    applyIfCurrent(partyId, { name })
  )

  useSocketEvent(SOCKET_EVENTS.TEAM_UPDATED, ({ party }) =>
    applyIfCurrent(party.id, party)
  )

  useSocketEvent(SOCKET_EVENTS.TEAM_LOCKED, ({ partyId }) =>
    applyIfCurrent(partyId, { isLocked: true })
  )

  useSocketEvent(SOCKET_EVENTS.TEAM_UNLOCKED, ({ partyId }) =>
    applyIfCurrent(partyId, { isLocked: false })
  )

  useSocketEvent(SOCKET_EVENTS.TEAM_DELETED, ({ partyId }) => {
    setTeam((previous) => (previous?.id === partyId ? null : previous))
  })

  useSocketEvent(SOCKET_EVENTS.PRESENCE_UPDATE, ({ partyId, onlineUserIds }) => {
    setPresence({ partyId, userIds: onlineUserIds })
  })

  /**
   * Saves the profile, then performs the team action.
   *
   * The backend requires a completed profile before either, so the order is not
   * incidental: creating first would fail with a 403 and lose the details the
   * user just typed.
   */
  const submitWithProfile = useCallback(
    async (playerDetails, action) => {
      await saveProfile(playerDetails)
      const result = await action()
      // hasProfile is part of the session payload and has just changed.
      refreshAuth()
      return result
    },
    [refreshAuth]
  )

  const create = useCallback(
    async ({ name, playerDetails }) => {
      const created = await submitWithProfile(playerDetails, () => createParty({ name }))
      // The create response is a summary without the roster; re-read so the
      // screen renders the same shape as every other path.
      return load()
        .then((full) => full ?? created)
    },
    [submitWithProfile, load]
  )

  const join = useCallback(
    async ({ inviteCode, playerDetails }) => {
      const joined = await submitWithProfile(playerDetails, () => joinParty({ inviteCode }))
      setTeam(joined)
      setStatus(STATUS.READY)
      return joined
    },
    [submitWithProfile]
  )

  const leave = useCallback(async () => {
    if (!team) return
    await leaveParty(team.id)
    setTeam(null)
  }, [team])

  const disband = useCallback(async () => {
    if (!team) return
    await deleteParty(team.id)
    setTeam(null)
  }, [team])

  const kick = useCallback(
    async (userId) => {
      if (!team) return
      const updated = await removeMember({ partyId: team.id, userId })
      if (updated) setTeam(updated)
    },
    [team]
  )

  // Derived, so a stale snapshot for a team the user has left can never light up
  // the wrong roster, and no separate reset is needed when the team goes away.
  const onlineUserIds = team && presence.partyId === team.id ? presence.userIds : []

  return {
    team,
    isLoading: status === STATUS.LOADING,
    loadError,
    onlineUserIds,
    /** True when the signed-in user leads the current team. */
    isLeader: Boolean(team && user && team.leaderId === user.userId),
    reload: load,
    create,
    join,
    leave,
    disband,
    kick
  }
}
