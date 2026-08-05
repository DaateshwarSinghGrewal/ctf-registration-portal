import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NoiseDarkPurpleGradientWithSquares from '../../components/ui/noise-dark-blue-gradient-with-squares.jsx'
import Button from '../../components/ui/Button.jsx'
import { createParty } from '../../api/party.js'
import { writeActivePartyId } from '../../utils/activeParty.js'

/**
 * Create Team screen. Destination of the "Create Team" CTA identified
 * during routing analysis; this flow follows the same panel/noise gradient
 * visual language as Team Management and Google Auth for continuity.
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
        setError(createError.message)
        setIsSubmitting(false)
      }
    },
    [teamName, navigate, isSubmitting]
  )

  return (
    <main className="section-shell relative flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <NoiseDarkPurpleGradientWithSquares />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex w-full max-w-md flex-col items-center gap-8 text-center"
      >
        <div className="flex flex-col items-center gap-2">
          <p className="eyebrow">Start Fresh</p>
          <h1 className="font-heading text-5xl font-bold text-white sm:text-6xl">Create a Team</h1>
        </div>

        <div className="flex w-full flex-col items-start gap-2 text-left">
          <label htmlFor="team-name" className="font-heading text-xs uppercase tracking-wide text-crystal-light">
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
            className="input-field"
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
          {isSubmitting ? 'Creating…' : 'Create Team'}
        </Button>
      </form>
    </main>
  )
}
