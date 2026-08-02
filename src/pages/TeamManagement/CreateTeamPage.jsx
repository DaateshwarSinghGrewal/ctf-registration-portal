import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StarfieldBackground from '../../components/layout/StarfieldBackground.jsx'
import Button from '../../components/ui/Button.jsx'
import { createParty } from '../../api/party.js'
import { writeActivePartyId } from '../../utils/activeParty.js'

/**
 * Create Team screen. Destination of the "Create Team" CTA identified
 * during routing analysis; this flow was not present in the inspected
 * Figma file, so its layout follows the same panel/starfield visual
 * language as Team Management and Google Auth for continuity.
 *
 * Submits to POST /party/create. The backend owns the invite code, so the
 * created party's id is stored and Team Management shows it on return.
 * Reaching this page at all requires a session — see ProtectedRoute.
 */
export default function CreateTeamPage() {
  const navigate = useNavigate()
  const [teamName, setTeamName] = useState('')
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault()
      if (isSubmitting) return

      const trimmedName = teamName.trim()

      if (trimmedName.length < 3) {
        setError('Team name must be at least 3 characters.')
        return
      }

      setError(null)
      setIsSubmitting(true)

      try {
        const party = await createParty({ name: trimmedName })

        if (party?.id) {
          writeActivePartyId(party.id)
        }

        navigate('/team', { replace: true })
      } catch (createError) {
        // A 401 is handled globally by AuthContext, which drops the session
        // and lets ProtectedRoute redirect to sign-in.
        setError(createError.message)
        setIsSubmitting(false)
      }
    },
    [teamName, navigate, isSubmitting]
  )

  return (
    <main className="section-shell relative flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <StarfieldBackground density={90} />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex w-full max-w-md flex-col items-center gap-8 text-center"
      >
        <div className="flex flex-col items-center gap-2">
          <p className="eyebrow">Start Fresh</p>
          <h1 className="font-hero text-5xl font-bold text-cream sm:text-6xl">Create a Team</h1>
        </div>

        <div className="flex w-full flex-col items-start gap-2 text-left">
          <label htmlFor="team-name" className="font-support text-xs uppercase tracking-navlink text-cream-soft">
            Team name
          </label>
          <input
            id="team-name"
            name="team-name"
            type="text"
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
            placeholder="The Dreaming Owls"
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
          {isSubmitting ? 'Creating…' : 'Create Team'}
        </Button>
      </form>
    </main>
  )
}
