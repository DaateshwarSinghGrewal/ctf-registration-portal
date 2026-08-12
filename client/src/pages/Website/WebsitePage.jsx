import Landing from './sections/Landing.jsx'
import DemoVideo from './sections/DemoVideo.jsx'
import AboutGame from './sections/AboutGame.jsx'
import RegisterTeaser from './sections/RegisterTeaser.jsx'
import FAQ from './sections/FAQ.jsx'
// import Sponsors from './sections/Sponsors.jsx'
import ContactUs from './sections/ContactUs.jsx'

/**
 * Composes the Website's single long scrollable page.
 * Sections are rendered in their natural top-to-bottom scroll order.
 */
const Separator = () => (
  <div className="w-full max-w-6xl mx-auto h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
)

export default function WebsitePage() {
  return (
    <main>
      <Landing />
      <Separator />
      <DemoVideo />
      <Separator />
      <AboutGame />
      <Separator />
      <RegisterTeaser />
      <Separator />
      <FAQ />
      <Separator />
      {/* <Sponsors /> */}
      <Separator />
      <ContactUs />
    </main>
  )
}