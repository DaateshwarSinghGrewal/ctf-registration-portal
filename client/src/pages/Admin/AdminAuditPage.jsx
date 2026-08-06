import { useState, useEffect } from 'react'
import { listAuditLog } from '../../api/admin.js'

export default function AdminAuditPage() {
  const [logs, setLogs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchLogs = async () => {
    setIsLoading(true)
    try {
      const data = await listAuditLog(100, 0)
      setLogs(Array.isArray(data) ? data : (data.entries || []))
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-heading tracking-widest uppercase text-white mb-2">Audit Terminal</h2>
        <p className="text-sm font-body text-neutral-400">System-wide surveillance of operative actions.</p>
      </div>

      {error && <div className="text-red-400 text-sm font-heading tracking-widest uppercase">{error}</div>}

      <div className="surface-card p-6 bg-black/40 border border-white/10 rounded-xl overflow-hidden font-mono text-xs">
        {isLoading ? (
          <div className="text-center py-8 text-neutral-400 tracking-widest uppercase animate-pulse">
            Tapping into mainframe...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 tracking-widest uppercase text-neutral-500">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor ID</th>
                  <th className="py-3 px-4">Target Type</th>
                  <th className="py-3 px-4">Target ID</th>
                  <th className="py-3 px-4">Metadata</th>
                </tr>
              </thead>
              <tbody className="text-neutral-300">
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-neutral-400 whitespace-nowrap">
                      {new Date(log.createdat).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-amethyst-light">{log.action}</td>
                    <td className="py-3 px-4 truncate max-w-[150px]" title={log.actorid}>
                      {log.actorusername || log.actorid}
                    </td>
                    <td className="py-3 px-4">{log.targettype}</td>
                    <td className="py-3 px-4 truncate max-w-[150px]" title={log.targetid}>{log.targetid}</td>
                    <td className="py-3 px-4 text-neutral-500 whitespace-pre">
                      {JSON.stringify(log.metadata, null, 2)}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-neutral-500 font-heading tracking-widest uppercase text-sm">
                      No logs found
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
