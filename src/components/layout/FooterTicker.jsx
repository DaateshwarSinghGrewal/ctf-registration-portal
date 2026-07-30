import ArrowIcon from '../ui/ArrowIcon.jsx'
import { footerTickerItems } from '../../constants/navLinks.js'

/**
 * Repeating marquee identified as Page 1B: a decorative, non-interactive
 * ticker of LEARN / CODE / COLLABORATE, duplicated to create a seamless
 * scrolling loop. Purely branding, not functional navigation.
 */
export default function FooterTicker() {
  const loopItems = [...footerTickerItems, ...footerTickerItems, ...footerTickerItems]

  return (
    <div className="w-full overflow-hidden border-y border-cream/10 bg-navy-deep py-6" aria-hidden="true">
      <div className="flex w-max animate-[ticker_22s_linear_infinite] items-center gap-16">
        {loopItems.map((item, index) => (
          <span key={`${item}-${index}`} className="flex items-center gap-4">
            <span className="font-support text-sm uppercase tracking-eyebrow text-cream-soft">
              {item}
            </span>
            <ArrowIcon className="text-gold" />
          </span>
        ))}
      </div>
    </div>
  )
}