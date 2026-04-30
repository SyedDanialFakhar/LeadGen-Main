// src/components/scraper/ActiveFiltersBar.tsx
import { X, Clock, Filter } from 'lucide-react'
import { cn } from '@/utils/cn'

interface ActiveFiltersBarProps {
  filterOlderThan7Days: boolean
  onToggle7DaysFilter: () => void
  onClearAllFilters: () => void
  hasActiveFilters: boolean
  totalVisible: number
  totalRaw: number
}

export function ActiveFiltersBar({
  filterOlderThan7Days,
  onToggle7DaysFilter,
  onClearAllFilters,
  hasActiveFilters,
  totalVisible,
  totalRaw,
}: ActiveFiltersBarProps) {
  if (!hasActiveFilters && !filterOlderThan7Days) return null

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
      <Filter className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
      <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
        Active Filters:
      </span>

      {filterOlderThan7Days && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium">
          <Clock className="w-3 h-3" />
          7+ days only
          <button
            onClick={onToggle7DaysFilter}
            className="ml-1 hover:bg-blue-200 dark:hover:bg-blue-700 rounded-full p-0.5 transition-colors"
            title="Remove filter"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      )}

      {hasActiveFilters && (
        <button
          onClick={onClearAllFilters}
          className="ml-auto flex items-center gap-1 px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <X className="w-3 h-3" />
          Clear all
        </button>
      )}

      <span className="text-xs text-blue-600 dark:text-blue-400 ml-auto">
        Showing {totalVisible} of {totalRaw} jobs
      </span>
    </div>
  )
}