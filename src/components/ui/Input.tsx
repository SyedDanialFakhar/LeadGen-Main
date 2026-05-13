// src/components/ui/Input.tsx
import { cn } from '@/utils/cn'
import type { InputHTMLAttributes } from 'react'
import { useState } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  containerClassName?: string
}

export function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  containerClassName,
  className,
  id,
  disabled,
  onFocus,
  onBlur,
  value,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  const [isFocused, setIsFocused] = useState(false)
  const [hasValue, setHasValue] = useState(!!value)

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true)
    onFocus?.(e)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false)
    onBlur?.(e)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasValue(e.target.value.length > 0)
    props.onChange?.(e)
  }

  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            'text-sm font-medium transition-all duration-200',
            isFocused 
              ? 'text-blue-600 dark:text-blue-400 translate-x-0.5' 
              : error
              ? 'text-red-600 dark:text-red-400'
              : 'text-slate-700 dark:text-slate-300'
          )}
        >
          {label}
        </label>
      )}
      <div className="relative group">
        {leftIcon && (
          <div className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2 transition-all duration-200 z-10',
            isFocused && !error
              ? 'text-blue-500 dark:text-blue-400 scale-110'
              : error
              ? 'text-red-500 dark:text-red-400'
              : hasValue || isFocused
              ? 'text-blue-500 dark:text-blue-400'
              : 'text-slate-400 dark:text-slate-500'
          )}>
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            'w-full rounded-xl border text-sm transition-all duration-200',
            'bg-white dark:bg-slate-800',
            'text-slate-900 dark:text-slate-100',
            'placeholder:text-slate-400 dark:placeholder:text-slate-500',
            'focus:outline-none',
            disabled && 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900',
            isFocused && !error
              ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
              : error
              ? 'border-red-500 dark:border-red-400'
              : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500',
            leftIcon ? 'pl-10' : 'pl-4',
            rightIcon ? 'pr-10' : 'pr-4',
            'py-2.5',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2 transition-all duration-200 cursor-pointer z-10',
            isFocused && !error
              ? 'text-blue-500 dark:text-blue-400 scale-110'
              : error
              ? 'text-red-500 dark:text-red-400'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
          )}>
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 animate-shake flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}
      {helperText && !error && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {helperText}
        </p>
      )}
    </div>
  )
}