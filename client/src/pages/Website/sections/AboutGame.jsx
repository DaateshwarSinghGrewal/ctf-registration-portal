import SectionHeading from '../../../components/ui/SectionHeading.jsx'
import StarfieldBackground from '../../../components/layout/StarfieldBackground.jsx'
import somniumLogo from '../../../assets/somniumLogo.png'

/**
 * Page 2B — narrative framing for Somnium specifically: the dream-world
 * premise layered on top of the standard CTF format. Second section
 * anchored by the nav bar's "About" link.
 */
export default function AboutGame() {
  return (
    <section className="section-shell relative px-6 pt-8 pb-24 sm:pt-12 sm:pb-32" id="about">
      <StarfieldBackground density={50} glow={false} />
      <div className="relative z-10 mx-auto grid max-w-5xl grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-8">
        {/* Left Column: Somnium Logo */}
        <div className="flex justify-center md:justify-end">
          <img
            src={somniumLogo}
            alt="Somnium Emblem"
            className="w-3/4 max-w-[300px] md:w-full md:max-w-[450px] filter drop-shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-transform duration-700 hover:scale-105"
          />
        </div>

        {/* Right Column: Content */}
        <div className="flex flex-col gap-10 text-center md:text-left">
          <SectionHeading
            eyebrow="A Night Beneath the Stars"
            title="About the"
            accentWord="Game"
            accentVariant="crystal"
            description="Somnium places every team inside a shared dream: five orbits, each holding its own challenges, each demanding a different kind of thinking to escape. Progress through the night sky one theme at a time, and wake only once every orbit has been cleared."
          />
        </div>
      </div>
    </section>
  )
}