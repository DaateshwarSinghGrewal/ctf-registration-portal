import { useState, useEffect } from 'react'
import { listParties, deleteParty, exportParties } from '../../api/admin.js'
import * as XLSX from 'xlsx'

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

  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const data = await exportParties()
      if (!data || data.length === 0) {
        alert("No team members found to export.")
        return
      }

      // Map backend data to beautiful Excel columns
      const formattedData = data.map(row => ({
        "Team Name": row.teamName,
        "Invite Code": row.inviteCode,
        "Role": row.role,
        "Full Name": row.fullName || "-",
        "Email": row.email,
        "Discord": row.discordUsername || "-",
        "Phone": row.phone || "-",
        "Year": row.year || "-",
        "Branch": row.branch || "-",
        "Roll / Admission No.": row.rollNumber || "-",
        "Joined At": row.joinedAt ? new Date(row.joinedAt).toLocaleString() : "-"
      }))

      const ws = XLSX.utils.json_to_sheet(formattedData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Teams")
      XLSX.writeFile(wb, "CTF_Teams_Export.xlsx")
    } catch (err) {
      alert(`Export Failed: ${err.message}`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading tracking-widest uppercase text-white mb-2">Squad Registry</h2>
          <p className="text-sm font-body text-neutral-400">View and terminate active squads.</p>
        </div>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="px-6 py-2.5 bg-amethyst hover:bg-amethyst-light text-void font-heading tracking-widest uppercase text-sm font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(216,180,254,0.3)] hover:shadow-[0_0_25px_rgba(216,180,254,0.5)] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isExporting ? 'Exporting...' : 'Export to Excel'}
        </button>
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
