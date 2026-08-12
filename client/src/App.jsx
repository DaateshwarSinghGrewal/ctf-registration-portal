import { useRoutes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { SocketProvider } from './realtime/SocketProvider.jsx'
import { routes } from './router/routes.jsx'
import DiscordOverlay from './components/ui/DiscordOverlay.jsx'
import { Analytics } from '@vercel/analytics/react'

/**
 * Root application component. Wraps the routed tree in AuthProvider so
 * every screen (Website, Google Auth, Team Management, Create/Join Team)
 * can read and update sign-in state. Includes persistent Discord overlay.
 *
 * SocketProvider sits inside AuthProvider because the realtime connection is
 * authenticated by the session cookie: it opens once the user is signed in and
 * closes on sign-out, which it can only know from auth state.
 */
export default function App() {
  const element = useRoutes(routes)
  return (
    <AuthProvider>
      <SocketProvider>
        {element}
        <DiscordOverlay />
        <Analytics />
      </SocketProvider>
    </AuthProvider>
  )
}
