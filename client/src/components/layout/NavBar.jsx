import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { navLinks } from '../../constants/navLinks.js'
import { useScrollAnchor } from '../../hooks/useScrollAnchor.js'
import Button from '../ui/Button.jsx'
import somniumLogo from '../../assets/somniumLogo.png'
import { useAuth } from '../../context/AuthContext.jsx'

/**
 * Persistent top navigation bar for the Website screen.
 * Includes desktop navigation links and a responsive mobile hamburger drawer.
 */
export default function NavBar() {
  const { scrollToSection } = useScrollAnchor()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { isAuthenticated } = useAuth()

  const handleNavClick = (sectionId) => {
    setIsMobileMenuOpen(false)
    // Wait for the mobile menu closing animation to finish before scrolling
    // so the header height change doesn't interrupt or offset the scroll.
    setTimeout(() => {
      scrollToSection(sectionId)
    }, 300)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-void/90 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-4 sm:py-5" aria-label="Primary">
        <div className="hidden flex-1 items-center gap-10 md:flex">
          {navLinks
            .filter((link) => link.label !== 'Register Now')
            .slice(0, 2)
            .map((link) => (
              <button
                key={link.label}
                type="button"
                onClick={() => scrollToSection(link.sectionId)}
                className="font-body text-sm font-medium uppercase tracking-wide text-neutral-body transition-colors duration-200 hover:text-white"
              >
                {link.label}
              </button>
            ))}
        </div>

        <Link
          to="/"
          className="flex items-center gap-3 transition-opacity duration-200 hover:opacity-80"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <img src={somniumLogo} alt="" className="h-8 sm:h-10 w-auto invert-asset opacity-90 scale-[1.7] origin-left" aria-hidden="true" />
          <span className="font-brand text-xl sm:text-2xl font-bold tracking-wide text-white ml-2">SOMNIUM</span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden flex-1 items-center justify-end gap-10 md:flex">
          {navLinks
            .filter((link) => link.label !== 'Register Now')
            .slice(2)
            .map((link) => (
              <button
                key={link.label}
                type="button"
                onClick={() => scrollToSection(link.sectionId)}
                className="font-body text-sm font-medium uppercase tracking-wide text-neutral-body transition-colors duration-200 hover:text-white"
              >
                {link.label}
              </button>
            ))}

          {isAuthenticated ? (
            <Button variant="text-link" to="/team" showArrow={false}>
              My Team
            </Button>
          ) : (
            <Button variant="text-link" to="/auth" showArrow={false}>
              Register Now
            </Button>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-3 md:hidden">
          {isAuthenticated ? (
            <Button variant="text-link" to="/team" showArrow={false} className="text-xs px-2 py-1">
              My Team
            </Button>
          ) : (
            <Button variant="text-link" to="/auth" showArrow={false} className="text-xs px-2 py-1">
              Register
            </Button>
          )}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-neutral-300 hover:text-white focus:outline-none"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-white/10 bg-void/95 backdrop-blur-xl md:hidden"
          >
            <div className="flex flex-col gap-4 px-6 py-6 text-center">
              {navLinks
                .filter((link) => link.label !== 'Register Now')
                .map((link) => (
                  <button
                    key={link.label}
                    type="button"
                    onClick={() => handleNavClick(link.sectionId)}
                    className="font-heading text-sm uppercase tracking-widest text-white py-2 hover:text-amethyst-bright transition-colors"
                  >
                    {link.label}
                  </button>
                ))}
              <div className="pt-2 border-t border-white/10">
                <Button variant="pill" to={isAuthenticated ? "/team" : "/auth"} className="w-full justify-center text-sm py-3" onClick={() => setIsMobileMenuOpen(false)}>
                  {isAuthenticated ? 'My Team' : 'Register Now'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}