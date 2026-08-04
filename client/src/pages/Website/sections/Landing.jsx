import CountdownTimer from '../../../components/sections/CountdownTimer.jsx'
import StarfieldBackground from '../../../components/layout/StarfieldBackground.jsx'
import GradientText from '../../../components/ui/GradientText.jsx'

/**
 * Page 1A — Landing hero. The most characteristic screen in the file:
 * event title, moon/star illustration backdrop, and the registration
 * countdown.
 */
export default function Landing() {
  return (
    <section className="section-shell flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <StarfieldBackground density={120} />

      <div className="relative z-10 flex flex-col items-center gap-10 text-center">
        <p className="font-badge text-sm uppercase tracking-eyebrow text-gold/70">2026</p>

        <h1 className="font-hero text-6xl font-bold leading-none text-cream sm:text-8xl">
          CCS Presents
          <br />
          <GradientText variant="gold" as="span" className="text-7xl sm:text-9xl">
            Somnium
          </GradientText>
        </h1>

        <p className="font-signature text-3xl text-gold sm:text-4xl">Somnium &rsquo;26</p>

        <CountdownTimer />
      </div>
    </section>
  )
}