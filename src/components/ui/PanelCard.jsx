/**
 * The reused rounded-panel container identified in the Figma audit:
 * a navy, 86px-radius panel that hosts a single centered serif title.
 * Reused, with only its label swapped, for "Create Team", "Join Team",
 * the "Team Management" screen header, and the "Google Sign In" panel.
 */
export default function PanelCard({ title, onClick, to, as: Tag, className = '' }) {
  const Component = Tag ?? (onClick ? 'button' : 'div')

  return (
    <Component
      type={Component === 'button' ? 'button' : undefined}
      onClick={onClick}
      className={`flex h-[106px] w-full max-w-[456px] items-center justify-center rounded-panel bg-navy-panel px-8 text-center font-hero text-4xl font-bold text-cream shadow-lg transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-gold sm:text-5xl ${className}`}
    >
      {title}
    </Component>
  )
}