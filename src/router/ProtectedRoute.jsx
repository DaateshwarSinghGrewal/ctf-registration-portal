import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import StarfieldBackground from '../components/layout/StarfieldBackground.jsx'

/**
 * Route guard for the gated Team Management flow.
 *
 * The session check is a network round trip, so an interim state is required:
 * redirecting while it is still in flight would bounce a signed-in user to
 * /auth on every refresh. The attempted path is passed along so sign-in can
 * return the user where they were headed.
 */
export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <main className="section-shell relative flex min-h-screen flex-col items-center justify-center px-6 py-24 text-center">
        <StarfieldBackground density={70} glow={false} />
        <p className="relative z-10 font-support text-lg text-cream-soft">
          Checking your session…
        </p>
      </main>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
