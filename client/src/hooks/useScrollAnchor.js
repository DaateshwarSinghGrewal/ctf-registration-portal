import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * Handles the Website nav bar's in-page anchor links (About, Sponsors,
 * Info). These scroll to a section already present on the current page
 * rather than changing routes. If invoked from a different route, it
 * first navigates home, then scrolls once the page has rendered.
 */
export function useScrollAnchor() {
  const navigate = useNavigate()
  const location = useLocation()

  const scrollToSection = useCallback(
    (sectionId) => {
      const scroll = () => {
        const target = document.getElementById(sectionId)
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }

      if (location.pathname !== '/') {
        navigate('/')
        window.requestAnimationFrame(() => window.setTimeout(scroll, 50))
        return
      }

      scroll()
    },
    [location.pathname, navigate]
  )

  return { scrollToSection }
}