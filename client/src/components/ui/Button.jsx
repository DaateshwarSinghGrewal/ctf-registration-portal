import { Link } from 'react-router-dom'
import ArrowIcon from './ArrowIcon.jsx'

const BASE_PILL =
  'inline-flex items-center justify-center surface-card px-12 py-6 font-brand text-3xl font-bold text-white transition-all duration-300 hover:shadow-crystal hover:border-amethyst/50 focus-visible:outline-amethyst'

const BASE_TEXT_LINK =
  'inline-flex items-center gap-2 border-b border-amethyst/60 pb-1 font-body text-xs font-semibold uppercase tracking-wide text-amethyst transition-colors duration-200 hover:text-white hover:border-white'

/**
 * Unified button component covering the two button styles identified in
 * the Figma audit:
 *  - "pill": the large rounded-panel CTA (Create Team, Join Team)
 *  - "text-link": the arrow-suffixed text action (Register Now, Website ->,
 *    Discord ->, Instagram ->, Video Link, Order Now)
 *
 * Renders as a router <Link> when "to" is provided, a plain <a> when
 * "href" is provided, or a <button> when neither is present (for
 * onClick-only actions such as triggering Google sign-in).
 */
export default function Button({
  children,
  variant = 'pill',
  to,
  href,
  onClick,
  type = 'button',
  showArrow = variant === 'text-link',
  className = '',
  ...rest
}) {
  const baseClass = variant === 'pill' ? BASE_PILL : BASE_TEXT_LINK
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