import { Outlet } from 'react-router-dom'

/**
 * Minimal layout for the gated flow: Google Auth, Team Management,
 * Create Team, and Join Team. No nav bar or footer — these screens are
 * standalone steps in the registration funnel, matching the Figma audit
 * finding that neither Team Management nor Google Auth carry the
 * Website's persistent nav.
 */
export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-navy">
      <Outlet />
    </div>
  )
}