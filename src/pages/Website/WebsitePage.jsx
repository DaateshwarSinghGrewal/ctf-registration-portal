import Landing from './sections/Landing.jsx'
import Footer from './sections/Footer.jsx'
import WhatIsCTF from './sections/WhatIsCTF.jsx'
import AboutGame from './sections/AboutGame.jsx'
import ThemeTimeline from './sections/ThemeTimeline.jsx'
import DemoVideo from './sections/DemoVideo.jsx'
import RegisterTeaser from './sections/RegisterTeaser.jsx'
import Sponsors from './sections/Sponsors.jsx'
import ContactUs from './sections/ContactUs.jsx'

/**
 * Composes the Website's single long scrollable page (Figma's "All
 * Pages" frame) in its original stacking order: 1A -> 1B -> 2A -> 2B ->
 * 3A -> 3B -> 4A -> 4B -> 5. This is rendered as one route ("/"); the
 * nav bar's About/Sponsors/Info links scroll within this same page
 * rather than navigating elsewhere.
 */
export default function WebsitePage() {
  return (
    <main>
      <Landing />
      <Footer />
      <WhatIsCTF />
      <AboutGame />
      <ThemeTimeline />
      <DemoVideo />
      <RegisterTeaser />
      <Sponsors />
      <ContactUs />
    </main>
  )
}