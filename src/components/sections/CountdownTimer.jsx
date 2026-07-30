import { useCountdown } from '../../hooks/useCountdown.js'

const REGISTRATION_TARGET_DATE = '2026-10-16T00:00:00'

/**
 * Hero countdown ("Starts in") identified on the Landing section (Page
 * 1A). Displays whole days, hours, minutes, and seconds until the event
 * start date.
 */
export default function CountdownTimer() {
  const { days, hours, minutes, seconds } = useCountdown(REGISTRATION_TARGET_DATE)

  const units = [
    { label: 'Days', value: days },
    { label: 'Hours', value: hours },
    { label: 'Minutes', value: minutes },
    { label: 'Seconds', value: seconds }
  ]

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="font-countdown text-lg uppercase tracking-eyebrow text-gold">Starts in</p>
      <div className="flex items-center gap-6 sm:gap-10" role="timer" aria-live="polite">
        {units.map((unit) => (
          <div key={unit.label} className="flex flex-col items-center gap-1">
            <span className="font-countdown text-4xl text-cream sm:text-5xl">
              {String(unit.value).padStart(2, '0')}
            </span>
            <span className="font-support text-xs uppercase tracking-navlink text-cream-soft">
              {unit.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}