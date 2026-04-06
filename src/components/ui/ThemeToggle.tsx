// src/components/ui/ThemeToggle.tsx
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/utils/cn'

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'relative p-2 rounded-lg transition-all duration-200',
        'hover:bg-slate-100 dark:hover:bg-slate-800',
        'focus:outline-none focus:ring-2 focus:ring-blue-500',
        'text-slate-500 dark:text-slate-400',
        className
      )}
    >
      <Sun
        className={cn(
          'w-5 h-5 transition-all duration-300',
          isDark
            ? 'opacity-100 rotate-0 scale-100'
            : 'opacity-0 rotate-90 scale-0 absolute'
        )}
      />
      <Moon
        className={cn(
          'w-5 h-5 transition-all duration-300',
          !isDark
            ? 'opacity-100 rotate-0 scale-100'
            : 'opacity-0 -rotate-90 scale-0 absolute'
        )}
      />
    </button>
  )
}