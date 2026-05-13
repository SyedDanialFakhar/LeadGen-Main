// src/components/scraper/JobTable.tsx
import { useState, useMemo } from 'react'
import {
  ExternalLink, Mail, Phone, Building2, Calendar, MapPin,
  Briefcase, ChevronLeft, ChevronRight, DollarSign, Clock,
  Users, Award, Globe, Filter, X, ChevronDown,
  Calendar as CalendarIcon, User,
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
  onToggle7DaysFilter?: () => void
}

type AgeFilterType = 'all' | 'today' | 'week' | 'month' | 'older' | 'custom'

// ─── Helper: Format days ago ──────────────────────────────────────────────────
const formatDaysAgo = (datePostedRaw: string): { text: string; color: string; days: number } => {
  if (!datePostedRaw) return { text: 'Unknown', color: 'text-slate-400', days: 0 }

  const date  = new Date(datePostedRaw)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)

  const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  let text  = ''
  let color = ''

  if (diffDays === 0)      { text = 'Today';         color = 'text-green-600 dark:text-green-400' }
  else if (diffDays === 1) { text = 'Yesterday';     color = 'text-emerald-600 dark:text-emerald-400' }
  else if (diffDays < 7)   { text = `${diffDays}d ago`; color = 'text-emerald-600 dark:text-emerald-400' }
  else if (diffDays < 14)  { text = `${diffDays}d ago`; color = 'text-yellow-600 dark:text-yellow-400' }
  else if (diffDays < 21)  { text = '2 weeks ago';  color = 'text-orange-600 dark:text-orange-400' }
  else if (diffDays < 30)  { text = '3 weeks ago';  color = 'text-orange-600 dark:text-orange-400' }
  else if (diffDays < 60)  { text = '1 month ago';  color = 'text-red-600 dark:text-red-400' }
  else if (diffDays < 90)  { text = '2 months ago'; color = 'text-red-600 dark:text-red-400' }
  else { text = `${Math.floor(diffDays / 30)}mo ago`; color = 'text-red-600 dark:text-red-400' }

  return { text, color, days: diffDays }
}

// ─── Helper: Format work type ─────────────────────────────────────────────────
const formatWorkType = (workType: string | null | undefined): string => {
  if (!workType) return '—'
  const t = workType.toLowerCase().replace(/[^a-z]/g, '')
  if (t === 'fulltime' || t === 'full' || t === 'ft')                return 'Full Time'
  if (t === 'parttime' || t === 'part' || t === 'pt')                return 'Part Time'
  if (t === 'contracttemp' || t === 'contract' || t === 'temp' || t === 'temporary') return 'Contract'
  if (t === 'casualvacation' || t === 'casual' || t === 'vacation')  return 'Casual'
  if (t === 'hybrid')                                                  return 'Hybrid'
  if (t === 'remote')                                                  return 'Remote'
  if (t === 'onsite' || t === 'onsiteinoffice')                       return 'On-site'
  return workType.split(/[\s/]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

// ─── Helper: Format company size ──────────────────────────────────────────────
const formatCompanySize = (size: string | null | undefined): string | null => {
  if (!size) return null
  const cleaned = size.replace(/employees/i, '').trim()
  if (!cleaned || cleaned === 'N/A') return null
  return `${cleaned} emp.`
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
  onToggle7DaysFilter,
}: JobTableProps) {
  const [ageFilter,        setAgeFilter]       = useState<AgeFilterType>('all')
  const [customDays,       setCustomDays]       = useState<number>(30)
  const [showAgeFilter,    setShowAgeFilter]    = useState(false)
  const [customDateRange,  setCustomDateRange]  = useState<{ from: string; to: string }>({ from: '', to: '' })

  const totalPages  = Math.ceil(totalJobs / itemsPerPage)
  const startIndex  = (currentPage - 1) * itemsPerPage

  const getDaysBetween = (date: Date, ref: Date = new Date()): number => {
    const d1 = new Date(date); d1.setHours(0, 0, 0, 0)
    const d2 = new Date(ref);  d2.setHours(0, 0, 0, 0)
    return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
  }

  // ─── Filtering ──────────────────────────────────────────────────────────────
  const filteredJobs = useMemo(() => {
    let result = [...jobs]

    // 1. 7+ days filter (from parent toggle)
    if (filterOlderThan7Days) {
      result = result.filter((job) => {
        if (!job.datePostedRaw) return false
        return getDaysBetween(new Date(job.datePostedRaw)) >= 7
      })
    }

    // 2. Additional age filters
    if (ageFilter === 'all' && !customDateRange.from && !customDateRange.to) return result

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return result.filter((job) => {
      if (!job.datePostedRaw) return false
      const jobDate = new Date(job.datePostedRaw)
      jobDate.setHours(0, 0, 0, 0)
      const daysOld = getDaysBetween(jobDate, today)

      if (customDateRange.from) {
        const fromDate = new Date(customDateRange.from); fromDate.setHours(0, 0, 0, 0)
        if (jobDate < fromDate) return false
      }
      if (customDateRange.to) {
        const toDate = new Date(customDateRange.to); toDate.setHours(23, 59, 59, 999)
        if (jobDate > toDate) return false
      }

      switch (ageFilter) {
        case 'today':  return daysOld === 0
        case 'week':   return daysOld <= 7
        case 'month':  return daysOld <= 30
        case 'older':  return daysOld > 30
        case 'custom': return daysOld >= customDays
        default:       return true
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

  const hasActiveFilters   = ageFilter !== 'all' || !!customDateRange.from || !!customDateRange.to
  const filteredTotal      = filteredJobs.length
  const displayJobs        = hasActiveFilters
    ? filteredJobs.slice(0, itemsPerPage)
    : filteredJobs.slice(startIndex, startIndex + itemsPerPage)
  const displayTotal       = filteredTotal
  const displayStartIndex  = hasActiveFilters ? 1 : startIndex + 1
  const displayEndIndex    = hasActiveFilters
    ? Math.min(itemsPerPage, filteredTotal)
    : Math.min(startIndex + itemsPerPage, filteredTotal)
  const filteredBy7Days    = filterOlderThan7Days ? jobs.length - filteredJobs.length : 0

  const openJobLink = (url: string) => {
    if (url && url !== '#' && url !== '') window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <p className="text-base font-medium text-slate-600 dark:text-slate-400">No jobs found</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Try a different job title</p>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40">
        {/* 7+ days toggle */}
        <button
          onClick={onToggle7DaysFilter}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
            filterOlderThan7Days
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600 hover:border-blue-400'
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          7+ days only
          {filterOlderThan7Days && <span className="opacity-80 font-bold">· ON</span>}
        </button>

        {/* Additional filters toggle */}
        <button
          onClick={() => setShowAgeFilter(!showAgeFilter)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border',
            showAgeFilter || hasActiveFilters
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-indigo-400'
          )}
        >
          <Filter className="w-3.5 h-3.5" />
          More filters
          <ChevronDown className={cn('w-3 h-3 transition-transform', showAgeFilter && 'rotate-180')} />
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <X className="w-3 h-3" /> Clear filters
          </button>
        )}

        {/* Info: hidden by 7-day filter */}
        {filterOlderThan7Days && filteredBy7Days > 0 && (
          <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
            {filteredBy7Days} fresh job{filteredBy7Days !== 1 ? 's' : ''} hidden
          </span>
        )}

        {/* Active filter count */}
        {hasActiveFilters && (
          <span className="ml-auto text-xs text-slate-500">
            Showing {displayJobs.length} of {displayTotal}
          </span>
        )}
      </div>

      {/* ── Expanded filter panel ─────────────────────────────────────────── */}
      {showAgeFilter && (
        <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Quick filters */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quick filters</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { v: 'all',   label: 'All jobs' },
                  { v: 'today', label: 'Today' },
                  { v: 'week',  label: 'Last 7 days' },
                  { v: 'month', label: 'Last 30 days' },
                  { v: 'older', label: 'Older 30d' },
                ].map(({ v, label }) => (
                  <button
                    key={v}
                    onClick={() => handleFilterChange(v as AgeFilterType)}
                    className={cn(
                      'px-2.5 py-1.5 text-xs rounded-lg border-2 font-semibold transition-all',
                      ageFilter === v
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom days */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Custom age</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={customDays}
                  onChange={(e) => setCustomDays(parseInt(e.target.value) || 0)}
                  className="w-20 px-3 py-1.5 text-sm rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-500">days or older</span>
                <Button variant="outline" size="sm" onClick={() => handleFilterChange('custom')} disabled={ageFilter === 'custom'}>
                  Apply
                </Button>
              </div>
            </div>

            {/* Date range */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date range</p>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="date"
                  value={customDateRange.from}
                  onChange={(e) => { setCustomDateRange((p) => ({ ...p, from: e.target.value })); setAgeFilter('all') }}
                  className="px-2.5 py-1.5 text-xs rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  value={customDateRange.to}
                  onChange={(e) => { setCustomDateRange((p) => ({ ...p, to: e.target.value })); setAgeFilter('all') }}
                  className="px-2.5 py-1.5 text-xs rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Results count ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Showing {displayStartIndex}–{displayEndIndex} of {displayTotal} jobs
        </span>
        {(hasActiveFilters || filterOlderThan7Days) && (
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full text-xs font-semibold">
            filtered from {totalJobs}
          </span>
        )}
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
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
              {[
                'Company', 'Job Title', 'Posted', 'Age',
                'Location', 'Salary', 'Work Type', 'Co. Size',
                'Website', 'Contact', 'Link',
              ].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
            {displayJobs.map((job, idx) => {
              const daysAgoInfo      = formatDaysAgo(job.datePostedRaw)
              const workTypeLabel    = formatWorkType(job.workType)
              const companySizeLabel = formatCompanySize(job.companySize)

              return (
                <tr
                  key={job.id || idx}
                  className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
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

                  {/* Company */}
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
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm leading-tight">
                          {job.companyName}
                        </span>
                        {/* ✅ FIX: Lucide v0.383+ dropped `title` prop from SVG types.
                             Wrap in a <span> with title instead. */}
                        {job.isVerified && (
                          <span title="Verified" className="inline-flex shrink-0">
                            <Award className="w-3 h-3 text-blue-500" />
                          </span>
                        )}
                      </div>
                      {job.companyIndustry && (
                        <span className="text-xs text-slate-400 ml-6 truncate max-w-[150px]">
                          {job.companyIndustry}
                        </span>
                      )}
                      {job.contactName && (
                        <span className="text-xs text-indigo-500 dark:text-indigo-400 ml-6 flex items-center gap-1">
                          <User className="w-2.5 h-2.5" />
                          {job.contactName}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Job Title */}
                  <td className="px-4 py-3 min-w-[180px]">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-700 dark:text-slate-300 text-sm leading-tight">
                          {job.jobTitle}
                        </span>
                      </div>
                      {(job.subClassification || job.classification) && (
                        <span className="text-xs text-slate-400 ml-5">
                          {job.subClassification || job.classification}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Posted */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs">
                      <Calendar className="w-3 h-3 shrink-0" />
                      {job.datePosted}
                    </div>
                  </td>

                  {/* Age */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                      <span className={cn('text-xs font-semibold', daysAgoInfo.color)}>
                        {daysAgoInfo.text}
                      </span>
                    </div>
                  </td>

                  {/* Location */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 text-xs">
                      <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                      <div>
                        <span className="font-medium">{job.city}</span>
                        {job.state && <span className="text-slate-400 ml-1">{job.state}</span>}
                      </div>
                    </div>
                  </td>

                  {/* Salary */}
                  <td className="px-4 py-3 min-w-[110px]">
                    {job.salary ? (
                      <div className="flex items-start gap-1">
                        <DollarSign className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium leading-tight">
                          {job.salary}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>

                  {/* Work Type */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {workTypeLabel !== '—' ? (
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold',
                        workTypeLabel === 'Full Time'  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : workTypeLabel === 'Part Time' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                        : workTypeLabel === 'Contract'  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                        : workTypeLabel === 'Casual'    ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      )}>
                        {workTypeLabel}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>

                  {/* Company Size */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">{companySizeLabel || '—'}</span>
                    </div>
                  </td>

                  {/* Website */}
                  <td className="px-4 py-3">
                    {job.companyWebsite ? (
                      <a
                        href={job.companyWebsite.startsWith('http') ? job.companyWebsite : `https://${job.companyWebsite}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline text-xs"
                      >
                        <Globe className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[100px]">
                          {job.companyWebsite.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '')}
                        </span>
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>

                  {/* Contact */}
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {job.emails.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {job.emails.slice(0, 2).map((email, i) => (
                            <a
                              key={i}
                              href={`mailto:${email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors shadow-sm"
                            >
                              <Mail className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate max-w-[100px]">{email}</span>
                            </a>
                          ))}
                          {job.emails.length > 2 && (
                            <span className="text-xs text-slate-400 font-bold">+{job.emails.length - 2}</span>
                          )}
                        </div>
                      )}
                      {job.phones.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {job.phones.slice(0, 1).map((phone, i) => (
                            <a
                              key={i}
                              href={`tel:${phone.replace(/\s/g, '')}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                            >
                              <Phone className="w-2.5 h-2.5 shrink-0" />
                              <span>{phone}</span>
                            </a>
                          ))}
                          {job.phones.length > 1 && (
                            <span className="text-xs text-slate-400 font-bold">+{job.phones.length - 1}</span>
                          )}
                        </div>
                      )}
                      {job.emails.length === 0 && job.phones.length === 0 && (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>
                  </td>

                  {/* Link */}
                  <td className="px-4 py-3 text-center">
                    {job.jobLink && job.jobLink !== '#' ? (
                      <button
                        onClick={() => openJobLink(job.jobLink)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all text-xs font-medium"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {totalPages > 1 && !hasActiveFilters && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            leftIcon={<ChevronLeft className="w-4 h-4" />}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-500 dark:text-slate-400">
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

      {/* ── Empty filter state ────────────────────────────────────────────── */}
      {(hasActiveFilters || filterOlderThan7Days) && displayJobs.length === 0 && (
        <div className="text-center py-10 px-4">
          <Filter className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">No jobs match your filters</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Try adjusting or clearing filters</p>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  )
}