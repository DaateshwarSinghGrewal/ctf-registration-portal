import { useCallback, useState } from 'react'
import PhotoCard from '../../../components/ui/PhotoCard.jsx'
import Button from '../../../components/ui/Button.jsx'
import { useAuth } from '../../../context/AuthContext.jsx'

const galleryPhotos = [
  {
    src: '/assets/images/register-teaser-1.jpg',
    alt: 'Competitors collaborating around a shared laptop during a past Somnium round'
  },
  {
    src: '/assets/images/register-teaser-2.jpg',
    alt: 'A team celebrating after capturing a flag'
  },
  {
    src: '/assets/images/register-teaser-3.jpg',
    alt: 'The venue lit for the overnight competition'
  }
]

/**
 * Page 4A — Registration teaser. Hosts the file's primary conversion
 * point: the "Register Now" heading and the "sign in with Google" prompt,
 * both of which route to the standalone Google Auth screen per the
 * routing analysis. The "Order Now" link is treated as a separate,
 * external merchandise/ticket action rather than part of the
 * registration flow, since its label doesn't match the surrounding
 * registration copy.
 */
export default function RegisterTeaser() {
  const { signInWithGoogle } = useAuth()
  const [signInError, setSignInError] = useState(null)

  const handleGoogleSignIn = useCallback(() => {
    setSignInError(null)
    try {
      signInWithGoogle()
    } catch (error) {
      setSignInError(error.message)
    }
  }, [signInWithGoogle])

  return (
    <section className="section-shell relative px-6 py-24 sm:py-32">
      <div className="absolute inset-0 bg-crystal-gradient opacity-[0.03]" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center gap-12 text-center">
        <div className="flex flex-col items-center gap-6 surface-card p-12 w-full max-w-2xl border-t-2 border-t-amethyst-bright">
          <h2 className="font-heading text-5xl text-white sm:text-6xl uppercase font-bold tracking-wide">Register Now</h2>
          <p className="font-body text-lg text-neutral-body">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="border-b border-amethyst/60 text-amethyst transition-colors duration-200 hover:text-white hover:border-white pb-1"
            >
              Click here to sign in with Google
            </button>
          </p>
          {signInError ? (
            <p role="alert" className="font-body text-sm text-red-400 mt-2">
              {signInError}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}