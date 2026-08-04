import SectionHeading from '../../../components/ui/SectionHeading.jsx'

/**
 * Page 2B — narrative framing for Somnium specifically: the dream-world
 * premise layered on top of the standard CTF format. Second section
 * anchored by the nav bar's "About" link.
 */
export default function AboutGame() {
  return (
    <section className="section-shell relative px-6 py-24 sm:py-32" id="about">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-crystal-mid/20 via-void to-void" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col gap-10">
        <SectionHeading
          eyebrow="A Night Beneath the Stars"
          title="About the"
          accentWord="Game"
          accentVariant="crystal"
          description="Somnium places every team inside a shared dream: five orbits, each holding its own challenges, each demanding a different kind of thinking to escape. Progress through the night sky one theme at a time, and wake only once every orbit has been cleared."
        />
      </div>
    </section>
  )
}