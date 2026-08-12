import { useEffect, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import CountdownTimer from '../../../components/sections/CountdownTimer.jsx'
import StarfieldBackground from '../../../components/layout/StarfieldBackground.jsx'
import Button from '../../../components/ui/Button.jsx'
import ccsLogo from '../../../assets/ccsLogo.PNG'
import froshLogo from '../../../assets/froshLogo.PNG'
import somniumText from '../../../assets/somniumText.PNG'
import bgImage from '../../../assets/bg.webp'

/**
 * Page 1A — Landing hero. Features the cosmic crystal vortex background
 * and the custom gothic logotype.
 */
export default function Landing() {
  const containerRef = useRef(null)
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 1000], [0, 300])

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 1, ease: [0.16, 1, 0.3, 1] }
    }
  }

  return (
    <section 
      ref={containerRef}
      className="relative w-full flex-col bg-void"
    >

      {/* Global Starfield - Covers the entire section including countdown timer */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <StarfieldBackground density={50} glow={false} />
      </div>

      {/* HERO WRAPPER - Fits the main screen perfectly */}
      <div className="relative z-10 flex min-h-[90vh] w-full flex-col items-center justify-center overflow-hidden px-3 pt-16">
        
        {/* Background Wrapper - Scoped strictly to the 90vh hero so positioning math doesn't break on laptops */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <motion.div 
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 0.6, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute inset-0 bg-cover bg-no-repeat"
            style={{ 
              backgroundImage: `url(${bgImage})`,
              backgroundPosition: 'center 60%' // Lower percentage shifts it down, higher percentage shifts it up
            }}
          />
          <div className="absolute inset-0 bg-surface-gradient mix-blend-multiply" />
          
          {/* Smooth blend into the next section */}
          <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-void to-transparent" />
        </div>

        {/* Hero Content (Cohesively grouped with ultra-tight spacing) */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="relative z-10 flex flex-col items-center w-full max-w-4xl text-center"
        >
          
          {/* Sponsor Logos */}
          <motion.div variants={itemVariants} className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-4 sm:gap-6">
              <img src={ccsLogo} alt="CCS Logo" className="h-14 sm:h-16 md:h-20 w-auto object-contain opacity-90" />
              <span className="font-heading text-base sm:text-lg font-semibold text-white/30">×</span>
              <img src={froshLogo} alt="Frosh Logo" className="h-20 sm:h-24 md:h-32 w-auto object-contain opacity-90" />
            </div>
            <p className="font-heading text-[10px] sm:text-xs md:text-base font-semibold uppercase tracking-widest text-crystal-light -mt-1 sm:-mt-2 md:-mt-4">
              PRESENTS
            </p>
          </motion.div>

          {/* Somnium Logo */}
          <motion.h1 variants={itemVariants} className="relative flex justify-center w-full mt-10 mb-14 sm:-mt-8 sm:-mb-8 md:-mt-16 md:-mb-16 pointer-events-none select-none">
            <span className="sr-only">Somnium</span>
            <img 
              src={somniumText} 
              alt="Somnium Logo" 
              className="w-full max-w-[700px] md:max-w-[900px] filter drop-shadow-[0_0_30px_rgba(168,85,247,0.3)]" 
            />
          </motion.h1>

          {/* Subtitle */}
          <motion.p variants={itemVariants} className="font-heading text-lg font-medium tracking-[0.2em] text-white/80 sm:text-xl mb-4">
            DREAM. DECODE. ESCAPE.
          </motion.p>

          {/* Date */}
          <motion.p variants={itemVariants} className="font-heading text-xl font-bold tracking-[0.3em] text-amethyst-bright sm:text-2xl mb-4">
            16 AUGUST
          </motion.p>

          {/* Prizes */}
          <motion.p variants={itemVariants} className="font-heading text-sm sm:text-base font-bold tracking-[0.4em] text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-amethyst uppercase drop-shadow-[0_0_15px_rgba(232,121,249,0.5)] mb-12 mt-2">
            ✦ PRIZES WORTH ₹3K+ ✦
          </motion.p>

          {/* Minimalist CTA */}
          <motion.div variants={itemVariants}>
            <Button 
              variant="text-link" 
              to="/auth" 
              className="text-sm md:text-base tracking-[0.2em] hover:scale-105 transition-transform duration-300"
            >
              REGISTER NOW
            </Button>
          </motion.div>
        </motion.div>

      </div>

      {/* COUNTDOWN WRAPPER - Pushed below the fold, visible on scroll */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex w-full justify-center px-6 py-28 pb-24"
      >
        <CountdownTimer />
      </motion.div>

    </section>
  )
}