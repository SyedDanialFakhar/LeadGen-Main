// src/components/ui/ProgressBar.tsx
import { cn } from '@/utils/cn'

interface ProgressBarProps {
  value: number
  max: number
  label?: string
  showCount?: boolean
  color?: 'blue' | 'green' | 'yellow' | 'red'
  className?: string
}

const colors = {
  blue: 'bg-blue-500 dark:bg-blue-400',
  green: 'bg-green-500 dark:bg-green-400',
  yellow: 'bg-yellow-500 dark:bg-yellow-400',
  red: 'bg-red-500 dark:bg-red-400',
}

export function ProgressBar({
  value,
  max,
  label,
  showCount = true,
  color = 'blue',
  className,
}: ProgressBarProps) {
  const percentage = max === 0 ? 0 : Math.min(100, (value / max) * 100)

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {(label || showCount) && (
        <div className="flex items-center justify-between text-xs">
          {label && (
            <span className="text-slate-600 dark:text-slate-400">{label}</span>
          )}
          {showCount && (
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              {value}/{max}
            </span>
          )}
        </div>
      )}
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
        <div
          className={cn(
            'h-2 rounded-full transition-all duration-300',
            colors[color]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}