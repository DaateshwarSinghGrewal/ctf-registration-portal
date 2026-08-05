import { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react'
import { fetchCurrentUser, googleSignInUrl, logout } from '../api/auth.js'
import { assertApiReachable, onUnauthorized } from '../api/client.js'

const AuthContext = createContext(null)

/**
 * Auth state is owned by the backend: sign-in sets an httpOnly JWT cookie
 * that JavaScript cannot read, so the source of truth is GET /auth/me rather
 * than anything in browser storage. That is what makes the session survive a
 * refresh, and what makes an expired token resolve to "signed out" on the
 * next request instead of leaving stale user data on screen.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading')

  const applyUser = useCallback((nextUser) => {
    setUser(nextUser)
    setStatus(nextUser ? 'authenticated' : 'unauthenticated')
  }, [])

  // Rehydrate on first load and after every refresh.
  useEffect(() => {
    const controller = new AbortController()
    let active = true

    fetchCurrentUser({ signal: controller.signal })
      .then((currentUser) => {
        if (active) applyUser(currentUser)
      })
      .catch(() => {
        // Network failure or backend offline — treat as signed out; pages
        // surface their own errors when a request actually fails.
        if (active) applyUser(null)
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [applyUser])

  // A 401 from any request means the token expired or was cleared.
  useEffect(
    () =>
      onUnauthorized(() => {
        applyUser(null)
      }),
    [applyUser]
  )

  /**
   * Hands the browser to the backend, which owns the Google OAuth round trip.
   *
   * Reachability is checked first because this navigates away from the SPA: with
   * the API down, the browser would land on its own connection-refused page and
   * the user would have no way to tell that from Google sign-in being broken.
   * Rejects with a displayable message instead.
   */
  const signInWithGoogle = useCallback(async () => {
    await assertApiReachable()
    window.location.assign(googleSignInUrl())
  }, [])

  const signOut = useCallback(async () => {
    try {
      await logout()
    } catch {
      // Even if the call fails the local session must not survive; the
      // cookie expires on its own within five hours.
    }
    applyUser(null)
  }, [applyUser])

  /** Re-reads the session, e.g. after an action that may have changed roles. */
  const refresh = useCallback(async () => {
    try {
      applyUser(await fetchCurrentUser())
    } catch {
      applyUser(null)
    }
  }, [applyUser])

  const value = useMemo(
    () => ({
      user,
      status,
      isLoading: status === 'loading',
      isAuthenticated: status === 'authenticated',
      signInWithGoogle,
      signOut,
      refresh
    }),
    [user, status, signInWithGoogle, signOut, refresh]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
