// src/components/ui/StatCard.tsx
import { cn } from '@/utils/cn'
import { Spinner } from './Spinner'

interface StatCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  color?: 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'slate'
  isLoading?: boolean
  onClick?: () => void
  className?: string
}

const colors = {
  blue: {
    icon: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
    accent: 'border-l-blue-500',
  },
  green: {
    icon: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400',
    accent: 'border-l-green-500',
  },
  yellow: {
    icon: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400',
    accent: 'border-l-yellow-500',
  },
  orange: {
    icon: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400',
    accent: 'border-l-orange-500',
  },
  red: {
    icon: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
    accent: 'border-l-red-500',
  },
  slate: {
    icon: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400',
    accent: 'border-l-slate-400',
  },
}

export function StatCard({
  title,
  value,
  icon,
  color = 'blue',
  isLoading,
  onClick,
  className,
}: StatCardProps) {
  const { icon: iconClass, accent } = colors[color]

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-slate-800',
        'border border-slate-200 dark:border-slate-700',
        'border-l-4',
        accent,
        'rounded-xl p-5 shadow-sm',
        onClick &&
          'cursor-pointer hover:shadow-md transition-shadow',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            {title}
          </p>
          {isLoading ? (
            <Spinner size="sm" />
          ) : (
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {value}
            </p>
          )}
        </div>
        <div className={cn('p-3 rounded-xl', iconClass)}>{icon}</div>
      </div>
    </div>
  )
}