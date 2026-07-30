import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PanelCard from '../../components/ui/PanelCard.jsx'
import StarfieldBackground from '../../components/layout/StarfieldBackground.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { startGoogleSignIn, completeGoogleSignIn } from '../../services/googleAuth.js'

/**
 * Google Auth screen. Reuses the pill-panel component seen on Team
 * Management, with its label swapped to "Google Sign In" per the Figma
 * audit. Sits between the Website's "Register Now" entry point and the
 * Team Management screen: on this route, a returning OAuth callback
 * (a "code" query param) is completed automatically; otherwise the
 * panel starts a fresh sign-in.
 */
export default function GoogleAuthPage() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const hasAttemptedCallback = useRef(false)

  useEffect(() => {
    const hasCode = new URLSearchParams(window.location.search).has('code')
    if (!hasCode || hasAttemptedCallback.current) {
      return
    }
    hasAttemptedCallback.current = true

    setStatus('completing')
    completeGoogleSignIn(window.location.href)
      .then((user) => {
        signIn(user)
        navigate('/team', { replace: true })
      })
      .catch((callbackError) => {
        setError(callbackError.message)
        setStatus('idle')
      })
  }, [navigate, signIn])

  const handleSignIn = useCallback(async () => {
    setError(null)
    setStatus('redirecting')
    try {
      await startGoogleSignIn()
    } catch (signInError) {
      setError(signInError.message)
      setStatus('idle')
    }
  }, [])

  return (
    <main className="section-shell relative flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <StarfieldBackground density={90} />

      <div className="relative z-10 flex flex-col items-center gap-8 text-center">
        <p className="eyebrow">One Step Closer</p>

        <PanelCard
          title={status === 'completing' ? 'Signing In…' : 'Google Sign In'}
          onClick={handleSignIn}
        />

        <p className="max-w-sm font-support text-base text-cream-soft">
          Sign in with your Google account to create or join a team for Somnium.
        </p>

        {error ? (
          <p role="alert" className="font-support text-sm text-accent-pink">
            {error}
          </p>
        ) : null}
      </div>
    </main>
  )
}