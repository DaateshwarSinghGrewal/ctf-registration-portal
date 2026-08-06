import { useState, useEffect } from 'react'
import { listParties, deleteParty } from '../../api/admin.js'

export default function AdminTeamsPage() {
  const [parties, setParties] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchParties = async () => {
    setIsLoading(true)
    try {
      const data = await listParties(100, 0)
      setParties(data.parties)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchParties()
  }, [])

  const handleDelete = async (partyId) => {
    if (!window.confirm('FORCE DELETE THIS TEAM? This cannot be undone.')) return
    
    try {
      await deleteParty(partyId)
      setParties(parties.filter(p => p.id !== partyId))
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-heading tracking-widest uppercase text-white mb-2">Squad Registry</h2>
        <p className="text-sm font-body text-neutral-400">View and terminate active squads.</p>
      </div>

      {error && <div className="text-red-400 text-sm font-heading tracking-widest uppercase">{error}</div>}

      <div className="surface-card p-6 bg-black/40 border border-white/10 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="text-center py-8 text-neutral-400 font-heading tracking-widest uppercase text-sm animate-pulse">
            Accessing Registry...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs font-heading tracking-widest uppercase text-neutral-500">
                  <th className="py-3 px-4">Squad Name</th>
                  <th className="py-3 px-4">Visibility</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm font-body text-neutral-300">
                {parties.map(party => (
                  <tr key={party.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-heading tracking-widest text-white">{party.name}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-heading tracking-widest uppercase ${
                        party.visibility === 'PRIVATE' ? 'bg-amethyst/20 text-amethyst-light' : 'bg-neutral-800 text-neutral-400'
                      }`}>
                        {party.visibility}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-400 text-xs">
                      {new Date(party.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button 
                        onClick={() => handleDelete(party.id)}
                        className="text-xs font-heading tracking-widest uppercase text-red-400 hover:text-red-300 transition-colors"
                      >
                        Terminate
                      </button>
                    </td>
                  </tr>
                ))}
                {parties.length === 0 && (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-neutral-500 font-heading tracking-widest uppercase text-sm">
                      No squads registered
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
