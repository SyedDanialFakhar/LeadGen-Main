// src/components/ui/Button.tsx
import { cn } from '@/utils/cn'
import { Spinner } from './Spinner'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const variants = {
  primary: `
    bg-blue-600 text-white hover:bg-blue-700
    dark:bg-blue-500 dark:hover:bg-blue-600
    disabled:bg-blue-300 dark:disabled:bg-blue-800
  `,
  secondary: `
    bg-slate-100 text-slate-800 hover:bg-slate-200
    dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600
    disabled:bg-slate-50 dark:disabled:bg-slate-800
  `,
  outline: `
    border border-slate-300 text-slate-700 hover:bg-slate-50
    dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800
    disabled:opacity-50
  `,
  ghost: `
    text-slate-600 hover:bg-slate-100
    dark:text-slate-400 dark:hover:bg-slate-800
    disabled:opacity-50
  `,
  danger: `
    bg-red-600 text-white hover:bg-red-700
    dark:bg-red-500 dark:hover:bg-red-600
    disabled:bg-red-300 dark:disabled:bg-red-900
  `,
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-md gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'px-6 py-3 text-base rounded-lg gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        'dark:focus:ring-offset-slate-900',
        'disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Spinner size="sm" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      {children}
      {!isLoading && rightIcon && (
        <span className="shrink-0">{rightIcon}</span>
      )}
    </button>
  )
}