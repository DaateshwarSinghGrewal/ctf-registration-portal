import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StarfieldBackground from '../../components/layout/StarfieldBackground.jsx'
import Button from '../../components/ui/Button.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

/**
 * Join Team screen. Destination of the "Join Team" CTA identified
 * during routing analysis; this flow was not present in the inspected
 * Figma file, so its layout follows the same panel/starfield visual
 * language as Team Management and Google Auth for continuity.
 */
export default function JoinTeamPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState(null)

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault()
      const trimmedCode = joinCode.trim()

      if (trimmedCode.length < 4) {
        setError('Enter the full team join code.')
        return
      }

      setError(null)
      navigate('/team', { replace: true })
    },
    [joinCode, navigate]
  )

  if (!isAuthenticated) {
    return (
      <main className="section-shell relative flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-24 text-center">
        <StarfieldBackground density={70} glow={false} />
        <p className="relative z-10 font-support text-lg text-cream-soft">
          Sign in with Google before joining a team.
        </p>
        <Button variant="text-link" to="/auth" className="relative z-10">
          Go to Sign In
        </Button>
      </main>
    )
  }

  return (
    <main className="section-shell relative flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <StarfieldBackground density={90} />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex w-full max-w-md flex-col items-center gap-8 text-center"
      >
        <div className="flex flex-col items-center gap-2">
          <p className="eyebrow">Already Have a Code?</p>
          <h1 className="font-hero text-5xl font-bold text-cream sm:text-6xl">Join a Team</h1>
        </div>

        <div className="flex w-full flex-col items-start gap-2 text-left">
          <label htmlFor="join-code" className="font-support text-xs uppercase tracking-navlink text-cream-soft">
            Join code
          </label>
          <input
            id="join-code"
            name="join-code"
            type="text"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value)}
            placeholder="ORBIT-4821"
            autoComplete="off"
            className="w-full rounded-lg border border-cream/20 bg-navy-deep px-5 py-4 font-body text-lg text-cream placeholder:text-neutral-body focus-visible:border-gold"
          />
          {error ? (
            <p role="alert" className="font-support text-sm text-accent-pink">
              {error}
            </p>
          ) : null}
        </div>

        <Button variant="pill" type="submit" className="w-full max-w-none">
          Join Team
        </Button>
      </form>
    </main>
  )
}