import SectionHeading from '../../../components/ui/SectionHeading.jsx'
import Button from '../../../components/ui/Button.jsx'
import StarfieldBackground from '../../../components/layout/StarfieldBackground.jsx'

/**
 * Page 3B — Demo Video. A video placeholder area paired with an
 * outbound "Video Link" action. The video itself is hosted externally
 * (e.g. YouTube/Vimeo), so this links out rather than routing internally.
 */
export default function DemoVideo() {
  return (
    <section className="section-shell relative px-6 pt-24 pb-12 sm:pt-32 sm:pb-16" id="demo">
      <StarfieldBackground density={50} glow={false} />

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center gap-10 text-center">
        <SectionHeading eyebrow="See It in Motion" title="Demo" accentWord="Video" align="center" />

        <div className="aspect-video w-full max-w-5xl overflow-hidden surface-card border-none bg-void-soft relative group">
          <div className="absolute inset-0 border border-white/10 group-hover:border-amethyst/50 transition-colors duration-300 pointer-events-none z-10" />
          <iframe
            className="absolute inset-0 h-full w-full"
            src="https://www.youtube.com/embed/HluQIBP7cwY"
            title="Demo Video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          ></iframe>
        </div>

        <Button variant="text-link" href="https://youtu.be/HluQIBP7cwY?si=a8j5_yGzRy0jWcYR" target="_blank" rel="noopener noreferrer">
          Watch on YouTube
        </Button>
      </div>
    </section>
  )
}