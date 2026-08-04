import { useCallback, useState } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import PanelCard from '../../components/ui/PanelCard.jsx'
import StarfieldBackground from '../../components/layout/StarfieldBackground.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

/**
 * Google Auth screen. Reuses the pill-panel component seen on Team
 * Management, with its label swapped to "Google Sign In" per the Figma
 * audit. Sits between the Website's "Register Now" entry point and the
 * Team Management screen.
 *
 * The OAuth round trip belongs to the backend: this panel hands the browser
 * to GET /auth/google, and the backend redirects to /team once it has set
 * the session cookie. Failures come back as a "?error=" query param, since
 * a top-level navigation cannot receive a JSON error body.
 */
export default function GoogleAuthPage() {
  const { isAuthenticated, isLoading, signInWithGoogle } = useAuth()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const [error, setError] = useState(() => searchParams.get('error'))
  const [isRedirecting, setIsRedirecting] = useState(false)

  const handleSignIn = useCallback(() => {
    // Guarded here rather than by dropping onClick: PanelCard renders a
    // <div> instead of a <button> when it has no handler.
    if (isLoading || isRedirecting) return

    setError(null)
    setIsRedirecting(true)
    try {
      signInWithGoogle()
    } catch (signInError) {
      setError(signInError.message)
      setIsRedirecting(false)
    }
  }, [isLoading, isRedirecting, signInWithGoogle])

  if (isAuthenticated) {
    return <Navigate to={location.state?.from ?? '/team'} replace />
  }

  return (
    <main className="section-shell relative flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <StarfieldBackground density={90} />

      <div className="relative z-10 flex flex-col items-center gap-8 text-center">
        <p className="eyebrow">One Step Closer</p>

        <PanelCard
          title={isRedirecting ? 'Redirecting…' : 'Google Sign In'}
          onClick={handleSignIn}
        />

        <p className="max-w-sm font-body text-base text-neutral-body">
          Sign in with your Google account to create or join a team for Somnium.
        </p>

        {error ? (
          <p role="alert" className="font-body text-sm text-red-400">
            {error}
          </p>
        ) : null}
      </div>
    </main>
  )
}
