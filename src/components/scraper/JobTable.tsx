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
  else if (diffDays < 21) { text = '2 weeks ago'; color = 'text-orange-600 dark:text-orange-400' }
  else if (diffDays < 30) { text = '3 weeks ago'; color = 'text-orange-600 dark:text-orange-400' }
  else if (diffDays < 60) { text = '1 month ago'; color = 'text-red-600 dark:text-red-400' }
  else if (diffDays < 90) { text = '2 months ago'; color = 'text-red-600 dark:text-red-400' }
  else { text = `${Math.floor(diffDays / 30)} months ago`; color = 'text-red-600 dark:text-red-400' }

  return { text, color, days: diffDays }
}

// ─── Helper: Format work type ─────────────────────────────────────────────────
// FIX: Apify returns values like "Full time", "Contract/Temp", "Part time"
// with various capitalizations and formats — normalize all of them.
const formatWorkType = (workType: string | null | undefined): string => {
  if (!workType) return '—'
  const t = workType.toLowerCase().replace(/[^a-z]/g, '') // strip spaces, slashes etc.
  if (t === 'fulltime' || t === 'full' || t === 'ft') return 'Full Time'
  if (t === 'parttime' || t === 'part' || t === 'pt') return 'Part Time'
  if (t === 'contracttemp' || t === 'contract' || t === 'temp' || t === 'temporary') return 'Contract'
  if (t === 'casualvacation' || t === 'casual' || t === 'vacation') return 'Casual'
  if (t === 'hybrid') return 'Hybrid'
  if (t === 'remote') return 'Remote'
  if (t === 'onsite' || t === 'onsiteinoffice') return 'On-site'
  // Fallback: capitalize each word in original string
  return workType
    .split(/[\s/]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

// ─── Helper: Format company size ──────────────────────────────────────────────
// Apify returns sizes like "51-200 employees", "1-50", "201-500 Employees"
// Normalize to clean readable format.
const formatCompanySize = (size: string | null | undefined): string | null => {
  if (!size) return null
  // Already clean (e.g. "51-200 employees") — just ensure consistent capitalisation
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

  const filteredJobs = useMemo(() => {
    if (ageFilter === 'all' && !customDateRange.from && !customDateRange.to) return jobs

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return jobs.filter((job) => {
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
  }, [jobs, ageFilter, customDays, customDateRange])

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
  const displayJobs = hasActiveFilters ? currentFilteredJobs : jobs.slice(startIndex, startIndex + itemsPerPage)
  const displayTotal = hasActiveFilters ? filteredTotal : totalJobs
  const displayStartIndex = hasActiveFilters ? 1 : startIndex + 1
  const displayEndIndex = hasActiveFilters
    ? Math.min(itemsPerPage, filteredTotal)
    : Math.min(startIndex + itemsPerPage, totalJobs)

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

  return (
    <div className="space-y-4">
      {/* Age Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setShowAgeFilter(!showAgeFilter)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
            showAgeFilter || hasActiveFilters
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
          )}
        >
          <Filter className="w-4 h-4" />
          <span>Filter by Age</span>
          <ChevronDown className={cn('w-3 h-3 transition-transform', showAgeFilter && 'rotate-180')} />
        </button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} leftIcon={<X className="w-3 h-3" />}>
            Clear Filters
          </Button>
        )}

        {hasActiveFilters && (
          <span className="text-xs text-slate-500 ml-auto">
            Showing {displayJobs.length} of {displayTotal} jobs
          </span>
        )}
      </div>

      {/* Expanded Filter Panel */}
      {showAgeFilter && (
        <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Quick Filters</label>
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
                      'px-3 py-1.5 text-xs rounded-full transition-colors',
                      ageFilter === v
                        ? `bg-${color}-600 text-white`
                        : `bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-300 hover:bg-${color}-200`
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Custom Days Old</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={customDays}
                  onChange={(e) => setCustomDays(parseInt(e.target.value) || 0)}
                  className="w-24 px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-500">days or older</span>
                <Button variant="outline" size="sm" onClick={() => handleFilterChange('custom')} disabled={ageFilter === 'custom'}>
                  Apply
                </Button>
              </div>
            </div>

            <div className="space-y-2 col-span-1 md:col-span-2">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Date Range</label>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={customDateRange.from}
                    onChange={(e) => { setCustomDateRange((p) => ({ ...p, from: e.target.value })); setAgeFilter('all') }}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-500">to</span>
                  <input
                    type="date"
                    value={customDateRange.to}
                    onChange={(e) => { setCustomDateRange((p) => ({ ...p, to: e.target.value })); setAgeFilter('all') }}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="text-sm text-slate-500 dark:text-slate-400">
        Showing {displayStartIndex}–{displayEndIndex} of {displayTotal} jobs
        {hasActiveFilters && <span className="ml-2 text-blue-600">(filtered from {totalJobs} total)</span>}
      </div>

      {/* Jobs Table */}
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
            <tr className="border-b border-slate-200 dark:border-slate-700">
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
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Company</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Job Title</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Posted</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Age</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Location</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Salary</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Work Type</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Co. Size</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Website</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Contact</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wide">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {displayJobs.map((job, idx) => {
              const daysAgoInfo = formatDaysAgo(job.datePostedRaw)
              const workTypeLabel = formatWorkType(job.workType)
              const companySizeLabel = formatCompanySize(job.companySize)

              return (
                <tr
                  key={job.id || idx}
                  className="hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors"
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
                      {/* Company size — only shown if we have real data */}
                      {companySizeLabel && (
                        <span className="text-xs text-slate-400 ml-6 flex items-center gap-1">
                          <Users className="w-2.5 h-2.5" />
                          {companySizeLabel}
                        </span>
                      )}
                      {/* Industry */}
                      {job.companyIndustry && (
                        <span className="text-xs text-slate-400 ml-6 truncate max-w-[160px]">
                          {job.companyIndustry}
                        </span>
                      )}
                      {/* FIX: Only show contactName if it's a real person name (validated in useScraper) */}
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
                      {/* Work arrangement (On-site / Hybrid / Remote) */}
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
                        <span className="text-xs text-green-700 dark:text-green-400 leading-tight">
                          {job.salary}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>

                  {/* ── Work Type ─────────────────────────────────────────── */}
                  {/* FIX: Full label "Full Time" not "F" */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {workTypeLabel !== '—' ? (
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold',
                        workTypeLabel === 'Full Time'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : workTypeLabel === 'Part Time'
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : workTypeLabel === 'Contract'
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                          : workTypeLabel === 'Casual'
                          ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      )}>
                        {workTypeLabel}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>

                  {/* ── Company Size ──────────────────────────────────────── */}
                  {/* FIX: sanitized in useScraper — no more "N/A" here */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        {companySizeLabel || '—'}
                      </span>
                    </div>
                  </td>

                  {/* ── Company Website ───────────────────────────────────── */}
                  {/* FIX: "N/A" is sanitized to null in useScraper */}
                  <td className="px-4 py-3">
                    {job.companyWebsite ? (
                      <a
                        href={job.companyWebsite.startsWith('http') ? job.companyWebsite : `https://${job.companyWebsite}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-xs"
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
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs hover:underline border border-blue-100 dark:border-blue-800"
                              title={email}
                            >
                              <Mail className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate max-w-[110px]">{email}</span>
                            </a>
                          ))}
                          {job.emails.length > 2 && (
                            <span className="text-xs text-slate-400 font-medium">+{job.emails.length - 2}</span>
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
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded text-xs hover:underline border border-emerald-100 dark:border-emerald-800"
                            >
                              <Phone className="w-2.5 h-2.5 shrink-0" />
                              <span>{phone}</span>
                            </a>
                          ))}
                          {job.phones.length > 2 && (
                            <span className="text-xs text-slate-400 font-medium">+{job.phones.length - 2}</span>
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
                          className="inline-flex items-center gap-1 px-2 py-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="View job ad"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">View</span>
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
          >
            Previous
          </Button>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            rightIcon={<ChevronRight className="w-4 h-4" />}
          >
            Next
          </Button>
        </div>
      )}

      {hasActiveFilters && displayJobs.length === 0 && (
        <div className="text-center py-8">
          <p className="text-slate-500 dark:text-slate-400">No jobs match your filter criteria</p>
          <button onClick={clearFilters} className="mt-2 text-blue-600 hover:text-blue-700 text-sm">
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}