import { useState, useEffect } from 'react'
import { updateRegistration, getRegistrationStatus } from '../../api/admin.js'
import Button from '../../components/ui/Button.jsx'

export default function AdminDashboardPage() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function fetchStatus() {
      try {
        const status = await getRegistrationStatus()
        if (status) {
          setIsOpen(status.registrationOpen)
        }
      } catch (err) {
        console.error('Failed to fetch registration status:', err)
      }
    }
    fetchStatus()
  }, [])

  const handleToggle = async () => {
    setIsSubmitting(true)
    try {
      const newState = !isOpen
      await updateRegistration(newState)
      setIsOpen(newState)
      setMessage(`Registration is now ${newState ? 'OPEN' : 'CLOSED'}`)
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-heading tracking-widest uppercase text-white mb-2">Operations Center</h2>
        <p className="text-sm font-body text-neutral-400">Manage global event configurations.</p>
      </div>

      <div className="surface-card p-6 bg-black/40 border border-white/10 rounded-xl">
        <h3 className="text-lg font-heading tracking-widest text-white mb-4">Registration Status</h3>
        <div className="flex items-center justify-between p-4 bg-black/50 rounded-lg border border-white/5">
          <div>
            <p className="font-heading tracking-widest uppercase text-sm text-white">Event Registration</p>
            <p className="text-xs text-neutral-400 mt-1">
              {isOpen ? 'Users can currently register and form teams.' : 'Registration is locked. No new users can sign up.'}
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={isSubmitting}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
              isOpen ? 'bg-amethyst' : 'bg-neutral-600'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isOpen ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        {message && (
          <p className="text-xs font-heading tracking-widest uppercase mt-4 text-amethyst-light">{message}</p>
        )}
      </div>
    </div>
  )
}
