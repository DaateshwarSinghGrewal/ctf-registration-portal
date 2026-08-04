import Landing from './sections/Landing.jsx'
import DemoVideo from './sections/DemoVideo.jsx'
import AboutGame from './sections/AboutGame.jsx'
import RegisterTeaser from './sections/RegisterTeaser.jsx'
import Sponsors from './sections/Sponsors.jsx'
import ContactUs from './sections/ContactUs.jsx'

/**
 * Composes the Website's single long scrollable page.
 * Sections are rendered in their natural top-to-bottom scroll order.
 */
export default function WebsitePage() {
  return (
    <main>
      <Landing />
      <DemoVideo />
      <AboutGame />
      <RegisterTeaser />
      <Sponsors />
      <ContactUs />
    </main>
  )
}