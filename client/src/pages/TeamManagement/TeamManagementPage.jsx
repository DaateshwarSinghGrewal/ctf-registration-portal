import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PanelCard from '../../components/ui/PanelCard.jsx'
import Button from '../../components/ui/Button.jsx'
import StarfieldBackground from '../../components/layout/StarfieldBackground.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { getParty } from '../../api/party.js'
import { clearActivePartyId, readActivePartyId } from '../../utils/activeParty.js'

/**
 * Team Management screen. Reached after a successful Google sign-in
 * (per the routing analysis, this is the post-auth landing screen).
 * Offers the two terminal CTAs identified in the Figma audit: Create
 * Team and Join Team, both reusing the pill-panel component.
 *
 * When the user already has a team, its invite code and roster are loaded
 * from GET /party/:partyId — without showing the code here, the code the
 * backend generates on create would never reach the teammates who need it.
 */
export default function TeamManagementPage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const [party, setParty] = useState(null)
  const [isLoadingParty, setIsLoadingParty] = useState(() => Boolean(readActivePartyId()))
  const [partyError, setPartyError] = useState(null)

  useEffect(() => {
    const partyId = readActivePartyId()
    if (!partyId) return undefined

    const controller = new AbortController()
    let active = true

    getParty(partyId, { signal: controller.signal })
      .then((details) => {
        if (!active) return
        setParty(details)
        setIsLoadingParty(false)
      })
      .catch((error) => {
        if (!active) return

        // The remembered code no longer resolves (team disbanded, or the
        // user was removed) — forget it rather than showing a stale error.
        if (error.status === 404) {
          clearActivePartyId()
        } else if (error.code !== 'aborted' && error.status !== 401) {
          setPartyError(error.message)
        }

        setIsLoadingParty(false)
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [])

  return (
    <main className="section-shell relative flex min-h-screen flex-col items-center justify-center gap-16 px-6 py-24">
      <StarfieldBackground density={90} />

      <div className="relative z-10 flex flex-col items-center gap-4 text-center">
        <p className="eyebrow">{user?.username ? `Welcome, ${user.username}` : 'Welcome'}</p>
        <PanelCard title="Team Management" as="div" />

        {isLoadingParty ? (
          <p className="font-support text-sm text-cream-soft">Loading your team…</p>
        ) : null}

        {party ? (
          <div className="flex flex-col items-center gap-2">
            <p className="font-support text-lg text-cream">{party.name}</p>
            <p className="font-support text-xs uppercase tracking-navlink text-cream-soft">
              Join code{' '}
              <span className="font-body text-base tracking-normal text-gold">{party.id}</span>
            </p>
            <p className="font-support text-sm text-cream-soft">
              {party.members?.length ?? 0} of {party.maxPlayers} members
              {party.members?.length
                ? `: ${party.members.map((member) => member.username).join(', ')}`
                : ''}
            </p>
          </div>
        ) : null}

        {partyError ? (
          <p role="alert" className="font-support text-sm text-accent-pink">
            {partyError}
          </p>
        ) : null}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
        <PanelCard title="Create Team" onClick={() => navigate('/team/create')} />
        <PanelCard title="Join Team" onClick={() => navigate('/team/join')} />
      </div>

      <Button variant="text-link" onClick={signOut} showArrow={false} className="relative z-10">
        Sign Out
      </Button>
    </main>
  )
}
