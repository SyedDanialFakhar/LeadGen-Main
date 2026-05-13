// src/components/ui/MultiSelect.tsx
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X, Check } from 'lucide-react'
import { cn } from '@/utils/cn'

interface MultiSelectProps {
  label: string
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  disabled?: boolean
  helperText?: string
}

export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Select options...',
  disabled = false,
  helperText,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option))
    } else {
      onChange([...selected, option])
    }
  }

  const removeOption = (option: string) => {
    onChange(selected.filter(s => s !== option))
  }

  const selectAll = () => {
    onChange([...options])
  }

  const clearAll = () => {
    onChange([])
  }

  return (
    <div className="flex flex-col gap-1.5" ref={dropdownRef}>
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <div className="relative">
        {/* Selected Tags */}
        <div
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={cn(
            'min-h-[38px] p-1.5 rounded-lg border cursor-pointer flex flex-wrap gap-1',
            'bg-white dark:bg-slate-800',
            'text-slate-900 dark:text-slate-100',
            'border-slate-300 dark:border-slate-600',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            disabled && 'opacity-50 cursor-not-allowed',
            isOpen && 'ring-2 ring-blue-500'
          )}
        >
          {selected.length === 0 ? (
            <span className="text-slate-400 text-sm px-1">{placeholder}</span>
          ) : (
            <>
              {selected.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-xs"
                >
                  {item}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeOption(item)
                    }}
                    className="hover:text-blue-900 dark:hover:text-blue-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </>
          )}
          <ChevronDown className={cn(
            'w-4 h-4 ml-auto transition-transform',
            isOpen && 'rotate-180'
          )} />
        </div>

        {/* Dropdown */}
        {isOpen && !disabled && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b border-slate-200 dark:border-slate-700">
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-2 py-1 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            {/* Select All / Clear All */}
            <div className="flex gap-2 p-2 border-b border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Select All
              </button>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-red-600 dark:text-red-400 hover:underline"
              >
                Clear All
              </button>
              <span className="flex-1 text-right text-xs text-slate-500">
                {selected.length} selected
              </span>
            </div>
            
            {/* Options List */}
            <div className="max-h-64 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-sm text-slate-500">
                  No matching job titles
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleOption(option)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors',
                      selected.includes(option) && 'bg-blue-50 dark:bg-blue-900/20'
                    )}
                  >
                    <span className="text-slate-700 dark:text-slate-300">{option}</span>
                    {selected.includes(option) && (
                      <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      {helperText && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
      )}
    </div>
  )
}