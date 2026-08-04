/**
 * The reused rounded-panel container identified in the Figma audit:
 * a navy, 86px-radius panel that hosts a single centered serif title.
 * Reused, with only its label swapped, for "Create Team", "Join Team",
 * the "Team Management" screen header, and the "Google Sign In" panel.
 */
export default function PanelCard({ title, onClick, as: Tag, className = '' }) {
  const Component = Tag ?? (onClick ? 'button' : 'div')

  return (
    <Component
      type={Component === 'button' ? 'button' : undefined}
      onClick={onClick}
      className={`flex h-[106px] w-full max-w-[456px] items-center justify-center surface-card px-8 text-center font-brand text-4xl font-bold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-crystal hover:border-amethyst/50 focus-visible:outline-amethyst sm:text-5xl ${className}`}
    >
      {title}
    </Component>
  )
}