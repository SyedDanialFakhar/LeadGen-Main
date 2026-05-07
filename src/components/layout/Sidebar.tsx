// src/components/layout/Sidebar.tsx
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Search, Sparkles,
  Mail, Settings, LogOut, ChevronLeft, ChevronRight,
  RefreshCw, Zap, User
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

// Helper to get the best display name available
const getUserDisplayName = (user: any): string => {
  if (!user) return 'Guest'
  
  // Priority order for getting the user's name:
  // 1. Full name from user_metadata (Supabase)
  if (user.user_metadata?.full_name) return user.user_metadata.full_name
  if (user.user_metadata?.display_name) return user.user_metadata.display_name
  if (user.user_metadata?.username) return user.user_metadata.username
  
  // 2. Direct properties (Firebase, Auth0, etc)
  if (user.displayName) return user.displayName
  if (user.fullName) return user.fullName
  if (user.name) return user.name
  
  // 3. Fallback to email username
  if (user.email) {
    const emailUsername = user.email.split('@')[0]
    // Clean it up a bit
    return emailUsername.replace(/[._0-9]/g, ' ').split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim() || 'User'
  }
  
  return 'User'
}

// Get user's initial for avatar
const getUserInitial = (user: any): string => {
  const displayName = getUserDisplayName(user)
  if (displayName === 'Guest' || displayName === 'User') return '👤'
  
  // Get first letter of first name
  const firstLetter = displayName.charAt(0).toUpperCase()
  return firstLetter
}

export function Sidebar() {
  const { user, signOut } = useAuth()
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const { collapsed, setCollapsed } = useSidebarContext()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const displayName = getUserDisplayName(user)
  const userInitial = getUserInitial(user)

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
          {/* Premium Logo - LeadSync */}
          <div className={cn(
            "relative group",
            collapsed ? "w-8 h-8" : "w-8 h-8"
          )}>
            <div className={cn(
              "absolute inset-0 rounded-xl transition-all duration-300",
              "bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500",
              "shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40",
              "group-hover:scale-105 transition-transform"
            )} />
            <div className="absolute inset-[1px] rounded-[10px] bg-white/10" />
            <div className="relative w-full h-full flex items-center justify-center">
              <RefreshCw className={cn(
                "w-4 h-4 text-white transition-all duration-300",
                "group-hover:rotate-180"
              )} />
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            </div>
          </div>
          
          {!collapsed && (
            <div className="flex flex-col">
              <span
                className={cn(
                  'font-bold text-base tracking-tight whitespace-nowrap',
                  isDark ? 'text-white' : 'text-slate-900'
                )}
              >
                Lead<span className="text-blue-500">Sync</span>
              </span>
              <span className={cn(
                'text-[10px] font-medium tracking-wide whitespace-nowrap',
                isDark ? 'text-slate-500' : 'text-slate-400'
              )}>
                LEAD GENERATION
              </span>
            </div>
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
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/20'
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
                {isActive && !collapsed && (
                  <div className="ml-auto w-1 h-5 bg-white/30 rounded-full" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className={cn('py-3 border-t shrink-0 transition-colors duration-200', collapsed ? 'px-2' : 'px-3', isDark ? 'border-slate-800' : 'border-slate-200')}>
        {!collapsed && (
          <div className="px-3 py-2 mb-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
            <div className="flex items-center gap-2">
              {/* Avatar with user initial */}
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md">
                {typeof userInitial === 'string' && userInitial !== '👤' ? (
                  <span className="text-white text-xs font-bold">{userInitial}</span>
                ) : (
                  <User className="w-3.5 h-3.5 text-white" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                {/* Display full name or username */}
                <p className={cn('text-xs font-semibold truncate', isDark ? 'text-slate-200' : 'text-slate-700')}>
                  {displayName}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <button
          onClick={handleSignOut}
          title={collapsed ? 'Sign Out' : undefined}
          className={cn(
            'w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150',
            collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5',
            isDark 
              ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
            'group'
          )}
        >
          <LogOut className={cn('shrink-0 transition-transform group-hover:scale-110', collapsed ? 'w-5 h-5' : 'w-4 h-4')} />
          {!collapsed && 'Sign Out'}
        </button>
      </div>
    </aside>
  )
}