import { useCallback, useState } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import NeonMesh from '../../components/ui/neon-mesh.jsx'
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
    <main className="section-shell relative flex min-h-[calc(100vh-74px)] flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-24">
      <NeonMesh className="absolute inset-0 z-0" />

      <div className="relative z-10 flex w-full max-w-[480px] flex-col items-center rounded-2xl border border-amethyst/10 bg-[#0c0814] p-6 sm:p-12 shadow-2xl">
        
        <div className="mb-8 flex flex-col items-center space-y-3 text-center">
          <p className="eyebrow tracking-[0.3em]">
            Identity Verification
          </p>
          <h2 className="font-brand text-5xl font-bold uppercase tracking-tight text-white drop-shadow-md sm:text-6xl">
            Somnium
          </h2>
        </div>

        <p className="mb-10 text-center font-body text-sm leading-relaxed text-neutral-300">
          Sign in with your Google account to create or join a team and access the terminal.
        </p>

        <button
          type="button"
          onClick={handleSignIn}
          disabled={isLoading || isRedirecting}
          className="group relative flex w-full items-center justify-center gap-4 overflow-hidden rounded-xl border border-white/10 bg-white/10 px-6 py-4 font-body text-base font-medium text-white transition-all duration-300 hover:scale-[1.02] hover:border-amethyst/50 hover:bg-white/15 hover:shadow-crystal focus:outline-none focus:ring-2 focus:ring-amethyst disabled:cursor-not-allowed disabled:opacity-50"
        >
          {/* Subtle hover gradient sweep */}
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-full" />

          <svg className="h-5 w-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          
          <span className="relative z-10 tracking-wide">
            {isRedirecting ? 'Authenticating...' : 'Sign in with Google'}
          </span>
        </button>

        {error ? (
          <div className="mt-6 w-full rounded-lg border border-red-500/20 bg-red-950/30 px-4 py-3 text-center">
            <p role="alert" className="font-body text-sm text-red-400">
              {error}
            </p>
          </div>
        ) : null}
      </div>
    </main>
  )
}
