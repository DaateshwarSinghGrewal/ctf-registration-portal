import { createContext, useContext, useMemo, useState, useCallback } from 'react'

const AuthContext = createContext(null)

const STORAGE_KEY = 'somnium.auth.user'

function readStoredUser() {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredUser())

  const signIn = useCallback((googleUser) => {
    setUser(googleUser)
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(googleUser))
    } catch {
      // sessionStorage unavailable — auth state still lives in memory for this session
    }
  }, [])

  const signOut = useCallback(() => {
    setUser(null)
    try {
      window.sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // sessionStorage unavailable — clearing in-memory state is sufficient
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      signIn,
      signOut
    }),
    [user, signIn, signOut]
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