import { useEffect, useMemo, useState } from 'react'

/**
 * Drives the "Starts in" hero countdown on the Website landing section.
 * Returns whole days, hours, minutes, and seconds remaining until
 * targetDate, updating once per second. Once the target has passed,
 * all values clamp to zero rather than going negative.
 */
export function useCountdown(targetDate) {
  const targetTime = useMemo(() => new Date(targetDate).getTime(), [targetDate])
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  const remainingMs = Math.max(targetTime - now, 0)

  const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((remainingMs / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((remainingMs / (1000 * 60)) % 60)
  const seconds = Math.floor((remainingMs / 1000) % 60)

  return {
    days,
    hours,
    minutes,
    seconds,
    isComplete: remainingMs === 0
  }
}