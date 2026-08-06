import { useState, useEffect } from 'react'
import { listUsers, changeUserRole } from '../../api/admin.js'

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const data = await listUsers(100, 0)
      setUsers(data.users)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleRoleChange = async (userId, currentRole) => {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN'
    if (!window.confirm(`Change role to ${newRole}?`)) return
    
    try {
      await changeUserRole(userId, newRole)
      setUsers(users.map(u => u.userId === userId ? { ...u, role: newRole } : u))
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-heading tracking-widest uppercase text-white mb-2">Operatives Roster</h2>
        <p className="text-sm font-body text-neutral-400">View and manage all registered operatives.</p>
      </div>

      {error && <div className="text-red-400 text-sm font-heading tracking-widest uppercase">{error}</div>}

      <div className="surface-card p-6 bg-black/40 border border-white/10 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="text-center py-8 text-neutral-400 font-heading tracking-widest uppercase text-sm animate-pulse">
            Decrypting Records...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs font-heading tracking-widest uppercase text-neutral-500">
                  <th className="py-3 px-4">Operative</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm font-body text-neutral-300">
                {users.map(user => (
                  <tr key={user.userId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-heading tracking-widest">{user.username}</td>
                    <td className="py-3 px-4 text-neutral-400">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-heading tracking-widest uppercase ${
                        user.role === 'ADMIN' ? 'bg-amethyst/20 text-amethyst-light' : 'bg-neutral-800 text-neutral-400'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button 
                        onClick={() => handleRoleChange(user.userId, user.role)}
                        className="text-xs font-heading tracking-widest uppercase text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Toggle Role
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-neutral-500 font-heading tracking-widest uppercase text-sm">
                      No operatives found
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
