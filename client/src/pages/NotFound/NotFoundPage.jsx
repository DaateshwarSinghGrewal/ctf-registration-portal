import StarfieldBackground from '../../components/layout/StarfieldBackground.jsx'
import Button from '../../components/ui/Button.jsx'

/**
 * Fallback screen for unmatched routes. Not part of the original Figma
 * file, but required for a production-quality router configuration.
 */
export default function NotFoundPage() {
  return (
    <main className="section-shell relative flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <StarfieldBackground density={70} glow={false} />

      <div className="relative z-10 flex flex-col items-center gap-4">
        <p className="eyebrow">Lost in the Dream</p>
        <h1 className="font-hero text-5xl font-bold text-cream sm:text-6xl">Page not found</h1>
        <p className="max-w-sm font-support text-base text-cream-soft">
          This orbit doesn&rsquo;t exist. Head back to the beginning.
        </p>
        <Button variant="pill" to="/">
          Return Home
        </Button>
      </div>
    </main>
  )
}