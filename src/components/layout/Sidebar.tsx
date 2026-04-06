// src/components/layout/Sidebar.tsx
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Search,
  Sparkles,
  Mail,
  Settings,
  LogOut,
  Zap,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Leads', icon: Users, path: '/leads' },
  { label: 'Scraper', icon: Search, path: '/scraper' },
  { label: 'Enrichment', icon: Sparkles, path: '/enrichment' },
  { label: 'Emails', icon: Mail, path: '/emails' },
  { label: 'Settings', icon: Settings, path: '/settings' },
]

export function Sidebar() {
  const { user, signOut } = useAuth()
  const { isDark } = useTheme()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen w-60 z-20 flex flex-col transition-colors duration-200",
      isDark 
        ? "bg-slate-900 border-slate-800" 
        : "bg-white border-slate-200"
    )}>
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-2.5 px-6 py-5 border-b transition-colors duration-200",
        isDark ? "border-slate-800" : "border-slate-200"
      )}>
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className={cn(
          "font-bold text-lg tracking-tight transition-colors duration-200",
          isDark ? "text-white" : "text-slate-900"
        )}>
          LeadFlow
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-blue-600 text-white'
                  : isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              )
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className={cn(
        "px-3 py-4 border-t transition-colors duration-200",
        isDark ? "border-slate-800" : "border-slate-200"
      )}>
        <div className="px-3 py-2 mb-1">
          <p className={cn(
            "text-xs truncate transition-colors duration-200",
            isDark ? "text-slate-500" : "text-slate-400"
          )}>
            {user?.email}
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
            isDark
              ? "text-slate-400 hover:text-white hover:bg-slate-800"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}