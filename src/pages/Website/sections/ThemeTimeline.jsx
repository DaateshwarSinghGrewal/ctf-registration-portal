import SectionHeading from '../../../components/ui/SectionHeading.jsx'
import StarfieldBackground from '../../../components/layout/StarfieldBackground.jsx'

const orbits = [
  {
    level: 'Orbit One',
    name: 'The Threshold',
    description: 'Warm-up challenges that introduce the tools and mindset every later orbit builds on.'
  },
  {
    level: 'Orbit Two',
    name: 'The Static',
    description: 'Signal-and-noise puzzles across networking and forensics, where the flag hides in the artifact.'
  },
  {
    level: 'Orbit Three',
    name: 'The Cipher',
    description: 'Cryptography-focused challenges that reward careful, methodical reasoning over brute force.'
  },
  {
    level: 'Orbit Four',
    name: 'The Undertow',
    description: 'Web and binary exploitation challenges that ask teams to think like an attacker.'
  },
  {
    level: 'Orbit Five',
    name: 'The Waking',
    description: 'The final orbit — the hardest challenges of the night, reserved for teams still dreaming at the end.'
  }
]

/**
 * Page 3A — Theme Timeline. Five orbit/level groups, each holding a
 * level description. This content genuinely is an ordered progression
 * (each orbit builds on the last), so the sequence itself carries
 * information and the numbering/labeling is preserved deliberately
 * rather than as decoration.
 */
export default function ThemeTimeline() {
  return (
    <section className="section-shell relative px-6 py-24 sm:py-32">
      <StarfieldBackground density={60} glow={false} />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col gap-16">
        <SectionHeading
          eyebrow="Five Orbits, One Night"
          title="The"
          accentWord="Theme"
          align="center"
          description="Somnium unfolds across five orbits. Each one opens once the last is cleared."
        />

        <ol className="flex flex-col gap-10">
          {orbits.map((orbit, index) => (
            <li key={orbit.name} className="flex flex-col gap-2 border-l border-gold-muted/40 pl-6">
              <p className="font-support text-xs uppercase tracking-eyebrow text-gold">
                {String(index + 1).padStart(2, '0')} — {orbit.level}
              </p>
              <h3 className="font-display text-3xl text-cream sm:text-4xl">{orbit.name}</h3>
              <p className="max-w-xl font-body text-lg text-neutral-body sm:text-xl">
                {orbit.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}