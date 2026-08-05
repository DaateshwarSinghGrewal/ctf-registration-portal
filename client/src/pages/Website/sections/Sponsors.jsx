import SectionHeading from '../../../components/ui/SectionHeading.jsx'
import { GradientHeading } from '../../../components/ui/gradient-heading.jsx'
import { LogoCarousel } from '../../../components/ui/logo-carousel.jsx'
import StarfieldBackground from '../../../components/layout/StarfieldBackground.jsx'
import googleLogo from '../../../assets/google.png'
import linkedinLogo from '../../../assets/linkedin.png'

const GoogleIcon = (props) => <img src={googleLogo} alt="Google" {...props} />
const LinkedinIcon = (props) => <img src={linkedinLogo} alt="LinkedIn" {...props} />

const allLogos = [
  // First layer
  { name: 'Google 1', id: 1, img: GoogleIcon },
  { name: 'LinkedIn 1', id: 2, img: LinkedinIcon },
  { name: 'Google 2', id: 3, img: GoogleIcon },
  // Second layer (for animation cycling)
  { name: 'LinkedIn 2', id: 4, img: LinkedinIcon },
  { name: 'Google 3', id: 5, img: GoogleIcon },
  { name: 'LinkedIn 3', id: 6, img: LinkedinIcon },
]

/**
 * Page 4B — the "Sponsors" section. Includes placeholder logo cards
 * representing incoming sponsorship tiers.
 */
export default function Sponsors() {
  return (
    <section className="section-shell relative px-6 py-24 sm:py-32" id="sponsors">
      <StarfieldBackground density={40} glow={false} />
      
      <div className="relative z-10 mx-auto flex w-full max-w-screen-lg flex-col items-center space-y-16">
        <div className="text-center w-full max-w-4xl pb-18">
          <SectionHeading 
            eyebrow="Our Partners" 
            title="Backed by the" 
            accentWord="Best" 
            align="center" 
          />
        </div>

        <div className="flex w-full max-w-4xl justify-center">
          <LogoCarousel columnCount={3} logos={allLogos} />
        </div>
      </div>
    </section>
  )
}