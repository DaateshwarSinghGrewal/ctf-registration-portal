import { Link } from 'react-router-dom'
import { navLinks } from '../../constants/navLinks.js'
import { useScrollAnchor } from '../../hooks/useScrollAnchor.js'
import Button from '../ui/Button.jsx'

/**
 * Persistent top navigation bar for the Website screen only (Team
 * Management and Google Auth have no nav bar per the routing analysis).
 * "About", "Sponsors", and "Info" scroll to in-page sections; "Register
 * Now" is the single cross-screen route, sending the visitor to /auth.
 */
export default function NavBar() {
  const { scrollToSection } = useScrollAnchor()

  return (
    <header className="sticky top-0 z-40 w-full border-b border-cream/10 bg-ink">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5" aria-label="Primary">
        <div className="hidden flex-1 items-center gap-10 md:flex">
          {navLinks
            .filter((link) => link.label !== 'Register Now')
            .slice(0, 2)
            .map((link) => (
              <button
                key={link.label}
                type="button"
                onClick={() => scrollToSection(link.sectionId)}
                className="font-nav text-sm uppercase tracking-navlink text-cream transition-colors duration-200 hover:text-gold"
              >
                {link.label}
              </button>
            ))}
        </div>

        <Link
          to="/"
          className="font-nav text-2xl uppercase tracking-navlink text-cream transition-colors duration-200 hover:text-gold"
        >
          Somnium
        </Link>

        <div className="hidden flex-1 items-center justify-end gap-10 md:flex">
          {navLinks
            .filter((link) => link.label !== 'Register Now')
            .slice(2)
            .map((link) => (
              <button
                key={link.label}
                type="button"
                onClick={() => scrollToSection(link.sectionId)}
                className="font-nav text-sm uppercase tracking-navlink text-cream transition-colors duration-200 hover:text-gold"
              >
                {link.label}
              </button>
            ))}

          <Button variant="text-link" to="/auth" showArrow={false}>
            Register Now
          </Button>
        </div>

        <Button variant="text-link" to="/auth" showArrow={false} className="md:hidden">
          Register
        </Button>
      </nav>
    </header>
  )
}