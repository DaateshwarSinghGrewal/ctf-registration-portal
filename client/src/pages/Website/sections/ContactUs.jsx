import SectionHeading from '../../../components/ui/SectionHeading.jsx'
import Button from '../../../components/ui/Button.jsx'
import { socialLinks } from '../../../constants/navLinks.js'

/**
 * Page 5 — Contact Us. Final section of the Website scroll.
 */
export default function ContactUs() {
  return (
    <section className="section-shell px-6 py-24 sm:py-32" id="contact">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-12 text-center">
        <SectionHeading eyebrow="We'd Love to Hear From You" title="Get in" accentWord="Touch" align="center" />

        <div className="flex flex-col items-center gap-4 surface-card p-10 w-full max-w-2xl">
          <p className="font-heading text-sm font-semibold uppercase tracking-widest text-crystal-light">Social Links</p>
          <nav className="flex flex-wrap items-center justify-center gap-8 mt-4" aria-label="Social media">
            {socialLinks.map((link) => (
              <Button key={link.label} variant="text-link" href={link.href}>
                {link.label}
              </Button>
            ))}
          </nav>
        </div>

        <p className="font-body text-sm font-medium text-neutral-body">
          Have a question that isn&rsquo;t answered here? Read the{' '}
          <a href="/faq" className="border-b border-amethyst/60 text-amethyst hover:text-white hover:border-white transition-colors duration-200">
            FAQ
          </a>
          .
        </p>

        <p className="font-body text-xs text-neutral-muted">
          &copy; {new Date().getFullYear()} Somnium, presented by CCS. All rights reserved.
        </p>
      </div>
    </section>
  )
}