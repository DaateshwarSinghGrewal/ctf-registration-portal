import SiteLayout from '../layouts/SiteLayout.jsx'
import AuthLayout from '../layouts/AuthLayout.jsx'
import WebsitePage from '../pages/Website/WebsitePage.jsx'
import GoogleAuthPage from '../pages/GoogleAuth/GoogleAuthPage.jsx'
import TeamManagementPage from '../pages/TeamManagement/TeamManagementPage.jsx'
import CreateTeamPage from '../pages/TeamManagement/CreateTeamPage.jsx'
import JoinTeamPage from '../pages/TeamManagement/JoinTeamPage.jsx'
import NotFoundPage from '../pages/NotFound/NotFoundPage.jsx'

/**
 * Centralized route configuration, matching the routing analysis:
 *  - "/" renders the Website's single long scroll page under SiteLayout
 *    (the only route with the persistent nav bar).
 *  - "/auth" is the Google Auth screen — the gate between the Website's
 *    "Register Now" CTA and Team Management.
 *  - "/team" is the post-auth Team Management screen, with "/team/create"
 *    and "/team/join" as the terminal destinations of its two CTAs.
 *  All three gated routes share AuthLayout (no nav bar).
 */
export const routes = [
  {
    element: <SiteLayout />,
    children: [{ path: '/', element: <WebsitePage /> }]
  },
  {
    element: <AuthLayout />,
    children: [
      { path: '/auth', element: <GoogleAuthPage /> },
      { path: '/team', element: <TeamManagementPage /> },
      { path: '/team/create', element: <CreateTeamPage /> },
      { path: '/team/join', element: <JoinTeamPage /> }
    ]
  },
  {
    element: <AuthLayout />,
    children: [{ path: '*', element: <NotFoundPage /> }]
  }
]