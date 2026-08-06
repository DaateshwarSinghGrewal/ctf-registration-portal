import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, ShieldAlert, FileText, ArrowLeft } from 'lucide-react'
import StarfieldBackground from '../components/layout/StarfieldBackground.jsx'

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-void text-white font-body selection:bg-amethyst/30 relative">
      <StarfieldBackground density={50} glow={true} />
      
      <div className="relative z-10 flex flex-col md:flex-row min-h-screen max-w-7xl mx-auto">
        
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 p-6 flex flex-col gap-8 border-b md:border-b-0 md:border-r border-white/10 bg-black/20 backdrop-blur-md">
          <div>
            <h1 className="font-brand text-2xl font-bold tracking-widest text-white mb-1">SOMNIUM</h1>
            <p className="font-heading text-[10px] tracking-[0.3em] text-amethyst-light uppercase">Command Override</p>
          </div>

          <nav className="flex flex-col gap-2 flex-grow">
            <NavLink
              to="/admin"
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg font-heading tracking-widest uppercase text-xs transition-colors ${
                  isActive ? 'bg-amethyst/20 text-amethyst-light border border-amethyst/30' : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4" /> Operations
            </NavLink>
            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg font-heading tracking-widest uppercase text-xs transition-colors ${
                  isActive ? 'bg-amethyst/20 text-amethyst-light border border-amethyst/30' : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Users className="w-4 h-4" /> Operatives
            </NavLink>
            <NavLink
              to="/admin/teams"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg font-heading tracking-widest uppercase text-xs transition-colors ${
                  isActive ? 'bg-amethyst/20 text-amethyst-light border border-amethyst/30' : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <ShieldAlert className="w-4 h-4" /> Squads
            </NavLink>
            <NavLink
              to="/admin/audit"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg font-heading tracking-widest uppercase text-xs transition-colors ${
                  isActive ? 'bg-amethyst/20 text-amethyst-light border border-amethyst/30' : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <FileText className="w-4 h-4" /> Audit Logs
            </NavLink>
          </nav>
          
          <div className="pt-4 border-t border-white/10">
             <NavLink
              to="/team"
              className="flex items-center gap-3 px-4 py-3 rounded-lg font-heading tracking-widest uppercase text-xs text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Exit Console
            </NavLink>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-10 overflow-x-hidden">
          <div className="max-w-4xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
