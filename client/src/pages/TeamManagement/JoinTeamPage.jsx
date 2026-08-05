import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NoiseDarkPurpleGradientWithSquares from '../../components/ui/noise-dark-blue-gradient-with-squares.jsx'
import Button from '../../components/ui/Button.jsx'
import { joinParty } from '../../api/party.js'
import { writeActivePartyId } from '../../utils/activeParty.js'

/**
 * Join Team screen. Destination of the "Join Team" CTA identified
 * during routing analysis; this flow was not present in the inspected
 * Figma file, so its layout follows the same panel/starfield visual
 * language as Team Management and Google Auth for continuity.
 *
 * Submits to POST /party/join. Invite codes are generated as uppercase hex
 * by the backend, so input is upper-cased before being sent. The backend
 * distinguishes unknown codes (404), full teams (400) and wrong passwords
 * (401); each message is surfaced as-is.
 */
export default function JoinTeamPage() {
  const navigate = useNavigate()
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault()
      if (isSubmitting) return

      const code = inviteCode.trim().toUpperCase()

      if (code.length === 0) {
        setError('Please enter a team code.')
        return
      }

      setError(null)
      setIsSubmitting(true)

      try {
        const party = await joinParty(code)

        if (party?.id) {
          writeActivePartyId(party.id)
        }
        navigate('/team', { replace: true })
      } catch (joinError) {
        setError(joinError.message)
        setIsSubmitting(false)
      }
    },
    [inviteCode, navigate, isSubmitting]
  )

  return (
    <main className="section-shell relative flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <NoiseDarkPurpleGradientWithSquares />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex w-full max-w-md flex-col items-center gap-8 text-center"
      >
        <div className="flex flex-col items-center gap-2">
          <p className="eyebrow">Already Have a Code?</p>
          <h1 className="font-heading text-5xl font-bold text-white sm:text-6xl">Join a Team</h1>
        </div>

        <div className="flex w-full flex-col items-start gap-2 text-left">
          <label htmlFor="join-code" className="font-heading text-xs uppercase tracking-wide text-crystal-light">
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
            disabled={isSubmitting}
            className="input-field uppercase"
          />
          {error ? (
            <p role="alert" className="font-body text-sm text-red-400">
              {error}
            </p>
          ) : null}
        </div>

        <Button
          variant="pill"
          type="submit"
          disabled={isSubmitting}
          className="w-full max-w-none disabled:opacity-60"
        >
          {isSubmitting ? 'Joining…' : 'Join Team'}
        </Button>
      </form>
    </main>
  )
}
