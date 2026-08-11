import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Plus, LogIn, LogOut, Trash2, X, Crown, User as UserIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import Button from '../../components/ui/Button.jsx'
import NoiseDarkPurpleGradientWithSquares from '../../components/ui/noise-dark-blue-gradient-with-squares.jsx'
import { GradientHeading } from '../../components/ui/gradient-heading.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useTeam } from '../../hooks/useTeam.js'
import { useSocketEvent } from '../../realtime/SocketProvider.jsx'
import { SOCKET_EVENTS } from '../../realtime/events.js'
import { getProfile } from '../../api/profile.js'
import { getPartyDetails, getPublicParties } from '../../api/party.js'
import { useJoinRequests } from '../../hooks/useJoinRequests.js'

/**
 * Team Management — the post-sign-in command centre.
 *
 * Every value on this screen comes from the API. The team, its invite code and
 * its roster are read from GET /party/me and kept current by socket events, so
 * two people in the same team see the same thing and a change by one appears for
 * the other without a reload.
 */

const TeamSkeleton = () => (
  <div className="surface-card p-4 flex flex-col md:flex-row items-center justify-between gap-4 bg-black/20 animate-pulse border border-white/5">
    <div className="flex flex-col items-center md:items-start w-full md:w-auto">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-5 w-32 bg-white/10 rounded"></div>
      </div>
      <div className="h-3 w-24 bg-white/5 rounded mt-1"></div>
    </div>
    <div className="h-10 w-full md:w-28 bg-white/10 rounded-md"></div>
  </div>
)

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
  const { team, isLoading, loadError, onlineUserIds, isLeader, leave, disband, kick, create, join, requestJoin, setVisibility, transferLeader } =
    useTeam()

  // -- UI State --
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [publicTeams, setPublicTeams] = useState([])
  const [isLoadingPublicTeams, setIsLoadingPublicTeams] = useState(false)
  const [publicTeamsPage, setPublicTeamsPage] = useState(0)
  const [totalPublicTeams, setTotalPublicTeams] = useState(0)

  // -- Form State --
  const [teamNameInput, setTeamNameInput] = useState('')
  const [teamCodeInput, setTeamCodeInput] = useState('')
  const [playerDetails, setPlayerDetails] = useState(EMPTY_PLAYER_DETAILS)
  const [formError, setFormError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [busyMemberId, setBusyMemberId] = useState(null)
  
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    description: '',
    actionName: '',
    isDestructive: true,
    onConfirm: null
  })
  const [processingRequest, setProcessingRequest] = useState(null)

  const handleRequestAction = async (requestId, action) => {
    setProcessingRequest({ id: requestId, action })
    try {
      if (action === 'accept') {
        await acceptRequest(requestId)
      } else {
        await rejectRequest(requestId)
      }
    } catch (err) {
      // Error is logged by the hook
    } finally {
      // Allow a brief delay for the socket event to remove it from the list before clearing loading state
      setTimeout(() => {
        setProcessingRequest(null)
      }, 500)
    }
  }

  const [joinModalStep, setJoinModalStep] = useState(1)
  const [joinTeamDetails, setJoinTeamDetails] = useState(null)

  const { requests: joinRequests, acceptRequest, rejectRequest, isLoading: isRequestsLoading } = useJoinRequests(team?.id, isLeader)

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

  useEffect(() => {
    if (isLoading || team) return
    
    const controller = new AbortController()
    setIsLoadingPublicTeams(true)
    const limit = 5
    getPublicParties({ limit, offset: publicTeamsPage * limit, signal: controller.signal })
      .then(({ teams, total }) => {
        setPublicTeams(prev => publicTeamsPage === 0 ? teams : [...prev, ...teams])
        setTotalPublicTeams(total)
      })
      .catch(() => {})
      .finally(() => setIsLoadingPublicTeams(false))
      
    return () => controller.abort()
  }, [isLoading, team, publicTeamsPage])

  const observer = useRef()
  const lastTeamElementRef = useCallback(node => {
    if (isLoadingPublicTeams) return
    if (observer.current) observer.current.disconnect()
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && publicTeams.length < totalPublicTeams) {
        setPublicTeamsPage(prev => prev + 1)
      }
    })
    
    if (node) observer.current.observe(node)
  }, [isLoadingPublicTeams, publicTeams.length, totalPublicTeams])

  const handlePlayerDetailChange = (e) => {
    const { name, value } = e.target
    setPlayerDetails((prev) => ({ ...prev, [name]: value }))
  }

  /**
   * Timer is held in a ref and cleared on each call: two toasts in quick
   * succession would otherwise leave the first one's timer running, and it would
   * blank the second one early.
   */
  const toastTimer = useRef(null)

  const showToast = useCallback((msg) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToastMessage(msg)
    toastTimer.current = setTimeout(() => setToastMessage(''), 4000)
  }, [])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  /**
   * Server-sent notifications.
   *
   * The backend already persisted one and pushed it here; without this listener
   * it went nowhere, so a leader was never told that someone had joined — the
   * roster silently gained a row and nothing said why. Notifications are only
   * addressed to users who should hear about the action, so this never echoes the
   * actor's own doing back at them.
   */
  useSocketEvent(SOCKET_EVENTS.NOTIFICATION_NEW, ({ notification }) => {
    showToast(notification.body)
  })

  const closeModals = () => {
    setIsCreateModalOpen(false)
    setIsJoinModalOpen(false)
    setFormError(null)
    setTeamNameInput('')
    setTeamCodeInput('')
    setJoinModalStep(1)
    setJoinTeamDetails(null)
    setPublicTeamsPage(0)
  }

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

  const handleJoinTeamNext = async (e) => {
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
      const details = await getPartyDetails(inviteCode)
      if (!details) {
        setFormError('Team not found.')
        setIsSubmitting(false)
        return
      }
      setJoinTeamDetails(details)
      setJoinModalStep(2)
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleJoinTeamConfirm = async (e) => {
    e.preventDefault()
    if (isSubmitting || !joinTeamDetails) return

    setFormError(null)
    setIsSubmitting(true)
    try {
      const inviteCode = joinTeamDetails.id
      if (joinTeamDetails.visibility === 'PRIVATE') {
        // useTeam hook has requestJoin
        await requestJoin({ inviteCode, playerDetails })
        closeModals()
        showToast('Join request sent!')
      } else {
        await join({ inviteCode, playerDetails })
        closeModals()
        showToast('Joined team successfully!')
      }
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

  const handleLeaveTeam = () => {
    if (isLeader && team.members.length > 1) {
      showToast('You must transfer leadership to another member before leaving.')
      return
    }

    setConfirmModal({
      isOpen: true,
      title: 'Leave Team',
      description: 'Are you sure you want to leave the team?',
      actionName: 'Leave',
      isDestructive: false,
      onConfirm: async () => {
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
    })
  }

  const handleTransferLeadership = async (newLeaderId) => {
    setIsSubmitting(true)
    try {
      await transferLeader(newLeaderId)
      showToast('Leadership transferred successfully.')
    } catch (error) {
      showToast(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteTeam = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Disband Team',
      description: 'Are you sure you want to disband the team? This cannot be undone.',
      actionName: 'Disband',
      isDestructive: true,
      onConfirm: async () => {
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
    })
  }

  const handleToggleVisibility = async () => {
    if (!team) return
    setIsSubmitting(true)
    try {
      const newVisibility = team.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC'
      // useTeam exposes setVisibility
      await setVisibility(newVisibility)
      showToast(`Team is now ${newVisibility === 'PUBLIC' ? 'Public' : 'Private'}`)
    } catch (error) {
      showToast(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveMember = (userId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Kick Operative',
      description: 'Are you sure you want to kick this operative from the squad?',
      actionName: 'Kick',
      isDestructive: true,
      onConfirm: async () => {
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
    })
  }

  return (
    <main className="section-shell relative flex min-h-[calc(100vh-74px)] flex-col items-center justify-center px-6 py-12 bg-void">
      <NoiseDarkPurpleGradientWithSquares />

      {/* Premium Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, filter: 'blur(5px)' }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed top-24 right-4 md:right-8 z-50 min-w-[320px] max-w-sm overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0c]/80 backdrop-blur-xl shadow-2xl shadow-amethyst/10"
          >
            <div className="relative flex items-start gap-4 p-5">
              
              {/* Glowing Indicator */}
              <div className="relative mt-1 flex h-2 w-2 items-center justify-center shrink-0">
                <div className="absolute h-full w-full animate-ping rounded-full bg-amethyst opacity-75"></div>
                <div className="relative h-1.5 w-1.5 rounded-full bg-amethyst-light"></div>
              </div>

              {/* Content */}
              <div className="flex-1 relative z-10">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono text-[10px] tracking-[0.15em] text-amethyst uppercase font-semibold">
                    SYS_NOTIFY
                  </span>
                  <span className="h-px flex-1 bg-white/10" />
                </div>
                <p className="font-mono text-xs text-neutral-300 leading-relaxed tracking-wide">
                  {toastMessage}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 4, ease: "linear" }}
              className="h-[2px] bg-amethyst-light shadow-[0_0_8px_rgba(216,180,254,0.8)] opacity-90"
            />
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

                      {/* Captain Controls to manage others */}
                      {isLeader && member.userId !== user?.userId && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleTransferLeadership(member.userId)}
                            disabled={isSubmitting}
                            className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 rounded-md transition-all disabled:opacity-40"
                            title="Make Captain"
                          >
                            <Crown className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleRemoveMember(member.userId)}
                            disabled={busyMemberId === member.userId}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-md transition-all disabled:opacity-40"
                            title="Kick Operative"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending Join Requests */}
              {isLeader && joinRequests.length > 0 && (
                <div className="lg:col-span-2 flex flex-col gap-4 mt-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <h3 className="font-heading text-lg tracking-widest text-white">Pending Requests ({joinRequests.length})</h3>
                  </div>

                  <div className="flex flex-col gap-3">
                    {joinRequests.map((req) => (
                      <div key={req.id} className="surface-card p-4 flex items-center justify-between bg-black/20 hover:bg-white/5 transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-orange-400" />
                          </div>
                          <div>
                            <p className="font-heading text-white tracking-wider">{req.username}</p>
                            <p className="text-xs font-body text-neutral-500 uppercase">Requested to join</p>
                          </div>
                        </div>

                        <div className={`flex gap-2 transition-opacity ${processingRequest?.id === req.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                          <button
                            onClick={() => handleRequestAction(req.id, 'accept')}
                            disabled={processingRequest?.id === req.id}
                            className="px-3 py-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-md transition-colors text-xs font-heading tracking-widest uppercase border border-emerald-500/30 disabled:opacity-50"
                          >
                            {processingRequest?.id === req.id && processingRequest?.action === 'accept' ? 'Accepting...' : 'Accept'}
                          </button>
                          <button
                            onClick={() => handleRequestAction(req.id, 'reject')}
                            disabled={processingRequest?.id === req.id}
                            className="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-md transition-colors text-xs font-heading tracking-widest uppercase border border-red-500/30 disabled:opacity-50"
                          >
                            {processingRequest?.id === req.id && processingRequest?.action === 'reject' ? 'Rejecting...' : 'Reject'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Panel */}
              <div className="surface-card p-6 flex flex-col gap-6 h-fit bg-black/40">
                <h3 className="font-heading text-lg tracking-widest text-white border-b border-white/10 pb-4">Actions</h3>

                {isLeader ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2 pb-4 border-b border-white/5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-heading tracking-widest text-white">Team Privacy</p>
                        <button
                          onClick={handleToggleVisibility}
                          disabled={isSubmitting}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                            team.visibility === 'PRIVATE' ? 'bg-amethyst' : 'bg-neutral-600'
                          }`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${team.visibility === 'PRIVATE' ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                      <p className="text-xs font-body text-neutral-400">
                        {team.visibility === 'PRIVATE'
                          ? 'Private: People with the code must request to join, and you must approve them.'
                          : 'Public: Anyone with the code can join your team instantly.'}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 mt-2">
                      <p className="text-xs font-body text-neutral-400">As the Captain, you command this squad.</p>
                      <div className="flex flex-col gap-4">
                        <button
                          onClick={handleLeaveTeam}
                          disabled={isSubmitting}
                          className="w-full py-3 flex items-center justify-center gap-2 border border-orange-500/50 text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors font-heading tracking-widest uppercase text-sm disabled:opacity-50"
                        >
                          <LogOut className="w-4 h-4" /> Leave Team
                        </button>
                        <button
                          onClick={handleDeleteTeam}
                          disabled={isSubmitting}
                          className="w-full py-3 flex items-center justify-center gap-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-heading tracking-widest uppercase text-sm disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" /> Disband Team
                        </button>
                      </div>
                    </div>
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
        {confirmModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="surface-card w-full max-w-md p-5 sm:p-8 relative bg-void border border-white/10 shadow-2xl"
            >
              <h2 className="text-xl font-heading text-white tracking-widest mb-2 uppercase">{confirmModal.title}</h2>
              <p className="text-sm font-body text-neutral-400 mb-8">{confirmModal.description}</p>
              
              <div className="flex gap-4">
                <Button variant="secondary" onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} disabled={isSubmitting} className="flex-1 justify-center disabled:opacity-50">
                  Cancel
                </Button>
                <Button 
                  variant="primary"
                  onClick={async () => {
                    if (confirmModal.onConfirm) {
                      await confirmModal.onConfirm()
                    }
                    setConfirmModal(prev => ({ ...prev, isOpen: false }))
                  }} 
                  disabled={isSubmitting} 
                  className={`flex-1 justify-center disabled:opacity-50 ${confirmModal.isDestructive ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_25px_rgba(239,68,68,0.6)]' : ''}`}
                >
                  {isSubmitting ? 'Processing…' : confirmModal.actionName}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

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
                <Button variant="primary" type="submit" disabled={isSubmitting} className="w-full justify-center disabled:opacity-60">
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

              {joinModalStep === 1 ? (
                <div className="flex flex-col gap-6">
                  <form onSubmit={handleJoinTeamNext} className="flex flex-col gap-6">
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
                    <Button variant="primary" type="submit" disabled={isSubmitting} className="w-full justify-center disabled:opacity-60">
                      {isSubmitting ? 'Checking…' : 'Continue'}
                    </Button>
                  </form>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-white/10"></div>
                    <span className="flex-shrink-0 mx-4 text-neutral-500 text-xs font-heading tracking-widest uppercase">or</span>
                    <div className="flex-grow border-t border-white/10"></div>
                  </div>

                  <Button 
                    variant="secondary" 
                    type="button" 
                    onClick={() => setJoinModalStep(3)} 
                    className="w-full justify-center text-amethyst-light border border-amethyst/30 hover:bg-amethyst/10"
                  >
                    Browse Public Teams
                  </Button>
                </div>
              ) : joinModalStep === 2 ? (
                <form onSubmit={handleJoinTeamConfirm} className="flex flex-col gap-6">
                  <div className="flex flex-col items-center text-center mb-4">
                    <p className="text-xs font-heading tracking-[0.2em] text-amethyst-light mb-1">
                      {joinTeamDetails.visibility === 'PRIVATE' ? 'PRIVATE SQUAD' : 'PUBLIC SQUAD'}
                    </p>
                    <h3 className="text-3xl font-heading text-white">{joinTeamDetails.name}</h3>
                  </div>

                  {renderPlayerFields()}
                  <div className="flex gap-4">
                    <Button variant="secondary" type="button" onClick={() => setJoinModalStep(1)} disabled={isSubmitting} className="w-full justify-center disabled:opacity-60">
                      Back
                    </Button>
                    <Button variant="primary" type="submit" disabled={isSubmitting} className="w-full justify-center disabled:opacity-60">
                      {isSubmitting ? 'Infiltrating…' : joinTeamDetails.visibility === 'PRIVATE' ? 'Request to Join' : 'Infiltrate Squad'}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <h3 className="font-heading text-lg tracking-widest text-white uppercase">Public Directory</h3>
                  </div>
                  
                  <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {publicTeams.length === 0 && !isLoadingPublicTeams ? (
                      <div className="surface-card p-6 text-center">
                        <p className="text-sm font-body text-neutral-400">No public squads found. Be the first to create one!</p>
                      </div>
                    ) : (
                      <>
                        {publicTeams.map(pt => (
                          <div key={pt.id} className="surface-card p-4 flex flex-col md:flex-row items-center justify-between gap-4 bg-black/20 hover:bg-white/5 transition-colors group">
                            <div className="flex flex-col items-center md:items-start">
                              <div className="flex items-center gap-2">
                                <h4 className="font-heading text-white tracking-wider text-lg">{pt.name}</h4>
                                {pt.hasPassword && <span title="Password Protected" className="text-xs bg-white/10 px-2 py-0.5 rounded text-neutral-400">🔒</span>}
                              </div>
                              <p className="text-xs font-body text-neutral-500 uppercase">
                                {pt.memberCount} / {pt.maxPlayers} Operatives
                              </p>
                            </div>
                            
                            <Button 
                              variant="primary" 
                              disabled={pt.memberCount >= pt.maxPlayers}
                              onClick={() => {
                                 setTeamCodeInput(pt.id)
                                 setJoinTeamDetails(pt)
                                 setJoinModalStep(2)
                              }}
                            >
                              {pt.memberCount >= pt.maxPlayers ? 'Squad Full' : 'Join Squad'}
                            </Button>
                          </div>
                        ))}
                        
                        {isLoadingPublicTeams && (
                          <>
                            <TeamSkeleton />
                            <TeamSkeleton />
                          </>
                        )}
                        
                        {!isLoadingPublicTeams && publicTeams.length < totalPublicTeams && (
                          <div ref={lastTeamElementRef} className="h-4 w-full flex-shrink-0" />
                        )}
                      </>
                    )}
                  </div>

                  <Button variant="secondary" type="button" onClick={() => setJoinModalStep(1)} className="w-full justify-center mt-2">
                    Back
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  )
}
