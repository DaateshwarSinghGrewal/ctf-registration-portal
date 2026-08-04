/**
 * Wraps a word or short phrase in one of the two accent treatments found
 * repeatedly in the Figma audit: a warm gold gradient (used for most
 * headline accents) or the cooler blue -> pink -> purple gradient (used
 * sparingly for single-word emphasis, e.g. "Game", "Video").
 */
export default function GradientText({ children, variant = 'crystal', as: Tag = 'span', className = '' }) {
  const gradientClass = variant === 'accent' ? 'text-gradient-accent' : 'text-gradient-crystal'

  return <Tag className={`${gradientClass} ${className}`}>{children}</Tag>
}