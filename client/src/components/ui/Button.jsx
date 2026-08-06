import { Link } from 'react-router-dom'
import ArrowIcon from './ArrowIcon.jsx'

const BASE_PILL =
  'inline-flex items-center justify-center surface-card px-12 py-6 font-brand text-3xl font-bold text-white transition-all duration-300 hover:shadow-crystal hover:border-amethyst/50 focus-visible:outline-amethyst'

const BASE_TEXT_LINK =
  'inline-flex items-center gap-2 border-b border-amethyst/60 pb-1 font-body text-xs font-semibold uppercase tracking-wide text-amethyst transition-colors duration-200 hover:text-white hover:border-white'

const BASE_PRIMARY =
  'inline-flex items-center justify-center bg-amethyst hover:bg-amethyst-light text-void font-heading tracking-widest text-sm font-bold uppercase px-6 py-3 rounded-lg transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] disabled:opacity-50'

const BASE_SECONDARY =
  'inline-flex items-center justify-center bg-black/40 border border-white/10 hover:bg-white/10 text-white font-heading tracking-widest text-sm uppercase px-6 py-3 rounded-lg transition-all disabled:opacity-50'

/**
 * Unified button component covering the button styles identified in
 * the Figma audit:
 *  - "pill": the large rounded-panel CTA (Create Team, Join Team)
 *  - "text-link": the arrow-suffixed text action (Register Now, Website ->, etc)
 *  - "primary": filled vibrant action for modals and forms
 *  - "secondary": subdued outline action for modals and forms
 *
 * Renders as a router <Link> when "to" is provided, a plain <a> when
 * "href" is provided, or a <button> when neither is present (for
 * onClick-only actions such as triggering Google sign-in).
 */
export default function Button({
  children,
  variant = 'primary',
  to,
  href,
  onClick,
  type = 'button',
  showArrow = variant === 'text-link',
  className = '',
  ...rest
}) {
  let baseClass
  if (variant === 'pill') baseClass = BASE_PILL
  else if (variant === 'primary') baseClass = BASE_PRIMARY
  else if (variant === 'secondary') baseClass = BASE_SECONDARY
  else baseClass = BASE_TEXT_LINK

  const combinedClass = `${baseClass} ${className}`.trim()

  const content = (
    <>
      <span>{children}</span>
      {showArrow ? <ArrowIcon /> : null}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={combinedClass} {...rest}>
        {content}
      </Link>
    )
  }

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={combinedClass} {...rest}>
        {content}
      </a>
    )
  }

  return (
    <button type={type} onClick={onClick} className={combinedClass} {...rest}>
      {content}
    </button>
  )
}