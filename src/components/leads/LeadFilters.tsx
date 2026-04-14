// src/components/leads/LeadFilters.tsx
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useFilters } from '@/hooks/useFilters'
import { CITIES, PLATFORMS } from '@/utils/constants'
import type { LeadStatus } from '@/types'

export function LeadFilters() {
  const { filters, setFilter, clearFilters } = useFilters()

  const hasActiveFilters =
    filters.platform !== 'all' ||
    filters.city !== 'all' ||
    (filters.status && filters.status !== 'all') ||
    filters.enrichmentStatus !== 'all' ||
    (filters.response && filters.response !== 'all') ||
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

      {/* City */}
      <Select
        value={filters.city ?? 'all'}
        onChange={(e) => setFilter('city', e.target.value as any)}
        options={[
          { value: 'all', label: 'All Cities' },
          ...CITIES.map((c) => ({ value: c, label: c })),
        ]}
        containerClassName="min-w-[140px]"
      />

      {/* Email Status Filter - UPDATED with all statuses */}
      <Select
        value={filters.status ?? 'all'}
        onChange={(e) => setFilter('status', e.target.value as LeadStatus | 'all')}
        options={[
          { value: 'all', label: 'All Email Status' },
          { value: 'Not Sent', label: '📧 Not Sent' },
          { value: 'Email 1', label: '📧 Email 1 Sent' },
          { value: 'Email 2', label: '📧 Email 2 Sent' },
          { value: 'Email 3', label: '📧 Email 3 Sent' },
          { value: 'Closed', label: '🔒 Closed' },
          { value: 'Sequence Closed', label: '✅ Sequence Closed' },
        ]}
        containerClassName="min-w-[160px]"
      />

      {/* Response Filter */}
      <Select
        value={filters.response ?? 'all'}
        onChange={(e) => setFilter('response', e.target.value as 'positive' | 'negative' | 'none' | 'all')}
        options={[
          { value: 'all', label: 'All Responses' },
          { value: 'positive', label: '👍 Positive' },
          { value: 'negative', label: '👎 Negative' },
          { value: 'none', label: '⚪ No Response' },
        ]}
        containerClassName="min-w-[150px]"
      />

      {/* Enrichment Status */}
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