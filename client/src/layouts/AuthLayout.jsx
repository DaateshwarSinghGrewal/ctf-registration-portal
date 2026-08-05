import { Outlet } from 'react-router-dom'
import NavBar from '../components/layout/NavBar.jsx'

/**
 * Minimal layout for the gated flow: Google Auth, Team Management,
 * Create Team, and Join Team. Now includes the nav bar per user request.
 */
export default function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-navy">
      <NavBar />
      <Outlet />
    </div>
  )
}