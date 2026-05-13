// src/components/scraper/ScraperResults.tsx
import { Save, XCircle, Filter, Sparkles, CheckSquare, Square } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { JobTable } from './JobTable'
import { cn } from '@/utils/cn'
import type { JobResult } from '@/types'

interface ScraperResultsProps {
  jobs: JobResult[]
  visibleJobs: JobResult[]
  selectedJobIds: Set<string>
  onSelectJob: (id: string) => void
  onSelectAll: () => void
  allSelected: boolean
  filterOlderThan7Days: boolean
  onToggle7DaysFilter: () => void
  onSaveAll: () => void
  onSaveSelected: () => void
  onClear: () => void
  isSaving: boolean
  currentPage: number
  totalJobs: number
  itemsPerPage: number
  onPageChange: (page: number) => void
}

export function ScraperResults({
  jobs,
  visibleJobs,
  selectedJobIds,
  onSelectJob,
  onSelectAll,
  allSelected,
  filterOlderThan7Days,
  onToggle7DaysFilter,
  onSaveAll,
  onSaveSelected,
  onClear,
  isSaving,
  currentPage,
  totalJobs,
  itemsPerPage,
  onPageChange,
}: ScraperResultsProps) {
  const visibleCount = visibleJobs.length
  const hiddenCount = jobs.length - visibleCount

  // ── All jobs hidden by age filter ──────────────────────────────────────────
  if (jobs.length > 0 && visibleCount === 0) {
    return (
      <Card className="border-amber-200 dark:border-amber-800/60">
        <CardBody>
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto mb-4">
              <Filter className="w-7 h-7 text-amber-500" />
            </div>
            <h3 className="text-base font-bold text-amber-800 dark:text-amber-300 mb-1">
              All jobs filtered by age
            </h3>
            <p className="text-sm text-amber-600 dark:text-amber-400/80 max-w-sm mx-auto">
              {filterOlderThan7Days
                ? `All ${jobs.length} job${jobs.length !== 1 ? 's' : ''} were posted within the last 7 days. Disable the "7+ days only" filter to see them.`
                : 'No jobs match the current filter criteria.'}
            </p>
            {filterOlderThan7Days && (
              <Button
                size="sm"
                variant="outline"
                onClick={onToggle7DaysFilter}
                className="mt-5 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
              >
                Show fresh jobs ({jobs.length})
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
    )
  }

  // ── Normal results view ────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Results header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Results</h2>

          {/* Visible count badge */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {visibleCount} visible
          </span>

          {/* Hidden by age filter badge */}
          {hiddenCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-medium">
              <Filter className="w-3 h-3" />
              {hiddenCount} filtered
            </span>
          )}

          {/* Selected badge */}
          {selectedJobIds.size > 0 && selectedJobIds.size < visibleCount && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium">
              {selectedJobIds.size} selected
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onSelectAll}
            leftIcon={
              allSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />
            }
            className="text-slate-600 dark:text-slate-400"
          >
            {allSelected ? 'Deselect' : 'Select all'}
          </Button>
          {selectedJobIds.size > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSaveSelected}
              isLoading={isSaving}
              leftIcon={<Save className="w-3.5 h-3.5" />}
              disabled={isSaving}
            >
              Save selected ({selectedJobIds.size})
            </Button>
          )}
          <Button
            size="sm"
            onClick={onSaveAll}
            isLoading={isSaving}
            disabled={isSaving || visibleCount === 0}
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-md"
          >
            Save all ({visibleCount})
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClear}
            leftIcon={<XCircle className="w-3.5 h-3.5" />}
            className="text-slate-400 hover:text-red-500"
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Job table card */}
      <Card className="overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
        <CardBody className="p-0">
          <JobTable
            jobs={jobs}
            currentPage={currentPage}
            totalJobs={totalJobs}
            itemsPerPage={itemsPerPage}
            onPageChange={onPageChange}
            selectedJobIds={selectedJobIds}
            onSelectJob={onSelectJob}
            onSelectAll={onSelectAll}
            allSelected={allSelected}
            filterOlderThan7Days={filterOlderThan7Days}
            onToggle7DaysFilter={onToggle7DaysFilter}
          />
        </CardBody>
      </Card>
    </div>
  )
}