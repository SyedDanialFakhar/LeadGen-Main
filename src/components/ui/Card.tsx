// src/components/ui/Card.tsx
import { cn } from '@/utils/cn'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}

export function Card({ children, className, hover, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-slate-800',
        'border border-slate-200 dark:border-slate-700',
        'rounded-xl shadow-sm',
        hover &&
          'cursor-pointer hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div
      className={cn(
        'px-6 py-4 border-b border-slate-200 dark:border-slate-700',
        className
      )}
    >
      {children}
    </div>
  )
}

interface CardBodyProps {
  children: React.ReactNode
  className?: string
}

export function CardBody({ children, className }: CardBodyProps) {
  return (
    <div className={cn('px-6 py-4', className)}>{children}</div>
  )
}

interface CardFooterProps {
  children: React.ReactNode
  className?: string
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div
      className={cn(
        'px-6 py-4 border-t border-slate-200 dark:border-slate-700',
        'bg-slate-50 dark:bg-slate-900 rounded-b-xl',
        className
      )}
    >
      {children}
    </div>
  )
}