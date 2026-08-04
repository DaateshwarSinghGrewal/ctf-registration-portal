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
  }
]

/**
 * Page 3A — Theme Timeline. Four orbit/level groups, each holding a
 * level description. 
 */
export default function ThemeTimeline() {
  return (
    <section className="section-shell relative px-6 py-24 sm:py-32">
      <StarfieldBackground density={50} glow={false} />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col gap-16">
        <SectionHeading
          eyebrow="Four Orbits, One Night"
          title="The"
          accentWord="Theme"
          align="center"
          description="Somnium unfolds across four orbits. Each one opens once the last is cleared."
        />

        <ol className="flex flex-col gap-8">
          {orbits.map((orbit, index) => (
            <li key={orbit.name} className="flex flex-col gap-3 surface-card p-8 border-l-4 border-l-amethyst hover:border-l-amethyst-bright transition-all duration-300">
              <p className="font-heading text-xs font-semibold uppercase tracking-widest text-crystal-light">
                {String(index + 1).padStart(2, '0')} — {orbit.level}
              </p>
              <h3 className="font-heading text-3xl font-bold tracking-wide text-white sm:text-4xl">{orbit.name}</h3>
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