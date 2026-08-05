import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import StarfieldBackground from '../components/layout/StarfieldBackground.jsx'
import somniumLogo from '../assets/somniumLogo.png'

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
      <main className="section-shell relative flex min-h-screen flex-col items-center justify-center px-6 py-24 text-center bg-void">
        <StarfieldBackground density={50} glow={true} />
        
        <div className="relative z-10 flex flex-col items-center gap-6">
          {/* Somnium Emblem with Ambient Glow */}
          <div className="relative flex items-center justify-center">
            <img 
              src={somniumLogo} 
              alt="Somnium Emblem" 
              className="h-16 w-auto invert-asset opacity-90 filter drop-shadow-[0_0_25px_rgba(168,85,247,0.5)] animate-pulse" 
            />
          </div>

          {/* Clean Brand Heading */}
          <div className="flex flex-col items-center gap-2">
            <span className="font-brand text-2xl font-bold tracking-widest text-white">
              SOMNIUM
            </span>
            <p className="font-heading text-xs uppercase tracking-[0.3em] text-crystal-light">
              INITIALIZING TERMINAL
            </p>
          </div>

          {/* Subtle Ambient Line */}
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-amethyst/60 to-transparent" />
        </div>
      </main>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
