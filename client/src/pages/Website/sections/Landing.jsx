import CountdownTimer from '../../../components/sections/CountdownTimer.jsx'
import StarfieldBackground from '../../../components/layout/StarfieldBackground.jsx'
import Button from '../../../components/ui/Button.jsx'

/**
 * Page 1A — Landing hero. Features the cosmic crystal vortex background
 * and the custom gothic logotype.
 */
export default function Landing() {
  return (
    <section className="relative w-full flex-col bg-void">
      
      {/* Background Wrapper - Extends through the whole section, scrolls naturally */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div 
          className="absolute inset-0 bg-cover bg-no-repeat opacity-60"
          style={{ 
            backgroundImage: 'url("/src/assets/bg.webp")',
            backgroundPosition: 'center 75%' // Higher percentage shifts the background UP, aligning the vortex with Somnium
          }}
        />
        <div className="absolute inset-0 bg-surface-gradient mix-blend-multiply" />
        <StarfieldBackground density={40} glow={false} />
        
        {/* Smooth blend into the next section */}
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-void to-transparent" />
      </div>

      {/* HERO WRAPPER - Fits the main screen perfectly */}
      <div className="relative z-10 flex min-h-[90vh] w-full flex-col items-center justify-center overflow-hidden px-3 pt-16">

        {/* Hero Content (Cohesively grouped with ultra-tight spacing) */}
        <div className="relative z-10 flex flex-col items-center w-full max-w-4xl text-center">
          
          {/* Sponsor Logos (Reduced Size) */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-6">
              <img src="/src/assets/ccsLogo.PNG" alt="CCS Logo" className="h-15 md:h-20 w-auto opacity-90" />
              <span className="font-heading text-lg font-semibold text-white/30">×</span>
              <img src="/src/assets/froshLogo.PNG" alt="Frosh Logo" className="h-16 md:h-30 w-auto opacity-90" />
            </div>
            <p className="font-heading text-xs md:text-lg font-semibold uppercase tracking-widest text-crystal-light">
              PRESENTS
            </p>
          </div>

          {/* Somnium Logo - Increased negative margins pull the top and bottom text extremely tight against the enlarged image */}
          <h1 className="relative flex justify-center w-full -mt-20 -mb-16 md:-mt-40 md:-mb-32 pointer-events-none select-none">
            <span className="sr-only">Somnium</span>
            <img 
              src="/src/assets/somniumText.PNG" 
              alt="Somnium Logo" 
              className="w-full max-w-[700px] md:max-w-[900px] filter drop-shadow-[0_0_30px_rgba(168,85,247,0.3)]" 
            />
          </h1>

          {/* Subtitle */}
          <p className="font-heading text-lg font-medium tracking-[0.2em] text-white/80 sm:text-xl mb-12">
            DREAM. DECODE. ESCAPE.
          </p>

          {/* Minimalist CTA */}
          <Button 
            variant="text-link" 
            to="/auth" 
            className="text-sm md:text-base tracking-[0.2em] hover:scale-105 transition-transform duration-300"
          >
            REGISTER NOW
          </Button>
        </div>

      </div>

      {/* COUNTDOWN WRAPPER - Pushed below the fold, visible on scroll */}
      <div className="relative z-10 flex w-full justify-center px-6 py-28 pb-24">
        <CountdownTimer />
      </div>

    </section>
  )
}