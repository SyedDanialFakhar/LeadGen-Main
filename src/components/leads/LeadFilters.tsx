// src/components/leads/LeadFilters.tsx
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useFilters } from '@/hooks/useFilters'
import { CITIES, PLATFORMS } from '@/utils/constants'

export function LeadFilters() {
  const { filters, setFilter, clearFilters } = useFilters()

  const hasActiveFilters =
    filters.platform !== 'all' ||
    filters.city !== 'all' ||
    filters.status !== 'all' ||
    filters.enrichmentStatus !== 'all' ||
    // filters.followUpOnly ||
    !!filters.search

  return (
    <div className="flex flex-wrap items-end gap-3 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
      {/* Search */}
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder="Search company, contact..."
          value={filters.search ?? ''}
          onChange={(e) => setFilter('search', e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Platform */}
      <Select
        value={filters.platform ?? 'all'}
        onChange={(e) => setFilter('platform', e.target.value as any)}
        options={[
          { value: 'all', label: 'All Platforms' },
          ...PLATFORMS.map((p) => ({
            value: p,
            label: p === 'seek' ? 'Seek' : 'LinkedIn',
          })),
        ]}
        containerClassName="min-w-[140px]"
      />

      {/* City - Now uses ilike for substring matching */}
      <Select
        value={filters.city ?? 'all'}
        onChange={(e) => setFilter('city', e.target.value as any)}
        options={[
          { value: 'all', label: 'All Cities' },
          ...CITIES.map((c) => ({ value: c, label: c })),
        ]}
        containerClassName="min-w-[140px]"
      />

      {/* Status */}
      <Select
        value={filters.status ?? 'all'}
        onChange={(e) => setFilter('status', e.target.value as any)}
        options={[
          { value: 'all', label: 'All Statuses' },
          { value: 'new', label: 'New' },
          // { value: 'assessed', label: 'Assessed' },
          { value: 'called', label: 'Called' },
          { value: 'converted', label: 'Converted' },
          { value: 'closed', label: 'Closed' },
        ]}
        containerClassName="min-w-[140px]"
      />

      {/* Enrichment */}
      <Select
        value={filters.enrichmentStatus ?? 'all'}
        onChange={(e) => setFilter('enrichmentStatus', e.target.value as any)}
        options={[
          { value: 'all', label: 'All Enrichment' },
          { value: 'pending', label: 'Pending' },
          { value: 'enriched', label: 'Enriched' },
          { value: 'not_found', label: 'Not Found' },
          { value: 'failed', label: 'Failed' },
        ]}
        containerClassName="min-w-[150px]"
      />

      {/* Follow-up toggle */}
      {/* <button
        onClick={() => setFilter('followUpOnly', !filters.followUpOnly)}
        className={`
          px-3 py-2 rounded-lg text-sm font-medium border transition-colors
          ${
            filters.followUpOnly
              ? 'bg-orange-500 text-white border-orange-500'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
          }
        `}
      >
        Follow-up Only
      </button> */}

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          leftIcon={<X className="w-4 h-4" />}
        >
          Clear
        </Button>
      )}
    </div>
  )
}