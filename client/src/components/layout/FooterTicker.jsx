import { footerTickerItems } from '../../constants/navLinks.js'

/**
 * Repeating marquee identified as Page 1B: a decorative, non-interactive
 * ticker of LEARN / CODE / COLLABORATE, duplicated to create a seamless
 * scrolling loop. Purely branding, not functional navigation.
 */
export default function FooterTicker() {
  const loopItems = [...footerTickerItems, ...footerTickerItems, ...footerTickerItems]

  return (
    <div className="w-full overflow-hidden border-y border-white/5 bg-void-soft py-6" aria-hidden="true">
      <div className="flex w-max animate-[drift_22s_linear_infinite] items-center gap-16">
        {loopItems.map((item, index) => (
          <span key={`${item}-${index}`} className="flex items-center gap-4">
            <span className="font-heading text-sm font-semibold uppercase tracking-wide text-neutral-muted">
              {item}
            </span>
            {/* Meaningful CTF Flag Icon replacing the arrow */}
            <svg 
              viewBox="0 0 24 24" 
              width="14" 
              height="14" 
              fill="currentColor" 
              className="text-crystal-light opacity-80"
              aria-hidden="true"
            >
              <path d="M5 3v18h2V12h12l-3-4.5 3-4.5H7V3H5z" />
            </svg>
          </span>
        ))}
      </div>
    </div>
  )
}