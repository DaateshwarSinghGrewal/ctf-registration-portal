import { useCountdown } from '../../hooks/useCountdown.js'

const REGISTRATION_TARGET_DATE = '2026-08-16T00:00:00'

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
    <div className="flex flex-col items-center gap-4 sm:gap-6 max-w-full">
      <p className="font-heading text-base sm:text-lg font-medium uppercase tracking-wide text-amethyst-bright">Starts in</p>
      <div className="flex items-center justify-center gap-2 sm:gap-6 md:gap-10 max-w-full" role="timer" aria-live="polite">
        {units.map((unit) => (
          <div key={unit.label} className="flex min-w-[65px] sm:min-w-[80px] md:min-w-[100px] flex-col items-center gap-1 sm:gap-2 surface-card px-2 py-3 sm:px-4 sm:py-4">
            <span className="font-brand text-2xl sm:text-4xl md:text-5xl font-bold text-white">
              {String(unit.value).padStart(2, '0')}
            </span>
            <span className="font-body text-[9px] sm:text-xs font-semibold uppercase tracking-wide text-neutral-body">
              {unit.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}