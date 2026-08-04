import SectionHeading from '../../../components/ui/SectionHeading.jsx'
import Button from '../../../components/ui/Button.jsx'
import { socialLinks } from '../../../constants/navLinks.js'

/**
 * Page 5 — Contact Us. Final section of the Website scroll: heading,
 * outbound social links, an FAQ pointer, and the copyright line.
 * Anchored by the nav bar's "Info" link.
 */
export default function ContactUs() {
  return (
    <section className="section-shell px-6 py-24 sm:py-32" id="contact">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-12 text-center">
        <SectionHeading eyebrow="We'd Love to Hear From You" title="Get in" accentWord="Touch" align="center" />

        <div className="flex flex-col items-center gap-4">
          <p className="font-support text-xs uppercase tracking-eyebrow text-cream-soft">Social Links</p>
          <nav className="flex flex-wrap items-center justify-center gap-8" aria-label="Social media">
            {socialLinks.map((link) => (
              <Button key={link.label} variant="text-link" href={link.href}>
                {link.label}
              </Button>
            ))}
          </nav>
        </div>

        <p className="font-support text-sm text-cream-soft">
          Have a question that isn&rsquo;t answered here? Read the{' '}
          <a href="/faq" className="border-b border-gold/60 text-gold hover:text-cream hover:border-cream">
            FAQ
          </a>
          .
        </p>

        <p className="font-support text-xs text-neutral-body">
          &copy; {new Date().getFullYear()} Somnium, presented by CCS. All rights reserved.
        </p>
      </div>
    </section>
  )
}