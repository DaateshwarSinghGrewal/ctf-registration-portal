import SectionHeading from '../../../components/ui/SectionHeading.jsx'
import Button from '../../../components/ui/Button.jsx'

/**
 * Page 3B — Demo Video. A video placeholder area paired with an
 * outbound "Video Link" action. The video itself is hosted externally
 * (e.g. YouTube/Vimeo), so this links out rather than routing internally.
 */
export default function DemoVideo() {
  return (
    <section className="section-shell px-6 py-24 sm:py-32">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-10 text-center">
        <SectionHeading eyebrow="See It in Motion" title="Demo" accentWord="Video" align="center" />

        <div className="aspect-video w-full max-w-2xl overflow-hidden rounded-lg border border-cream/10 bg-navy-deep">
          <video
            className="h-full w-full object-cover"
            controls
            preload="none"
            poster="/assets/images/demo-video-poster.jpg"
          >
            <source src="/assets/videos/somnium-demo.mp4" type="video/mp4" />
            Your browser does not support embedded video. Use the link below to watch instead.
          </video>
        </div>

        <Button variant="text-link" href="https://youtube.com/watch?v=somnium-demo">
          Video Link
        </Button>
      </div>
    </section>
  )
}