import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StarfieldBackground from '../../components/layout/StarfieldBackground.jsx'
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
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault()
      if (isSubmitting) return

      const trimmedCode = joinCode.trim().toUpperCase()

      if (trimmedCode.length < 4) {
        setError('Enter the full team join code.')
        return
      }

      setError(null)
      setIsSubmitting(true)

      try {
        const party = await joinParty({ inviteCode: trimmedCode })

        writeActivePartyId(party?.id ?? trimmedCode)
        navigate('/team', { replace: true })
      } catch (joinError) {
        setError(joinError.message)
        setIsSubmitting(false)
      }
    },
    [joinCode, navigate, isSubmitting]
  )

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
            disabled={isSubmitting}
            className="w-full rounded-lg border border-cream/20 bg-navy-deep px-5 py-4 font-body text-lg text-cream placeholder:text-neutral-body focus-visible:border-gold disabled:opacity-60"
          />
          {error ? (
            <p role="alert" className="font-support text-sm text-accent-pink">
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
