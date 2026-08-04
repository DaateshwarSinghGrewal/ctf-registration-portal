/**
 * Rounded-top image tile identified in the Figma audit (Page 4A teaser
 * gallery): a dark navy container with the top corners fully rounded,
 * an image fill, a dark gradient overlay for legibility, and a blurred
 * amber glow accent bar at the base.
 */
export default function PhotoCard({ src, alt, caption }) {
  return (
    <figure className="relative flex w-full max-w-xs flex-col overflow-hidden rounded-t-tile bg-navy-deep">
      <div className="relative aspect-[3/4] w-full">
        <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy via-navy/20 to-transparent"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-x-6 bottom-4 h-3 rounded-full bg-gold/60 blur-xl"
          aria-hidden="true"
        />
      </div>
      {caption ? (
        <figcaption className="px-4 py-3 text-center font-support text-sm text-cream-soft">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  )
}