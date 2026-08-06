import { useCallback, useEffect, useState } from 'react'
import { useSocketEvent } from '../realtime/SocketProvider.jsx'
import { SOCKET_EVENTS } from '../realtime/events.js'
import {
  listPendingRequests,
  acceptRequest as apiAcceptRequest,
  rejectRequest as apiRejectRequest
} from '../api/joinRequest.js'

export function useJoinRequests(partyId, isLeader) {
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async ({ signal } = {}) => {
    if (!partyId || !isLeader) {
      setRequests([])
      return
    }

    setIsLoading(true)
    try {
      const pending = await listPendingRequests(partyId, { signal })
      setRequests(pending)
      setError(null)
    } catch (err) {
      if (err.code !== 'aborted') {
        setError(err.message)
      }
    } finally {
      setIsLoading(false)
    }
  }, [partyId, isLeader])

  useEffect(() => {
    const controller = new AbortController()
    load({ signal: controller.signal })
    return () => controller.abort()
  }, [load])

  useSocketEvent(SOCKET_EVENTS.TEAM_JOIN_REQUEST_CREATED, ({ partyId: eventPartyId, request }) => {
    if (eventPartyId === partyId) {
      setRequests((prev) => [request, ...prev])
    }
  })

  useSocketEvent(SOCKET_EVENTS.TEAM_JOIN_REQUEST_RESOLVED, ({ partyId: eventPartyId, requestId }) => {
    if (eventPartyId === partyId) {
      setRequests((prev) => prev.filter((r) => r.id !== requestId))
    }
  })

  const acceptRequest = useCallback(async (requestId) => {
    try {
      await apiAcceptRequest(requestId)
      // The socket event will remove it from the list
    } catch (err) {
      console.error('Failed to accept request:', err)
      throw err
    }
  }, [])

  const rejectRequest = useCallback(async (requestId) => {
    try {
      await apiRejectRequest(requestId)
      // The socket event will remove it from the list
    } catch (err) {
      console.error('Failed to reject request:', err)
      throw err
    }
  }, [])

  return {
    requests,
    isLoading,
    error,
    acceptRequest,
    rejectRequest
  }
}
