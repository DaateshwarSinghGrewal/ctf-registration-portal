import SectionHeading from '../../../components/ui/SectionHeading.jsx'
import { GradientHeading } from '../../../components/ui/gradient-heading.jsx'
import { LogoCarousel } from '../../../components/ui/logo-carousel.jsx'
import {
  Gamepad2,
  Trophy,
  Swords,
  ShieldAlert,
  TerminalSquare,
  Ghost,
  Fingerprint,
  Cpu,
  Binary
} from 'lucide-react'

const allLogos = [
  { name: 'Gaming Partner', id: 1, img: Gamepad2 },
  { name: 'Award Partner', id: 2, img: Trophy },
  { name: 'Security Partner', id: 3, img: ShieldAlert },
  { name: 'Code Partner', id: 4, img: TerminalSquare },
  { name: 'Stealth Partner', id: 5, img: Ghost },
  { name: 'Identity Partner', id: 6, img: Fingerprint },
  { name: 'Hardware Partner', id: 7, img: Cpu },
  { name: 'Tech Partner', id: 8, img: Binary },
  { name: 'Battle Partner', id: 9, img: Swords },
]

/**
 * Page 4B — the "Sponsors" section. Includes placeholder logo cards
 * representing incoming sponsorship tiers.
 */
export default function Sponsors() {
  return (
    <section className="section-shell relative px-6 py-24 sm:py-32" id="sponsors">
      <div className="relative z-10 mx-auto flex w-full max-w-screen-lg flex-col items-center space-y-16">
        <div className="text-center w-full max-w-4xl">
          <SectionHeading 
            eyebrow="Our Partners" 
            title="Backed by the" 
            accentWord="Best" 
            align="center" 
          />
        </div>

        <div className="w-full max-w-4xl opacity-80 mix-blend-screen">
          <LogoCarousel columnCount={4} logos={allLogos} />
        </div>
      </div>
    </section>
  )
}