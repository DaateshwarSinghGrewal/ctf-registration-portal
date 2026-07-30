import { Outlet } from 'react-router-dom'
import NavBar from '../components/layout/NavBar.jsx'

/**
 * Layout for the Website screen: persistent nav bar wrapping the routed
 * page content. Only the Website uses this layout, per the routing
 * analysis (Google Auth and Team Management have no nav bar).
 */
export default function SiteLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-navy">
      <NavBar />
      <Outlet />
    </div>
  )
}