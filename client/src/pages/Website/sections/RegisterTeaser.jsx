import { Link } from 'react-router-dom'
import PhotoCard from '../../../components/ui/PhotoCard.jsx'
import StarfieldBackground from '../../../components/layout/StarfieldBackground.jsx'

/**
 * Page 4A — Registration teaser. Hosts the file's primary conversion
 * point: the "Register Now" heading and the "sign in with Google" prompt,
 * both of which route to the standalone Google Auth screen.
 */
export default function RegisterTeaser() {
  return (
    <section className="section-shell relative px-6 py-24 sm:py-32">
      <StarfieldBackground density={50} glow={false} />
      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center gap-8 text-center mt-8">
        <h2 className="font-heading text-6xl sm:text-7xl uppercase font-bold tracking-widest drop-shadow-[0_0_20px_rgba(168,85,247,0.3)]">
          <span className="text-white">Register</span>{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amethyst to-fuchsia-400">Now</span>
        </h2>

        <p className="font-body text-lg sm:text-xl text-neutral-body max-w-lg mx-auto leading-relaxed -mt-2">
          Connect your Google account and create your team to secure your spot in the competition.
        </p>

        <Link
          to="/auth"
          className="mt-4 group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full bg-void border border-amethyst/30 px-10 py-4 text-sm font-bold tracking-widest text-white uppercase transition-all duration-300 hover:border-amethyst hover:scale-105"
        >
          <span className="relative z-10 flex items-center gap-3">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign in with Google
          </span>
        </Link>
      </div>
    </section>
  )
}