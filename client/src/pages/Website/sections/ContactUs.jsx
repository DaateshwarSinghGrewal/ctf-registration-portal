import { socialLinks } from '../../../constants/navLinks.js'

/**
 * Page 5 — Contact Us / Footer.
 * Designed distinctly from other sections to visually anchor the bottom of the page.
 */
export default function ContactUs() {
  return (
    <footer className="relative overflow-hidden bg-void pt-32 pb-12 border-t border-white/5" id="contact">
      {/* Glow effect at the top center of the footer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-amethyst/40 to-transparent" />
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-[500px] h-[150px] bg-amethyst/5 blur-[80px] rounded-full pointer-events-none" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 flex flex-col md:flex-row justify-between items-center gap-12">
        
        {/* Left side: Branding */}
        <div className="flex flex-col items-center md:items-start gap-4">
          <h2 className="font-heading text-4xl sm:text-5xl font-bold uppercase tracking-widest text-white">
            Somnium
          </h2>
          <p className="font-body text-neutral-400 text-sm max-w-xs text-center md:text-left">
            Venture into the vortex. The ultimate Capture the Flag experience presented by CCS.
          </p>
        </div>

        {/* Right side: Socials & Links */}
        <div className="flex flex-col items-center md:items-end gap-6">
          <nav className="flex flex-wrap justify-center gap-6" aria-label="Social media">
            {socialLinks.map((link) => (
              <a 
                key={link.label} 
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="font-heading text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-colors duration-300"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex gap-6">
             <a href="/faq" className="font-body text-sm text-amethyst hover:text-fuchsia-400 transition-colors">
               Read the FAQ
             </a>
             <a href="mailto:contact@somnium.com" className="font-body text-sm text-amethyst hover:text-fuchsia-400 transition-colors">
               Contact Support
             </a>
          </div>
        </div>
      </div>

      {/* Massive Text Background */}
      <div className="mt-20 w-full flex justify-center overflow-hidden opacity-5 pointer-events-none select-none">
         <h1 className="font-heading text-[18vw] leading-none font-black tracking-tighter text-white">
            SOMNIUM
         </h1>
      </div>

      {/* Copyright */}
      <div className="relative z-10 mt-12 pt-8 border-t border-white/10 flex flex-col items-center justify-center gap-2">
        <p className="font-body text-xs text-neutral-500">
          &copy; {new Date().getFullYear()} Somnium by CCS. All rights reserved.
        </p>
      </div>
    </footer>
  )
}