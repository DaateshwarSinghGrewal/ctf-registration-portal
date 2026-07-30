import { useNavigate } from 'react-router-dom'
import PanelCard from '../../components/ui/PanelCard.jsx'
import StarfieldBackground from '../../components/layout/StarfieldBackground.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

/**
 * Team Management screen. Reached after a successful Google sign-in
 * (per the routing analysis, this is the post-auth landing screen).
 * Offers the two terminal CTAs identified in the Figma audit: Create
 * Team and Join Team, both reusing the pill-panel component.
 */
export default function TeamManagementPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <main className="section-shell relative flex min-h-screen flex-col items-center justify-center gap-16 px-6 py-24">
      <StarfieldBackground density={90} />

      <div className="relative z-10 flex flex-col items-center gap-4 text-center">
        <p className="eyebrow">{user?.name ? `Welcome, ${user.name}` : 'Welcome'}</p>
        <PanelCard title="Team Management" as="div" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
        <PanelCard title="Create Team" onClick={() => navigate('/team/create')} />
        <PanelCard title="Join Team" onClick={() => navigate('/team/join')} />
      </div>
    </main>
  )
}