import { useMemo } from 'react'

/**
 * Reusable ambient starfield backdrop identified across the Landing
 * section, the Theme Timeline, Demo Video, the Registration teaser,
 * the Team Management screen, and the Google Auth screen. Renders a
 * fixed set of softly glowing particles plus an optional radial glow,
 * generated once per mount so the field stays stable across re-renders.
 */
export default function StarfieldBackground({ density = 80, glow = true, className = '' }) {
  const stars = useMemo(() => {
    let seed = 42
    const pseudoRandom = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }

    return Array.from({ length: density }, (_, index) => ({
      id: index,
      top: pseudoRandom() * 100,
      left: pseudoRandom() * 100,
      size: 1 + pseudoRandom() * 2,
      opacity: 0.25 + pseudoRandom() * 0.55,
      delay: pseudoRandom() * 4
    }))
  }, [density])

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {glow ? (
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-radial" />
      ) : null}

      {stars.map((star) => (
        <span
          key={star.id}
          className="absolute animate-pulse rounded-full bg-cream"
          style={{
            top: `${star.top}%`,
            left: `${star.left}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            animationDelay: `${star.delay}s`,
            animationDuration: '3s'
          }}
        />
      ))}
    </div>
  )
}