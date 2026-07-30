import SectionHeading from '../../../components/ui/SectionHeading.jsx'
import StarfieldBackground from '../../../components/layout/StarfieldBackground.jsx'

const sponsors = [
  { name: 'Nova Systems', logo: '/assets/images/sponsors/nova-systems.svg' },
  { name: 'Lumen Cyber', logo: '/assets/images/sponsors/lumen-cyber.svg' },
  { name: 'Halcyon Labs', logo: '/assets/images/sponsors/halcyon-labs.svg' },
  { name: 'Driftwood Security', logo: '/assets/images/sponsors/driftwood-security.svg' }
]

/**
 * Page 4B — Sponsors. Heading over a starfield, anchored by the nav
 * bar's "Sponsors" link.
 */
export default function Sponsors() {
  return (
    <section className="section-shell relative px-6 py-24 sm:py-32" id="sponsors">
      <StarfieldBackground density={70} glow={false} />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center gap-12 text-center">
        <SectionHeading eyebrow="With Thanks To" title="Our" accentWord="Sponsors" align="center" />

        <ul className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          {sponsors.map((sponsor) => (
            <li key={sponsor.name} className="flex items-center justify-center">
              <img
                src={sponsor.logo}
                alt={sponsor.name}
                className="max-h-12 w-auto opacity-80 grayscale transition-opacity duration-200 hover:opacity-100"
                loading="lazy"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}