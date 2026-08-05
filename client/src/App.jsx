import { useRoutes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { routes } from './router/routes.jsx'
import DiscordOverlay from './components/ui/DiscordOverlay.jsx'

/**
 * Root application component. Wraps the routed tree in AuthProvider so
 * every screen (Website, Google Auth, Team Management, Create/Join Team)
 * can read and update sign-in state. Includes persistent Discord overlay.
 */
export default function App() {
  const element = useRoutes(routes)
  return (
    <AuthProvider>
      {element}
      <DiscordOverlay />
    </AuthProvider>
  )
}