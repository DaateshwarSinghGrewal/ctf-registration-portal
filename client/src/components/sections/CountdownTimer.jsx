import { useCountdown } from '../../hooks/useCountdown.js'
import { Play } from 'lucide-react'
import Button from '../ui/Button.jsx'

const REGISTRATION_TARGET_DATE = '2026-08-15T21:10:00+05:30'

/**
 * Hero countdown ("Starts in") identified on the Landing section (Page
 * 1A). Displays whole days, hours, minutes, and seconds until the event
 * start date. When the timer is complete, displays a Play button.
 */
export default function CountdownTimer() {
  const { days, hours, minutes, seconds } = useCountdown(REGISTRATION_TARGET_DATE)

  // Toggle this flag to true to show the PLAY NOW button instead of the timer
  const SHOW_BUTTON = true

  const units = [
    { label: 'Days', value: days },
    { label: 'Hours', value: hours },
    { label: 'Minutes', value: minutes },
    { label: 'Seconds', value: seconds }
  ]

  if (SHOW_BUTTON) {
    return (
      <div className="flex flex-col items-center justify-center max-w-full min-h-[140px]">
        <Button 
          variant="primary" 
          href="https://game.ccstiet.com"
          className="!text-white !rounded-full px-16 py-5 !text-2xl font-bold tracking-[0.15em] hover:scale-105 transition-transform duration-300 shadow-[0_0_40px_rgba(168,85,247,0.4)]"
        >
          <span className="flex items-center gap-3">
            <Play size={36} className="fill-current" />
            <span>PLAY NOW</span>
          </span>
        </Button>
      </div>
    )
  }

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