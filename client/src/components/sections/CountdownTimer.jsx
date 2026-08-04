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
    <div className="flex flex-col items-center gap-6">
      <p className="font-heading text-lg font-medium uppercase tracking-wide text-amethyst-bright">Starts in</p>
      <div className="flex items-center gap-6 sm:gap-10" role="timer" aria-live="polite">
        {units.map((unit) => (
          <div key={unit.label} className="flex min-w-[80px] flex-col items-center gap-2 surface-card px-4 py-4 sm:min-w-[100px]">
            <span className="font-brand text-4xl font-bold text-white sm:text-5xl">
              {String(unit.value).padStart(2, '0')}
            </span>
            <span className="font-body text-xs font-semibold uppercase tracking-wide text-neutral-body">
              {unit.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}