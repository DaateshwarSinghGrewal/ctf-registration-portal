import { useMemo } from 'react'

/**
 * Reusable ambient backdrop identified across sections.
 * Replaces the original starfield with a subtle crystal particle 
 * effect and a deep void/purple radial glow.
 */
export default function StarfieldBackground({ density = 60, glow = true, className = '' }) {
  const particles = useMemo(() => {
    let seed = 42
    const pseudoRandom = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }

    return Array.from({ length: density }, (_, index) => ({
      id: index,
      top: pseudoRandom() * 100,
      left: pseudoRandom() * 100,
      size: 2 + pseudoRandom() * 4,
      opacity: 0.1 + pseudoRandom() * 0.4,
      delay: pseudoRandom() * 5,
      duration: 10 + pseudoRandom() * 10,
      rotation: pseudoRandom() * 360
    }))
  }, [density])

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden grain-overlay ${className}`}
      aria-hidden="true"
    >
      {glow ? (
        <div className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-void-radial opacity-60" />
      ) : null}

      {particles.map((particle) => (
        <span
          key={particle.id}
          className="absolute bg-amethyst-bright"
          style={{
            top: `${particle.top}%`,
            left: `${particle.left}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            opacity: particle.opacity,
            animation: `float ${particle.duration}s ease-in-out infinite`,
            animationDelay: `${particle.delay}s`,
            transform: `rotate(${particle.rotation}deg)`,
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' // Diamond shape
          }}
        />
      ))}
    </div>
  )
}