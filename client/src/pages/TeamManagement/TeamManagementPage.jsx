import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Plus, LogIn, LogOut, Trash2, X, Crown, User as UserIcon } from 'lucide-react'
import Button from '../../components/ui/Button.jsx'
import StarfieldBackground from '../../components/layout/StarfieldBackground.jsx'
import { GradientHeading } from '../../components/ui/gradient-heading.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

// --- Mock Data & Helpers ---
const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase()

const DUMMY_MEMBERS = [
  { id: '1', username: 'NeonHacker', role: 'Captain' },
  { id: '2', username: 'CipherByte', role: 'Member' },
  { id: '3', username: 'GlitchMaster', role: 'Member' },
]

export default function TeamManagementPage() {
  const { user, signOut } = useAuth()
  
  // -- Core State --
  // If party is null, show State 1 (Solo). If party exists, show State 2 (Team Dashboard).
  const [party, setParty] = useState(null)
  
  // -- UI State --
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // -- Form State --
  const [teamNameInput, setTeamNameInput] = useState('')
  const [teamCodeInput, setTeamCodeInput] = useState('')

  // Toast Helper
  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }

  // --- Handlers (Mocked functionality) ---
  const handleCreateTeam = (e) => {
    e.preventDefault()
    if (!teamNameInput.trim()) return
    const newTeam = {
      id: generateCode(),
      name: teamNameInput,
      maxPlayers: 4,
      members: [{ id: 'me', username: user?.username || 'You', role: 'Captain' }]
    }
    setParty(newTeam)
    setIsCreateModalOpen(false)
    setTeamNameInput('')
    showToast('Team Created Successfully!')
  }

  const handleJoinTeam = (e) => {
    e.preventDefault()
    if (!teamCodeInput.trim()) return
    const joinedTeam = {
      id: teamCodeInput.toUpperCase(),
      name: 'The Cyber Syndicate',
      maxPlayers: 4,
      members: [
        ...DUMMY_MEMBERS,
        { id: 'me', username: user?.username || 'You', role: 'Member' }
      ]
    }
    setParty(joinedTeam)
    setIsJoinModalOpen(false)
    setTeamCodeInput('')
    showToast('Joined Team Successfully!')
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(party?.id)
    showToast('Team Code Copied!')
  }

  const handleLeaveTeam = () => {
    setParty(null)
    showToast('You left the team.')
  }

  const handleDeleteTeam = () => {
    setParty(null)
    showToast('Team disbanded.')
  }

  const handleRemoveMember = (memberId) => {
    setParty(prev => ({
      ...prev,
      members: prev.members.filter(m => m.id !== memberId)
    }))
    showToast('Member removed.')
  }

  // Determine current user's role in the mock party
  const currentUserRole = party?.members?.find(m => m.id === 'me')?.role || 'Member'

  return (
    <main className="section-shell relative flex min-h-screen flex-col items-center justify-center px-6 py-24 bg-void">
      <StarfieldBackground density={60} glow={true} />

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

      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col gap-10 mt-16">
        
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

        {/* --- STATE 1: No Team --- */}
        {!party && (
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
        {party && (
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
                  {party.name}
                </h2>
              </div>

              <div className="flex flex-col items-center bg-black/40 border border-white/10 rounded-xl p-4 backdrop-blur-sm z-10">
                <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">Team Code</p>
                <div className="flex items-center gap-3">
                  <span className="font-brand text-2xl text-amethyst-bright tracking-wider">{party.id}</span>
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
                  <h3 className="font-heading text-lg tracking-widest text-white">Operatives ({party.members.length}/{party.maxPlayers})</h3>
                </div>
                
                <div className="flex flex-col gap-3">
                  {party.members.map((member) => (
                    <div key={member.id} className="surface-card p-4 flex items-center justify-between bg-black/20 hover:bg-white/5 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-amethyst/20 border border-amethyst/40 flex items-center justify-center">
                          {member.role === 'Captain' ? (
                            <Crown className="w-5 h-5 text-fuchsia-400" />
                          ) : (
                            <UserIcon className="w-5 h-5 text-amethyst-light" />
                          )}
                        </div>
                        <div>
                          <p className="font-heading text-white tracking-wider">{member.username}</p>
                          <p className="text-xs font-body text-neutral-500 uppercase">{member.role}</p>
                        </div>
                      </div>
                      
                      {/* Captain Controls to remove others */}
                      {currentUserRole === 'Captain' && member.id !== 'me' && (
                        <button 
                          onClick={() => handleRemoveMember(member.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-md transition-all"
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
                
                {currentUserRole === 'Captain' ? (
                  <div className="flex flex-col gap-4">
                    <p className="text-xs font-body text-neutral-400">As the Captain, you command this squad. Disbanding will remove all operatives.</p>
                    <button 
                      onClick={handleDeleteTeam}
                      className="w-full py-3 flex items-center justify-center gap-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-heading tracking-widest uppercase text-sm"
                    >
                      <Trash2 className="w-4 h-4" /> Disband Team
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <p className="text-xs font-body text-neutral-400">You are an operative. Leaving will forfeit your spot in this squad.</p>
                    <button 
                      onClick={handleLeaveTeam}
                      className="w-full py-3 flex items-center justify-center gap-2 border border-orange-500/50 text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors font-heading tracking-widest uppercase text-sm"
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
              className="surface-card w-full max-w-md p-8 relative bg-void border-amethyst/40 shadow-[0_0_50px_rgba(168,85,247,0.15)]"
            >
              <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-white">
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
                    value={teamNameInput}
                    onChange={(e) => setTeamNameInput(e.target.value)}
                    placeholder="Enter squad name..."
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-neutral-600 focus:outline-none focus:border-amethyst focus:ring-1 focus:ring-amethyst transition-all"
                  />
                </div>
                <Button variant="pill" type="submit" className="w-full justify-center">Initialize Squad</Button>
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
              className="surface-card w-full max-w-md p-8 relative bg-void border-amethyst/40 shadow-[0_0_50px_rgba(168,85,247,0.15)]"
            >
              <button onClick={() => setIsJoinModalOpen(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-white">
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
                    onChange={(e) => setTeamCodeInput(e.target.value)}
                    placeholder="e.g. X7K9L2"
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-neutral-600 font-brand tracking-widest uppercase focus:outline-none focus:border-amethyst focus:ring-1 focus:ring-amethyst transition-all"
                  />
                </div>
                <Button variant="pill" type="submit" className="w-full justify-center">Infiltrate Squad</Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  )
}
