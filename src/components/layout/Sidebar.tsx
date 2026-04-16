// src/components/layout/Sidebar.tsx
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Search, Sparkles,
  Mail, Settings, LogOut, Zap, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useSidebarContext } from './Layout'

const navItems = [
  { label: 'Dashboard',  icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Leads',      icon: Users,           path: '/leads' },
  { label: 'Scraper',    icon: Search,          path: '/scraper' },
  { label: 'Enrichment', icon: Sparkles,        path: '/enrichment' },
  { label: 'Emails',     icon: Mail,            path: '/emails' },
  { label: 'Settings',   icon: Settings,        path: '/settings' },
]

export function Sidebar() {
  const { user, signOut } = useAuth()
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const { collapsed, setCollapsed } = useSidebarContext()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen z-20 flex flex-col transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-60',
        isDark
          ? 'bg-slate-900 border-r border-slate-800'
          : 'bg-white border-r border-slate-200'
      )}
    >
      {/* ── Header ── */}
      <div
        className={cn(
          'flex items-center h-14 border-b transition-colors duration-200 shrink-0',
          collapsed ? 'justify-center px-0' : 'px-4 justify-between',
          isDark ? 'border-slate-800' : 'border-slate-200'
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <span
              className={cn(
                'font-bold text-lg tracking-tight whitespace-nowrap',
                isDark ? 'text-white' : 'text-slate-900'
              )}
            >
              LeadFlow
            </span>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className={cn(
              'p-1.5 rounded-lg transition-colors shrink-0',
              isDark
                ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            )}
            title="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <div className="flex justify-center pt-2 pb-1 shrink-0">
          <button
            onClick={() => setCollapsed(false)}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              isDark
                ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            )}
            title="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Nav ── */}
      <nav className={cn('flex-1 py-2 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden', collapsed ? 'px-2' : 'px-3')}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150',
                collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5',
                isActive
                  ? 'bg-blue-600 text-white'
                  : isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn('shrink-0', collapsed ? 'w-5 h-5' : 'w-4 h-4', isActive ? 'text-white' : '')} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className={cn('py-3 border-t shrink-0 transition-colors duration-200', collapsed ? 'px-2' : 'px-3', isDark ? 'border-slate-800' : 'border-slate-200')}>
        {!collapsed && (
          <div className="px-3 py-1.5 mb-1">
            <p className={cn('text-xs truncate', isDark ? 'text-slate-500' : 'text-slate-400')}>{user?.email}</p>
          </div>
        )}
        <button
          onClick={handleSignOut}
          title={collapsed ? 'Sign Out' : undefined}
          className={cn(
            'w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150',
            collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5',
            isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          )}
        >
          <LogOut className={cn('shrink-0', collapsed ? 'w-5 h-5' : 'w-4 h-4')} />
          {!collapsed && 'Sign Out'}
        </button>
      </div>
    </aside>
  )
}