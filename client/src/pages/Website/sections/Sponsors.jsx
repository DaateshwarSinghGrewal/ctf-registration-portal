import SectionHeading from '../../../components/ui/SectionHeading.jsx'
import StarfieldBackground from '../../../components/layout/StarfieldBackground.jsx'

const sponsors = [
  { name: 'Goldman Sachs', logo: 'Goldman Sachs' }, // We'll just use text or actual logos if we have them, for now styled text.
  { name: 'American Express', logo: 'AMERICAN EXPRESS' }
]

/**
 * Page 4B — Sponsors. Heading over a starfield, anchored by the nav
 * bar's "Sponsors" link.
 */
export default function Sponsors() {
  return (
    <section className="section-shell relative px-6 py-24 sm:py-32" id="sponsors">
      <StarfieldBackground density={50} glow={true} />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center gap-16 text-center">
        <SectionHeading eyebrow="With Thanks To" title="Our" accentWord="Sponsors" align="center" />

        <ul className="flex flex-col gap-10 sm:flex-row sm:gap-16">
          <li className="flex items-center justify-center surface-card p-10 sm:w-1/2">
            <span className="font-heading text-4xl font-bold tracking-widest text-white/90">
              Goldman<br />Sachs
            </span>
          </li>
          <li className="flex items-center justify-center surface-card p-10 sm:w-1/2">
            <span className="font-heading text-3xl font-bold tracking-widest text-white/90">
              AMERICAN<br />EXPRESS
            </span>
          </li>
        </ul>
      </div>
    </section>
  )
}