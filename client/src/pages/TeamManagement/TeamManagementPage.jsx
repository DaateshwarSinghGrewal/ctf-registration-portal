import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Plus, LogIn, LogOut, Trash2, X, Crown, User as UserIcon } from 'lucide-react'
import Button from '../../components/ui/Button.jsx'
import NoiseDarkPurpleGradientWithSquares from '../../components/ui/noise-dark-blue-gradient-with-squares.jsx'
import { GradientHeading } from '../../components/ui/gradient-heading.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useTeam } from '../../hooks/useTeam.js'
import { getProfile } from '../../api/profile.js'

/**
 * Team Management — the post-sign-in command centre.
 *
 * Every value on this screen comes from the API. The team, its invite code and
 * its roster are read from GET /party/me and kept current by socket events, so
 * two people in the same team see the same thing and a change by one appears for
 * the other without a reload.
 */

const EMPTY_PLAYER_DETAILS = {
  fullName: '',
  phone: '',
  discordUsername: '',
  year: '',
  branch: '',
  rollNumber: ''
}

export default function TeamManagementPage() {
  const { user, signOut } = useAuth()
  const { team, isLoading, loadError, onlineUserIds, isLeader, leave, disband, kick, create, join } =
    useTeam()

  // -- UI State --
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // -- Form State --
  const [teamNameInput, setTeamNameInput] = useState('')
  const [teamCodeInput, setTeamCodeInput] = useState('')
  const [playerDetails, setPlayerDetails] = useState(EMPTY_PLAYER_DETAILS)
  const [formError, setFormError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [busyMemberId, setBusyMemberId] = useState(null)

  /**
   * Pre-fills the profile form for a returning user.
   *
   * Without this, someone who already registered has to retype all six fields to
   * join a second team, and a typo would collide with their own roll number.
   */
  useEffect(() => {
    const controller = new AbortController()

    getProfile({ signal: controller.signal })
      .then((profile) => {
        if (!profile) return
        setPlayerDetails({
          fullName: profile.fullName,
          phone: profile.phone,
          discordUsername: profile.discordUsername,
          year: String(profile.year),
          branch: profile.branch,
          rollNumber: profile.rollNumber
        })
      })
      .catch(() => {
        // No profile yet, or the read failed — the form stays empty and the user
        // fills it in. Not worth surfacing as an error.
      })

    return () => controller.abort()
  }, [])

  const handlePlayerDetailChange = (e) => {
    const { name, value } = e.target
    setPlayerDetails((prev) => ({ ...prev, [name]: value }))
  }

  const showToast = useCallback((msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }, [])

  const closeModals = useCallback(() => {
    setIsCreateModalOpen(false)
    setIsJoinModalOpen(false)
    setFormError(null)
  }, [])

  const renderPlayerFields = () => (
    <div className="flex flex-col gap-4 border-t border-white/10 pt-4 mt-2">
      <p className="text-xs font-heading tracking-widest text-neutral-400 uppercase">Player Details</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-heading tracking-widest uppercase text-amethyst-light">Full Name</label>
          <input type="text" name="fullName" required value={playerDetails.fullName} onChange={handlePlayerDetailChange} placeholder="e.g. Rishank Sharma" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-amethyst transition-all" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-heading tracking-widest uppercase text-amethyst-light">Phone Number</label>
          <input type="tel" name="phone" required value={playerDetails.phone} onChange={handlePlayerDetailChange} placeholder="e.g. +91 98765 43210" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-amethyst transition-all" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-heading tracking-widest uppercase text-amethyst-light">Discord Username</label>
          <input type="text" name="discordUsername" required value={playerDetails.discordUsername} onChange={handlePlayerDetailChange} placeholder="e.g. jonsnow" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-amethyst transition-all" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-heading tracking-widest uppercase text-amethyst-light">Year</label>
          <select name="year" required value={playerDetails.year} onChange={handlePlayerDetailChange} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amethyst transition-all appearance-none">
            <option value="" disabled className="bg-void text-neutral-500">Select...</option>
            <option value="1" className="bg-void">1st Year</option>
            <option value="2" className="bg-void">2nd Year</option>
            <option value="3" className="bg-void">3rd Year</option>
            <option value="4" className="bg-void">4th Year</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-heading tracking-widest uppercase text-amethyst-light">Branch</label>
          <input type="text" name="branch" required value={playerDetails.branch} onChange={handlePlayerDetailChange} placeholder="e.g. COPC" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-amethyst transition-all" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-heading tracking-widest uppercase text-amethyst-light">Roll No.</label>
          <input type="text" name="rollNumber" required value={playerDetails.rollNumber} onChange={handlePlayerDetailChange} placeholder="e.g. 1025170..." className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-amethyst transition-all" />
        </div>
      </div>

      {formError ? (
        <p role="alert" className="font-body text-sm text-red-400">
          {formError}
        </p>
      ) : null}
    </div>
  )

  // --- Handlers ---
  const handleCreateTeam = async (e) => {
    e.preventDefault()
    if (isSubmitting) return

    const name = teamNameInput.trim()
    if (name.length < 3) {
      setFormError('Squad name must be at least 3 characters.')
      return
    }

    setFormError(null)
    setIsSubmitting(true)
    try {
      await create({ name, playerDetails })
      closeModals()
      setTeamNameInput('')
      showToast('Team created successfully!')
    } catch (error) {
      // Server-side message: the API distinguishes a name clash from an invalid
      // roll number from a closed registration, and each is actionable.
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleJoinTeam = async (e) => {
    e.preventDefault()
    if (isSubmitting) return

    const inviteCode = teamCodeInput.trim().toUpperCase()
    if (inviteCode.length === 0) {
      setFormError('Enter the team code.')
      return
    }

    setFormError(null)
    setIsSubmitting(true)
    try {
      await join({ inviteCode, playerDetails })
      closeModals()
      setTeamCodeInput('')
      showToast('Joined team successfully!')
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyCode = async () => {
    if (!team) return
    try {
      await navigator.clipboard.writeText(team.id)
      showToast('Team code copied!')
    } catch {
      // Clipboard access is denied outside a secure context; the code is
      // on screen to copy by hand.
      showToast('Could not copy — select the code manually.')
    }
  }

  const handleLeaveTeam = async () => {
    setIsSubmitting(true)
    try {
      await leave()
      showToast('You left the team.')
    } catch (error) {
      showToast(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteTeam = async () => {
    setIsSubmitting(true)
    try {
      await disband()
      showToast('Team disbanded.')
    } catch (error) {
      showToast(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveMember = async (userId) => {
    setBusyMemberId(userId)
    try {
      await kick(userId)
      showToast('Member removed.')
    } catch (error) {
      showToast(error.message)
    } finally {
      setBusyMemberId(null)
    }
  }

  return (
    <main className="section-shell relative flex min-h-[calc(100vh-74px)] flex-col items-center justify-center px-6 py-12 bg-void">
      <NoiseDarkPurpleGradientWithSquares />

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-amethyst/20 border border-amethyst/50 text-white px-6 py-3 rounded-full backdrop-blur-md shadow-[0_0_15px_rgba(168,85,247,0.4)]"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col gap-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-white/10 pb-8">
          <div>
            <p className="eyebrow text-center md:text-left text-crystal-light">Command Center</p>
            <GradientHeading variant="light" size="sm" className="mt-2 text-center md:text-left uppercase tracking-widest">
              Team Management
            </GradientHeading>
          </div>
          <Button variant="text-link" onClick={signOut} showArrow={false}>
            Sign Out
          </Button>
        </div>

        {/* --- Loading the team from the API --- */}
        {isLoading && (
          <div className="flex flex-col items-center gap-4 mt-8">
            <div className="w-24 h-px bg-gradient-to-r from-transparent via-amethyst/60 to-transparent animate-pulse" />
            <p className="font-heading text-xs uppercase tracking-[0.3em] text-crystal-light">
              Loading your squad
            </p>
          </div>
        )}

        {!isLoading && loadError && (
          <div className="surface-card p-6 text-center border-red-500/30 bg-red-950/20">
            <p role="alert" className="font-body text-sm text-red-400">{loadError}</p>
          </div>
        )}

        {/* --- STATE 1: No Team --- */}
        {!isLoading && !loadError && !team && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-10 mt-8"
          >
            <div className="text-center max-w-lg">
              <h2 className="text-2xl font-heading text-white tracking-widest mb-4">You are not in a team.</h2>
              <p className="text-neutral-400 font-body">Create a new squad as Captain, or join an existing alliance using a secret invite code.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
              {/* Create Team Card */}
              <div
                onClick={() => setIsCreateModalOpen(true)}
                className="surface-card flex flex-col items-center justify-center p-10 cursor-pointer group hover:border-amethyst/60 transition-all duration-300"
              >
                <div className="w-16 h-16 rounded-full bg-amethyst/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 group-hover:bg-amethyst/20 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                  <Plus className="w-8 h-8 text-amethyst-bright" />
                </div>
                <h3 className="font-heading text-xl text-white tracking-wider mb-2">Create a Team</h3>
                <p className="text-xs text-neutral-500 font-body text-center">Become the captain and invite others to join your ranks.</p>
              </div>

              {/* Join Team Card */}
              <div
                onClick={() => setIsJoinModalOpen(true)}
                className="surface-card flex flex-col items-center justify-center p-10 cursor-pointer group hover:border-amethyst/60 transition-all duration-300"
              >
                <div className="w-16 h-16 rounded-full bg-amethyst/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 group-hover:bg-amethyst/20 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                  <LogIn className="w-8 h-8 text-amethyst-bright" />
                </div>
                <h3 className="font-heading text-xl text-white tracking-wider mb-2">Join a Team</h3>
                <p className="text-xs text-neutral-500 font-body text-center">Enter a secret code to unite with an existing squad.</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* --- STATE 2: In a Team --- */}
        {!isLoading && team && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-10"
          >
            {/* Team Banner */}
            <div className="surface-card p-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-void via-amethyst/5 to-void border-amethyst/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amethyst/10 blur-[80px] pointer-events-none" />

              <div className="flex flex-col items-center md:items-start z-10">
                <p className="text-xs font-heading tracking-[0.2em] text-amethyst mb-2">YOUR SQUAD</p>
                <h2 className="text-3xl md:text-5xl font-heading font-bold text-white tracking-widest uppercase text-center md:text-left drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                  {team.name}
                </h2>
              </div>

              <div className="flex flex-col items-center bg-black/40 border border-white/10 rounded-xl p-4 backdrop-blur-sm z-10">
                <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">Team Code</p>
                <div className="flex items-center gap-3">
                  <span className="font-brand text-2xl text-amethyst-bright tracking-wider">{team.id}</span>
                  <button
                    onClick={handleCopyCode}
                    className="p-2 hover:bg-white/10 rounded-md transition-colors group"
                    title="Copy Code"
                  >
                    <Copy className="w-5 h-5 text-neutral-400 group-hover:text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Roster & Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Members List */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h3 className="font-heading text-lg tracking-widest text-white">Operatives ({team.members.length}/{team.maxPlayers})</h3>
                </div>

                <div className="flex flex-col gap-3">
                  {team.members.map((member) => (
                    <div key={member.userId} className="surface-card p-4 flex items-center justify-between bg-black/20 hover:bg-white/5 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-amethyst/20 border border-amethyst/40 flex items-center justify-center relative">
                          {member.isLeader ? (
                            <Crown className="w-5 h-5 text-fuchsia-400" />
                          ) : (
                            <UserIcon className="w-5 h-5 text-amethyst-light" />
                          )}
                          {/* Live presence, driven by presence:update */}
                          {onlineUserIds.includes(member.userId) ? (
                            <span
                              title="Online"
                              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-void"
                            />
                          ) : null}
                        </div>
                        <div>
                          <p className="font-heading text-white tracking-wider">
                            {member.username}
                            {member.userId === user?.userId ? (
                              <span className="ml-2 text-[10px] font-body uppercase tracking-widest text-neutral-500">You</span>
                            ) : null}
                          </p>
                          <p className="text-xs font-body text-neutral-500 uppercase">
                            {member.isLeader ? 'Captain' : 'Member'}
                          </p>
                        </div>
                      </div>

                      {/* Captain Controls to remove others */}
                      {isLeader && member.userId !== user?.userId && (
                        <button
                          onClick={() => handleRemoveMember(member.userId)}
                          disabled={busyMemberId === member.userId}
                          className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-md transition-all disabled:opacity-40"
                          title="Kick Operative"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Panel */}
              <div className="surface-card p-6 flex flex-col gap-6 h-fit bg-black/40">
                <h3 className="font-heading text-lg tracking-widest text-white border-b border-white/10 pb-4">Actions</h3>

                {isLeader ? (
                  <div className="flex flex-col gap-4">
                    <p className="text-xs font-body text-neutral-400">As the Captain, you command this squad. Disbanding will remove all operatives.</p>
                    <button
                      onClick={handleDeleteTeam}
                      disabled={isSubmitting}
                      className="w-full py-3 flex items-center justify-center gap-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-heading tracking-widest uppercase text-sm disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" /> Disband Team
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <p className="text-xs font-body text-neutral-400">You are an operative. Leaving will forfeit your spot in this squad.</p>
                    <button
                      onClick={handleLeaveTeam}
                      disabled={isSubmitting}
                      className="w-full py-3 flex items-center justify-center gap-2 border border-orange-500/50 text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors font-heading tracking-widest uppercase text-sm disabled:opacity-50"
                    >
                      <LogOut className="w-4 h-4" /> Leave Team
                    </button>
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </div>

      {/* --- MODALS --- */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="surface-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-8 relative bg-void border border-white/10 shadow-2xl"
            >
              <button onClick={closeModals} className="absolute top-4 right-4 text-neutral-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-2xl font-heading text-white tracking-widest mb-2 uppercase">Create Squad</h2>
              <p className="text-sm font-body text-neutral-400 mb-8">Forge a new team and become the Captain.</p>

              <form onSubmit={handleCreateTeam} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-heading tracking-widest uppercase text-amethyst-light">Squad Name</label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={100}
                    value={teamNameInput}
                    onChange={(e) => setTeamNameInput(e.target.value)}
                    placeholder="Enter squad name..."
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-neutral-600 focus:outline-none focus:border-amethyst focus:ring-1 focus:ring-amethyst transition-all"
                  />
                </div>
                {renderPlayerFields()}
                <Button variant="pill" type="submit" disabled={isSubmitting} className="w-full justify-center disabled:opacity-60">
                  {isSubmitting ? 'Initializing…' : 'Initialize Squad'}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {isJoinModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="surface-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-8 relative bg-void border border-white/10 shadow-2xl"
            >
              <button onClick={closeModals} className="absolute top-4 right-4 text-neutral-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-2xl font-heading text-white tracking-widest mb-2 uppercase">Join Squad</h2>
              <p className="text-sm font-body text-neutral-400 mb-8">Enter a valid 6-character code to infiltrate a team.</p>

              <form onSubmit={handleJoinTeam} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-heading tracking-widest uppercase text-amethyst-light">Secret Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={teamCodeInput}
                    onChange={(e) => setTeamCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. A1B2C3"
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-neutral-600 font-brand tracking-widest uppercase focus:outline-none focus:border-amethyst focus:ring-1 focus:ring-amethyst transition-all"
                  />
                </div>
                {renderPlayerFields()}
                <Button variant="pill" type="submit" disabled={isSubmitting} className="w-full justify-center disabled:opacity-60">
                  {isSubmitting ? 'Infiltrating…' : 'Infiltrate Squad'}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  )
}
