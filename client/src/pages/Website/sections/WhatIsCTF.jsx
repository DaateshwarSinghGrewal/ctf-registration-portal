import SectionHeading from '../../../components/ui/SectionHeading.jsx'

/**
 * Page 2A — explains the capture-the-flag format for visitors unfamiliar
 * with the genre. First of the two sections anchored by the nav bar's
 * "About" link.
 */
export default function WhatIsCTF() {
  return (
    <section className="section-shell px-6 py-24 sm:py-32">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <SectionHeading
          eyebrow="— Watch and Learn"
          title="What is a"
          accentWord="CTF"
          description="A Capture the Flag competition is a hands-on cybersecurity challenge where teams solve puzzles across categories like cryptography, web exploitation, reverse engineering, and forensics. Each solved challenge yields a hidden flag — a short string of text that proves the challenge was completed — and the team with the most flags, solved fastest, wins."
        />
      </div>
    </section>
  )
}