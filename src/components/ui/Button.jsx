import { Link } from 'react-router-dom'
import ArrowIcon from './ArrowIcon.jsx'

const BASE_PILL =
  'inline-flex items-center justify-center rounded-panel bg-navy-panel px-12 py-6 font-hero text-3xl font-bold text-cream transition-colors duration-200 hover:bg-navy-deep focus-visible:outline-gold'

const BASE_TEXT_LINK =
  'inline-flex items-center gap-2 border-b border-gold/60 pb-1 font-support text-xs uppercase tracking-navlink text-gold transition-colors duration-200 hover:text-cream hover:border-cream'

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