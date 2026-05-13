// src/components/layout/TopNav.tsx
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'

interface TopNavProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function TopNav({ title, subtitle, actions }: TopNavProps) {
  const { user } = useAuth()
  const { isDark } = useTheme()

  return (
    <header className={`sticky top-0 z-10 h-16 flex items-center justify-between px-6 transition-colors duration-200 ${
      isDark 
        ? 'bg-slate-900/95 border-slate-800' 
        : 'bg-white/95 border-slate-200'
    } backdrop-blur-sm border-b`}>
      {/* Left — Title */}
      <div>
        <h1 className={`text-lg font-semibold leading-tight ${
          isDark ? 'text-white' : 'text-slate-900'
        }`}>
          {title}
        </h1>
        {subtitle && (
          <p className={`text-xs mt-0.5 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Right — Actions + Controls */}
      <div className="flex items-center gap-2">
        {actions}
        <div className={`w-px h-6 mx-1 ${
          isDark ? 'bg-slate-700' : 'bg-slate-200'
        }`} />
        <ThemeToggle />
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
          {user?.email?.charAt(0).toUpperCase() ?? 'U'}
        </div>
      </div>
    </header>
  )
}