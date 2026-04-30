// src/components/scraper/JobTable.tsx
import { useState, useMemo } from 'react'
import {
  ExternalLink,
  Mail,
  Phone,
  Building2,
  Calendar,
  MapPin,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Clock,
  Users,
  Award,
  Globe,
  Filter,
  X,
  ChevronDown,
  Calendar as CalendarIcon,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { JobResult } from '@/types'
import { cn } from '@/utils/cn'

interface JobTableProps {
  jobs: JobResult[]
  currentPage: number
  totalJobs: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  selectedJobIds?: Set<string>
  onSelectJob?: (jobId: string) => void
  onSelectAll?: () => void
  allSelected?: boolean
  filterOlderThan7Days?: boolean
}

type AgeFilterType = 'all' | 'today' | 'week' | 'month' | 'older' | 'custom'

// ─── Helper: Format days ago ──────────────────────────────────────────────────
const formatDaysAgo = (datePostedRaw: string): { text: string; color: string; days: number } => {
  if (!datePostedRaw) return { text: 'Unknown', color: 'text-slate-400', days: 0 }

  const date = new Date(datePostedRaw)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)

  const diffTime = today.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  let text = ''
  let color = ''

  if (diffDays === 0) { text = 'Today'; color = 'text-green-600 dark:text-green-400' }
  else if (diffDays === 1) { text = 'Yesterday'; color = 'text-emerald-600 dark:text-emerald-400' }
  else if (diffDays < 7) { text = `${diffDays} days ago`; color = 'text-emerald-600 dark:text-emerald-400' }
  else if (diffDays < 14) { text = `${diffDays} days ago`; color = 'text-yellow-600 dark:text-yellow-400' }
  else if (diffDays < 21) { text = '2 weeks ago'; color: 'text-orange-600 dark:text-orange-400' }
  else if (diffDays < 30) { text = '3 weeks ago'; color = 'text-orange-600 dark:text-orange-400' }
  else if (diffDays < 60) { text = '1 month ago'; color = 'text-red-600 dark:text-red-400' }
  else if (diffDays < 90) { text = '2 months ago'; color = 'text-red-600 dark:text-red-400' }
  else { text = `${Math.floor(diffDays / 30)} months ago`; color = 'text-red-600 dark:text-red-400' }

  return { text, color, days: diffDays }
}

// ─── Helper: Format work type ─────────────────────────────────────────────────
const formatWorkType = (workType: string | null | undefined): string => {
  if (!workType) return '—'
  const t = workType.toLowerCase().replace(/[^a-z]/g, '')
  if (t === 'fulltime' || t === 'full' || t === 'ft') return 'Full Time'
  if (t === 'parttime' || t === 'part' || t === 'pt') return 'Part Time'
  if (t === 'contracttemp' || t === 'contract' || t === 'temp' || t === 'temporary') return 'Contract'
  if (t === 'casualvacation' || t === 'casual' || t === 'vacation') return 'Casual'
  if (t === 'hybrid') return 'Hybrid'
  if (t === 'remote') return 'Remote'
  if (t === 'onsite' || t === 'onsiteinoffice') return 'On-site'
  return workType
    .split(/[\s/]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

// ─── Helper: Format company size ──────────────────────────────────────────────
const formatCompanySize = (size: string | null | undefined): string | null => {
  if (!size) return null
  const cleaned = size.replace(/employees/i, '').trim()
  if (!cleaned || cleaned === 'N/A') return null
  return `${cleaned} employees`
}

export function JobTable({
  jobs,
  currentPage,
  totalJobs,
  itemsPerPage,
  onPageChange,
  selectedJobIds = new Set(),
  onSelectJob,
  onSelectAll,
  allSelected = false,
  filterOlderThan7Days = true,
}: JobTableProps) {
  const [ageFilter, setAgeFilter] = useState<AgeFilterType>('all')
  const [customDays, setCustomDays] = useState<number>(30)
  const [showAgeFilter, setShowAgeFilter] = useState(false)
  const [customDateRange, setCustomDateRange] = useState<{ from: string; to: string }>({
    from: '',
    to: '',
  })

  const totalPages = Math.ceil(totalJobs / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage

  const getDaysBetween = (date: Date, referenceDate: Date = new Date()): number => {
    return Math.floor((referenceDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ✨ ENHANCED FILTERING — Now includes 7+ days filter
  // ═══════════════════════════════════════════════════════════════════════════
  const filteredJobs = useMemo(() => {
    let result = jobs

    // FIRST: Apply 7+ days filter if enabled
    if (filterOlderThan7Days) {
      result = result.filter((job) => {
        if (!job.datePostedRaw) return false
        const jobDate = new Date(job.datePostedRaw)
        jobDate.setHours(0, 0, 0, 0)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const daysOld = getDaysBetween(jobDate, today)
        return daysOld >= 7
      })
    }

    // SECOND: Apply additional age filters if set
    if (ageFilter === 'all' && !customDateRange.from && !customDateRange.to) {
      return result
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return result.filter((job) => {
      if (!job.datePostedRaw) return false
      const jobDate = new Date(job.datePostedRaw)
      jobDate.setHours(0, 0, 0, 0)
      const daysOld = getDaysBetween(jobDate, today)

      if (customDateRange.from) {
        const fromDate = new Date(customDateRange.from)
        fromDate.setHours(0, 0, 0, 0)
        if (jobDate < fromDate) return false
      }
      if (customDateRange.to) {
        const toDate = new Date(customDateRange.to)
        toDate.setHours(23, 59, 59, 999)
        if (jobDate > toDate) return false
      }

      switch (ageFilter) {
        case 'today': return daysOld === 0
        case 'week': return daysOld <= 7
        case 'month': return daysOld <= 30
        case 'older': return daysOld > 30
        case 'custom': return daysOld >= customDays
        default: return true
      }
    })
  }, [jobs, ageFilter, customDays, customDateRange, filterOlderThan7Days])

  const handleFilterChange = (newFilter: AgeFilterType) => {
    setAgeFilter(newFilter)
    if (newFilter !== 'custom') setCustomDateRange({ from: '', to: '' })
  }

  const clearFilters = () => {
    setAgeFilter('all')
    setCustomDays(30)
    setCustomDateRange({ from: '', to: '' })
  }

  const hasActiveFilters = ageFilter !== 'all' || !!customDateRange.from || !!customDateRange.to
  const filteredTotal = filteredJobs.length
  const currentFilteredJobs = filteredJobs.slice(0, itemsPerPage)
  const displayJobs = hasActiveFilters ? currentFilteredJobs : filteredJobs.slice(startIndex, startIndex + itemsPerPage)
  const displayTotal = filteredTotal
  const displayStartIndex = hasActiveFilters ? 1 : startIndex + 1
  const displayEndIndex = hasActiveFilters
    ? Math.min(itemsPerPage, filteredTotal)
    : Math.min(startIndex + itemsPerPage, filteredTotal)

  const openJobLink = (url: string) => {
    if (url && url !== '#' && url !== '') window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No Jobs Found</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Try searching for a different job title</p>
      </div>
    )
  }

  // Calculate how many jobs were filtered by the 7+ days rule
  const filteredBy7Days = filterOlderThan7Days ? jobs.length - filteredJobs.length : 0

  return (
    <div className="space-y-4">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ✨ 7+ DAYS FILTER STATUS BANNER                             */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {filterOlderThan7Days && filteredBy7Days > 0 && (
        <div className="relative overflow-hidden rounded-xl border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-purple-900/20 dark:via-slate-800 dark:to-pink-900/20 shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-purple-500/5" />
          <div className="relative px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-purple-900 dark:text-purple-100">
                7+ Days Filter Active
              </p>
              <p className="text-xs text-purple-700 dark:text-purple-300 mt-0.5">
                Filtered out {filteredBy7Days} fresh job{filteredBy7Days !== 1 ? 's' : ''} (posted within last 7 days) — 
                showing {filteredJobs.length} seasoned opportunities
              </p>
            </div>
            <div className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold shadow-md">
              {filteredJobs.length} shown
            </div>
          </div>
        </div>
      )}

      {/* Age Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-800/50 dark:via-slate-800/30 dark:to-slate-800/50 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-md">
        <button
          onClick={() => setShowAgeFilter(!showAgeFilter)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-all hover:scale-105',
            showAgeFilter || hasActiveFilters
              ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border-2 border-slate-200 dark:border-slate-600'
          )}
        >
          <Filter className="w-4 h-4" />
          <span>Additional Filters</span>
          <ChevronDown className={cn('w-3 h-3 transition-transform', showAgeFilter && 'rotate-180')} />
        </button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} leftIcon={<X className="w-3 h-3" />}>
            Clear Additional Filters
          </Button>
        )}

        {hasActiveFilters && (
          <span className="text-xs text-slate-500 ml-auto font-medium">
            Showing {displayJobs.length} of {displayTotal} jobs
          </span>
        )}
      </div>

      {/* Expanded Filter Panel */}
      {showAgeFilter && (
        <div className="p-4 bg-gradient-to-br from-white via-slate-50 to-white dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700 space-y-4 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Quick Filters</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { v: 'all', label: 'All Jobs', color: 'blue' },
                  { v: 'today', label: 'Today', color: 'green' },
                  { v: 'week', label: 'Last 7 Days', color: 'yellow' },
                  { v: 'month', label: 'Last 30 Days', color: 'orange' },
                  { v: 'older', label: 'Older 30d', color: 'red' },
                ].map(({ v, label, color }) => (
                  <button
                    key={v}
                    onClick={() => handleFilterChange(v as AgeFilterType)}
                    className={cn(
                      'px-3 py-2 text-xs rounded-xl transition-all font-semibold border-2 hover:scale-105',
                      ageFilter === v
                        ? `bg-gradient-to-r from-${color}-500 to-${color}-600 border-${color}-400 text-white shadow-lg`
                        : `bg-white dark:bg-slate-800 border-${color}-200 dark:border-${color}-900 text-${color}-700 dark:text-${color}-300 hover:border-${color}-300`
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Custom Days Old</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={customDays}
                  onChange={(e) => setCustomDays(parseInt(e.target.value) || 0)}
                  className="w-24 px-3 py-2 text-sm rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-sm text-slate-500 font-medium">days or older</span>
                <Button variant="outline" size="sm" onClick={() => handleFilterChange('custom')} disabled={ageFilter === 'custom'}>
                  Apply
                </Button>
              </div>
            </div>

            <div className="space-y-2 col-span-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Date Range</label>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={customDateRange.from}
                    onChange={(e) => { setCustomDateRange((p) => ({ ...p, from: e.target.value })); setAgeFilter('all') }}
                    className="px-3 py-2 text-sm rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-500 font-medium">to</span>
                  <input
                    type="date"
                    value={customDateRange.to}
                    onChange={(e) => { setCustomDateRange((p) => ({ ...p, to: e.target.value })); setAgeFilter('all') }}
                    className="px-3 py-2 text-sm rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="text-sm text-slate-600 dark:text-slate-400 font-medium flex items-center gap-2">
        Showing {displayStartIndex}–{displayEndIndex} of {displayTotal} jobs
        {(hasActiveFilters || filterOlderThan7Days) && (
          <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full text-xs font-bold shadow-md">
            filtered from {totalJobs} total
          </span>
        )}
      </div>

      {/* Jobs Table */}
      <div className="overflow-x-auto border-2 border-slate-200 dark:border-slate-700 rounded-xl shadow-lg">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 sticky top-0">
            <tr className="border-b-2 border-slate-200 dark:border-slate-700">
              {onSelectJob && (
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected && jobs.length > 0}
                    onChange={onSelectAll}
                    className="rounded border-slate-300"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Company</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Job Title</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Posted</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Age</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Location</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Salary</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Work Type</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Co. Size</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Website</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Contact</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
            {displayJobs.map((job, idx) => {
              const daysAgoInfo = formatDaysAgo(job.datePostedRaw)
              const workTypeLabel = formatWorkType(job.workType)
              const companySizeLabel = formatCompanySize(job.companySize)

              return (
                <tr
                  key={job.id || idx}
                  className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:via-indigo-50/30 hover:to-blue-50/50 dark:hover:from-blue-900/10 dark:hover:via-indigo-900/5 dark:hover:to-blue-900/10 transition-all"
                >
                  {onSelectJob && (
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedJobIds.has(job.id)}
                        onChange={() => onSelectJob(job.id)}
                        className="rounded border-slate-300"
                      />
                    </td>
                  )}

                  {/* ── Company ──────────────────────────────────────────── */}
                  <td className="px-4 py-3 min-w-[160px]">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        {job.companyLogo ? (
                          <img
                            src={job.companyLogo}
                            alt={job.companyName}
                            className="w-5 h-5 rounded object-contain shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        ) : (
                          <Building2 className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                        )}
                        <span className="font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                          {job.companyName}
                        </span>
                        {job.isVerified && (
                          <span className="inline-flex shrink-0" title="Verified employer">
                            <Award className="w-3 h-3 text-blue-500" />
                          </span>
                        )}
                      </div>
                      {companySizeLabel && (
                        <span className="text-xs text-slate-400 ml-6 flex items-center gap-1">
                          <Users className="w-2.5 h-2.5" />
                          {companySizeLabel}
                        </span>
                      )}
                      {job.companyIndustry && (
                        <span className="text-xs text-slate-400 ml-6 truncate max-w-[160px]">
                          {job.companyIndustry}
                        </span>
                      )}
                      {job.contactName && (
                        <span className="text-xs text-indigo-600 dark:text-indigo-400 ml-6 flex items-center gap-1">
                          <User className="w-2.5 h-2.5" />
                          {job.contactName}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* ── Job Title ─────────────────────────────────────────── */}
                  <td className="px-4 py-3 min-w-[180px]">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-700 dark:text-slate-300 leading-tight">
                          {job.jobTitle}
                        </span>
                      </div>
                      {(job.subClassification || job.classification) && (
                        <span className="text-xs text-slate-400 ml-4.5 ml-5">
                          {job.subClassification || job.classification}
                        </span>
                      )}
                      {job.workArrangement && (
                        <span className="text-xs text-slate-400 ml-5">
                          {job.workArrangement}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* ── Posted date ───────────────────────────────────────── */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs">
                      <Calendar className="w-3 h-3 shrink-0" />
                      {job.datePosted}
                    </div>
                  </td>

                  {/* ── Age ───────────────────────────────────────────────── */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className={cn('text-xs font-semibold', daysAgoInfo.color)}>
                        {daysAgoInfo.text}
                      </span>
                    </div>
                  </td>

                  {/* ── Location ──────────────────────────────────────────── */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 text-xs">
                        <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                        <span className="font-medium">{job.city}</span>
                      </div>
                      {job.state && (
                        <span className="text-xs text-slate-400 ml-4">{job.state}</span>
                      )}
                    </div>
                  </td>

                  {/* ── Salary ────────────────────────────────────────────── */}
                  <td className="px-4 py-3 min-w-[120px]">
                    {job.salary ? (
                      <div className="flex items-start gap-1">
                        <DollarSign className="w-3 h-3 text-green-600 shrink-0 mt-0.5" />
                        <span className="text-xs text-green-700 dark:text-green-400 leading-tight font-medium">
                          {job.salary}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>

                  {/* ── Work Type ─────────────────────────────────────────── */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {workTypeLabel !== '—' ? (
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold shadow-sm',
                        workTypeLabel === 'Full Time'
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                          : workTypeLabel === 'Part Time'
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                          : workTypeLabel === 'Contract'
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                          : workTypeLabel === 'Casual'
                          ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      )}>
                        {workTypeLabel}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>

                  {/* ── Company Size ──────────────────────────────────────── */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                        {companySizeLabel || '—'}
                      </span>
                    </div>
                  </td>

                  {/* ── Company Website ───────────────────────────────────── */}
                  <td className="px-4 py-3">
                    {job.companyWebsite ? (
                      <a
                        href={job.companyWebsite.startsWith('http') ? job.companyWebsite : `https://${job.companyWebsite}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline text-xs font-medium transition-colors"
                        title={job.companyWebsite}
                      >
                        <Globe className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[120px]">
                          {job.companyWebsite
                            .replace(/^https?:\/\//i, '')
                            .replace(/^www\./i, '')
                            .replace(/\/$/, '')}
                        </span>
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>

                  {/* ── Contact Info ──────────────────────────────────────── */}
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {job.emails.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {job.emails.slice(0, 2).map((email, i) => (
                            <a
                              key={i}
                              href={`mailto:${email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-md text-xs font-medium hover:from-blue-600 hover:to-indigo-600 transition-all shadow-sm"
                              title={email}
                            >
                              <Mail className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate max-w-[110px]">{email}</span>
                            </a>
                          ))}
                          {job.emails.length > 2 && (
                            <span className="text-xs text-slate-400 font-bold">+{job.emails.length - 2}</span>
                          )}
                        </div>
                      )}
                      {job.phones.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {job.phones.slice(0, 2).map((phone, i) => (
                            <a
                              key={i}
                              href={`tel:${phone.replace(/\s/g, '')}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-md text-xs font-medium hover:from-emerald-600 hover:to-teal-600 transition-all shadow-sm"
                            >
                              <Phone className="w-2.5 h-2.5 shrink-0" />
                              <span>{phone}</span>
                            </a>
                          ))}
                          {job.phones.length > 2 && (
                            <span className="text-xs text-slate-400 font-bold">+{job.phones.length - 2}</span>
                          )}
                        </div>
                      )}
                      {job.emails.length === 0 && job.phones.length === 0 && (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>
                  </td>

                  {/* ── Actions ───────────────────────────────────────────── */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 items-center">
                      {job.jobLink && job.jobLink !== '#' ? (
                        <button
                          onClick={() => openJobLink(job.jobLink)}
                          className="inline-flex items-center gap-1 px-3 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:bg-blue-900/20 rounded-lg transition-all font-medium shadow-sm hover:shadow-md"
                          title="View job ad"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span className="text-xs">View</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && !hasActiveFilters && (
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            leftIcon={<ChevronLeft className="w-4 h-4" />}
            className="border-2 hover:shadow-md transition-all"
          >
            Previous
          </Button>
          <span className="text-sm text-slate-600 dark:text-slate-400 font-semibold">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            rightIcon={<ChevronRight className="w-4 h-4" />}
            className="border-2 hover:shadow-md transition-all"
          >
            Next
          </Button>
        </div>
      )}

      {(hasActiveFilters || filterOlderThan7Days) && displayJobs.length === 0 && (
        <div className="text-center py-12 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-lg">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center mx-auto mb-4">
            <Filter className="w-8 h-8 text-slate-500 dark:text-slate-400" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-semibold mb-2">No jobs match your filter criteria</p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mb-4">Try adjusting your filters or clearing them</p>
          <button 
            onClick={clearFilters} 
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  )
}