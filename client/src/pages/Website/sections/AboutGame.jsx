import SectionHeading from '../../../components/ui/SectionHeading.jsx'

/**
 * Page 2B — narrative framing for Somnium specifically: the dream-world
 * premise layered on top of the standard CTF format. Second section
 * anchored by the nav bar's "About" link.
 */
export default function AboutGame() {
  return (
    <section className="section-shell px-6 py-24 sm:py-32" id="about">
      <div className="mx-auto flex max-w-3xl flex-col gap-10 md:flex-row md:items-center">
        <SectionHeading
          eyebrow="A Night Beneath the Stars"
          title="About the"
          accentWord="Game"
          accentVariant="accent"
          description="Somnium places every team inside a shared dream: five orbits, each holding its own challenges, each demanding a different kind of thinking to escape. Progress through the night sky one theme at a time, and wake only once every orbit has been cleared."
        />

        <img
          src="/assets/images/about-the-game.jpg"
          alt="A team of competitors gathered around laptops during a previous Somnium event"
          className="w-full max-w-sm rounded-lg object-cover md:w-1/2"
          loading="lazy"
        />
      </div>
    </section>
  )
}