/**
 * The single functional icon identified in the Figma audit: a small arrow
 * used next to outbound/text-link actions (Website ->, Discord ->,
 * Instagram ->, Video Link, footer ticker items).
 */
export default function ArrowIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 13 13"
      width="13"
      height="13"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M1 12L12 1M12 1H4M12 1V9"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}