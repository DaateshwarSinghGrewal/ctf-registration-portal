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
    <section className="section-shell px-6 py-24 sm:py-32">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <h2 className="font-heading text-5xl text-cream sm:text-6xl">Register Now</h2>
          <p className="font-support text-lg text-cream-soft">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="border-b border-gold/60 text-gold transition-colors duration-200 hover:text-cream hover:border-cream"
            >
              Click here to sign in with Google
            </button>
          </p>
          {signInError ? (
            <p role="alert" className="font-support text-sm text-accent-pink">
              {signInError}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {galleryPhotos.map((photo) => (
            <PhotoCard key={photo.src} src={photo.src} alt={photo.alt} />
          ))}
        </div>

        <Button variant="text-link" href="https://somnium.ccs.example/merch">
          Order Now
        </Button>
      </div>
    </section>
  )
}