import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext.jsx'
import { apiOrigin } from '../api/client.js'

/**
 * Owns the single Socket.IO connection for the whole app.
 *
 * One connection, not one per screen: each socket is a real TCP connection the
 * server tracks for presence, so a component-level connection would make a user
 * appear online several times and drop them offline on any unmount.
 *
 * The connection is tied to auth state. It opens once the user is authenticated
 * and closes on sign-out — the handshake is rejected without the session cookie,
 * so connecting earlier would just retry-loop against a 401.
 *
 * There is no token to pass: the JWT is an httpOnly cookie, and
 * `withCredentials` makes the browser send it on the handshake automatically.
 */

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) return undefined

    let instance
    try {
      instance = io(apiOrigin(), {
        withCredentials: true,
        // Polling first, then upgrade. Forcing websocket-only fails outright
        // behind proxies that do not pass the upgrade through, and the fallback
        // is what keeps the app working there rather than silently offline.
        transports: ['polling', 'websocket'],
        reconnectionDelay: 500,
        reconnectionDelayMax: 5000
      })
    } catch {
      // apiOrigin throws when VITE_API_URL is unset. The REST layer already
      // surfaces that as a visible error; realtime just stays off.
      return undefined
    }

    const onConnect = () => setIsConnected(true)
    const onDisconnect = () => setIsConnected(false)

    instance.on('connect', onConnect)
    instance.on('disconnect', onDisconnect)

    setSocket(instance)

    return () => {
      instance.off('connect', onConnect)
      instance.off('disconnect', onDisconnect)
      instance.close()
      setSocket(null)
      setIsConnected(false)
    }
  }, [isAuthenticated])

  const value = useMemo(() => ({ socket, isConnected }), [socket, isConnected])

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

/**
 * Subscribes to one server event for the lifetime of the calling component.
 *
 * The handler is held in a ref so an inline arrow function does not tear down
 * and re-register the listener on every render — which would drop events landing
 * in the gap.
 */
export function useSocketEvent(eventName, handler) {
  const { socket } = useSocket()
  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    if (!socket) return undefined

    const listener = (...args) => handlerRef.current?.(...args)
    socket.on(eventName, listener)

    return () => socket.off(eventName, listener)
  }, [socket, eventName])
}
