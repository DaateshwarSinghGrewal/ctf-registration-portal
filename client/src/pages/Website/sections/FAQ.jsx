import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import StarfieldBackground from '../../../components/layout/StarfieldBackground.jsx'

const faqs = [
  {
    q: "Do I need to know cybersecurity to participate?",
    a: "Not at all! This event is designed for beginners. We'll guide you on how to start and you'll learn as you play."
  },
  {
    q: "Can I change my team members after registering?",
    a: "Yes, you can edit your team roster anytime before the game officially starts. Once the timer begins, team lineups are locked."
  },
  {
    q: "Can I be part of more than one team?",
    a: "No, each participant may only register with and compete on a single team."
  },
  {
    q: "Is there any registration fee?",
    a: "No, participation is completely free."
  },
  {
    q: "What is the deadline to sign up?",
    a: "Registrations close on 16th Aug at 6 pm. Make sure your entire team completes registration before the deadline."
  },
  {
    q: "Is it compulsory to join the Discord server?",
    a: "Yes. Discord is our primary hub for live announcements, hint drops, schedule updates, and real-time support throughout the event."
  },
  {
    q: "Do I need to bring/install any specific software or equipment?",
    a: "No pre-installed software is required. You only need a laptop or PC with a modern web browser and a stable internet connection."
  },
  {
    q: "Is this an online event or on-campus/offline?",
    a: "It is 100% online, so you can participate from anywhere."
  },
  {
    q: "Whom do I reach out to if I get stuck while playing?",
    a: "Event moderators will be active 24/7 on our Discord server to help with platform glitches, rule clarifications, or ticket support."
  }
  
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null)

  return (
    <section id="faq" className="section-shell relative px-6 py-24 sm:py-32 bg-void">
      <StarfieldBackground density={50} glow={false} />
      <div className="relative z-10 mx-auto max-w-4xl flex flex-col gap-12">
        <div className="text-center">
          <h2 className="font-heading text-4xl sm:text-5xl uppercase font-bold tracking-widest text-white drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            Frequently Asked <span className="text-transparent bg-clip-text bg-gradient-to-r from-amethyst to-fuchsia-400">Questions</span>
          </h2>
        </div>

        <div className="flex flex-col gap-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index

            return (
              <div 
                key={index} 
                className={`overflow-hidden rounded-xl border transition-colors duration-300 ${isOpen ? 'bg-black/60 border-amethyst/60' : 'bg-black/40 border-white/10 hover:border-amethyst/30'}`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amethyst"
                >
                  <span className="font-heading text-lg sm:text-xl tracking-wider text-white">
                    {faq.q}
                  </span>
                  <span className={`ml-4 text-amethyst transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="px-6 pb-6 pt-0 font-body text-neutral-300 leading-relaxed text-base sm:text-lg">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
