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
  Calendar as CalendarIcon
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
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

export function JobTable({ 
  jobs, 
  currentPage, 
  totalJobs, 
  itemsPerPage, 
  onPageChange,
  selectedJobIds = new Set(),
  onSelectJob,
  onSelectAll,
  allSelected = false
}: JobTableProps) {
  // Age filter state
  const [ageFilter, setAgeFilter] = useState<AgeFilterType>('all')
  const [customDays, setCustomDays] = useState<number>(30)
  const [showAgeFilter, setShowAgeFilter] = useState(false)
  const [customDateRange, setCustomDateRange] = useState<{ from: string; to: string }>({
    from: '',
    to: ''
  })

  const totalPages = Math.ceil(totalJobs / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage

  // Helper function to get days between two dates
  const getDaysBetween = (date: Date, referenceDate: Date = new Date()): number => {
    return Math.floor((referenceDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  }

  // Filter jobs by age
  const filteredJobs = useMemo(() => {
    if (ageFilter === 'all' && !customDateRange.from && !customDateRange.to) {
      return jobs
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return jobs.filter(job => {
      if (!job.datePostedRaw) return false
      
      const jobDate = new Date(job.datePostedRaw)
      jobDate.setHours(0, 0, 0, 0)
      const daysOld = getDaysBetween(jobDate, today)

      // Date range filter
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

      // Age category filter
      switch (ageFilter) {
        case 'today':
          return daysOld === 0
        case 'week':
          return daysOld <= 7
        case 'month':
          return daysOld <= 30
        case 'older':
          return daysOld > 30
        case 'custom':
          return daysOld >= customDays
        default:
          return true
      }
    })
  }, [jobs, ageFilter, customDays, customDateRange])

  // Reset pagination when filter changes
  const handleFilterChange = (newFilter: AgeFilterType) => {
    setAgeFilter(newFilter)
    if (newFilter !== 'custom') {
      setCustomDateRange({ from: '', to: '' })
    }
  }

  const clearFilters = () => {
    setAgeFilter('all')
    setCustomDays(30)
    setCustomDateRange({ from: '', to: '' })
  }

  const hasActiveFilters = ageFilter !== 'all' || customDateRange.from || customDateRange.to

  // Calculate filtered jobs pagination
  const filteredTotal = filteredJobs.length
  const currentFilteredJobs = filteredJobs.slice(0, itemsPerPage)

  // Use filtered jobs if filters are active, otherwise use original jobs with pagination
  const displayJobs = hasActiveFilters ? currentFilteredJobs : jobs.slice(startIndex, startIndex + itemsPerPage)
  const displayTotal = hasActiveFilters ? filteredTotal : totalJobs
  const displayStartIndex = hasActiveFilters ? 1 : startIndex + 1
  const displayEndIndex = hasActiveFilters ? Math.min(itemsPerPage, filteredTotal) : Math.min(startIndex + itemsPerPage, totalJobs)

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
          No Jobs Found
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Try searching for a different job title
        </p>
      </div>
    )
  }

  const openJobLink = (url: string) => {
    if (url && url !== '#' && url !== '') {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  const getDaysAgo = (datePostedRaw: string) => {
    if (!datePostedRaw) return null
    try {
      const date = new Date(datePostedRaw)
      const today = new Date()
      const diffTime = today.getTime() - date.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      return diffDays
    } catch (e) {
      return null
    }
  }

  const getAgeColor = (daysAgo: number) => {
    if (daysAgo === 0) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
    if (daysAgo <= 7) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
    if (daysAgo <= 30) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
  }

  return (
    <div className="space-y-4">
      {/* Age Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setShowAgeFilter(!showAgeFilter)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
            showAgeFilter || hasActiveFilters
              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          )}
        >
          <Filter className="w-4 h-4" />
          <span>Filter by Age</span>
          <ChevronDown className={cn("w-3 h-3 transition-transform", showAgeFilter && "rotate-180")} />
        </button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            leftIcon={<X className="w-3 h-3" />}
          >
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
            {/* Quick filter buttons */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Quick Filters</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleFilterChange('all')}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-full transition-colors",
                    ageFilter === 'all'
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  )}
                >
                  All Jobs
                </button>
                <button
                  onClick={() => handleFilterChange('today')}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-full transition-colors",
                    ageFilter === 'today'
                      ? "bg-green-600 text-white"
                      : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200"
                  )}
                >
                  Today
                </button>
                <button
                  onClick={() => handleFilterChange('week')}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-full transition-colors",
                    ageFilter === 'week'
                      ? "bg-yellow-600 text-white"
                      : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200"
                  )}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => handleFilterChange('month')}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-full transition-colors",
                    ageFilter === 'month'
                      ? "bg-orange-600 text-white"
                      : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200"
                  )}
                >
                  Last 30 Days
                </button>
                <button
                  onClick={() => handleFilterChange('older')}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-full transition-colors",
                    ageFilter === 'older'
                      ? "bg-red-600 text-white"
                      : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200"
                  )}
                >
                  Older than 30 Days
                </button>
              </div>
            </div>

            {/* Custom days old filter */}
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange('custom')}
                  disabled={ageFilter === 'custom'}
                >
                  Apply
                </Button>
              </div>
            </div>

            {/* Date range picker */}
            <div className="space-y-2 col-span-1 md:col-span-2">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Date Range</label>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={customDateRange.from}
                    onChange={(e) => {
                      setCustomDateRange(prev => ({ ...prev, from: e.target.value }))
                      setAgeFilter('all')
                    }}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-500">to</span>
                  <input
                    type="date"
                    value={customDateRange.to}
                    onChange={(e) => {
                      setCustomDateRange(prev => ({ ...prev, to: e.target.value }))
                      setAgeFilter('all')
                    }}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Active filters summary */}
          {hasActiveFilters && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <div className="flex flex-wrap gap-2">
                {ageFilter !== 'all' && ageFilter !== 'custom' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    {ageFilter === 'today' && 'Today'}
                    {ageFilter === 'week' && 'Last 7 days'}
                    {ageFilter === 'month' && 'Last 30 days'}
                    {ageFilter === 'older' && 'Older than 30 days'}
                    <button onClick={() => setAgeFilter('all')} className="hover:text-blue-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {ageFilter === 'custom' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                    {customDays}+ days old
                    <button onClick={() => setAgeFilter('all')} className="hover:text-purple-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {customDateRange.from && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                    From: {customDateRange.from}
                    <button onClick={() => setCustomDateRange(prev => ({ ...prev, from: '' }))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {customDateRange.to && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                    To: {customDateRange.to}
                    <button onClick={() => setCustomDateRange(prev => ({ ...prev, to: '' }))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results count */}
      <div className="text-sm text-slate-500 dark:text-slate-400">
        Showing {displayStartIndex}-{displayEndIndex} of {displayTotal} jobs
        {hasActiveFilters && (
          <span className="ml-2 text-blue-600">
            (filtered from {totalJobs} total)
          </span>
        )}
      </div>

      {/* Jobs Table */}
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Company</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Job Title</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Posted</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Days Ago</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Location</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Salary</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Work Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Company Size</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Company Website</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Contact Info</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {displayJobs.map((job, idx) => {
              const daysAgo = getDaysAgo(job.datePostedRaw)
              return (
                <tr key={job.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
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
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {job.companyName}
                        </span>
                      </div>
                      {job.companySize && (
                        <span className="text-xs text-slate-500 ml-6">
                          {job.companySize}
                        </span>
                      )}
                    </div>
                    {job.contactName && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 ml-6">
                        Contact: {job.contactName}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="text-slate-700 dark:text-slate-300 line-clamp-2">
                          {job.jobTitle}
                        </span>
                      </div>
                      {job.classification && (
                        <span className="text-xs text-slate-400 ml-4">
                          {job.subClassification || job.classification}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs">
                      <Calendar className="w-3 h-3 shrink-0" />
                      {job.datePosted}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {daysAgo !== null && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                          getAgeColor(daysAgo)
                        )}>
                          {daysAgo === 0 ? 'Today' : `${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {job.city}
                      </div>
                      {job.state && (
                        <span className="text-xs text-slate-400 ml-4">{job.state}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {job.salary ? (
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-green-600 dark:text-green-400">
                          {job.salary}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      {job.workType || job.workArrangement || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        {job.companySize || '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {job.companyWebsite ? (
                      <a
                        href={job.companyWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-xs"
                        title={job.companyWebsite}
                      >
                        <Globe className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[120px]">
                          {job.companyWebsite.replace('https://', '').replace('http://', '').replace('www.', '')}
                        </span>
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {job.emails.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {job.emails.slice(0, 2).map((email, idx) => (
                            <a
                              key={idx}
                              href={`mailto:${email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs hover:underline"
                              title={email}
                            >
                              <Mail className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[100px]">{email}</span>
                            </a>
                          ))}
                          {job.emails.length > 2 && (
                            <span className="text-xs text-slate-400">+{job.emails.length - 2}</span>
                          )}
                        </div>
                      )}
                      {job.phones.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {job.phones.slice(0, 2).map((phone, idx) => (
                            <a
                              key={idx}
                              href={`tel:${phone.replace(/\s/g, '')}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded text-xs hover:underline"
                            >
                              <Phone className="w-3 h-3 shrink-0" />
                              <span>{phone}</span>
                            </a>
                          ))}
                          {job.phones.length > 2 && (
                            <span className="text-xs text-slate-400">+{job.phones.length - 2}</span>
                          )}
                        </div>
                      )}
                      {job.emails.length === 0 && job.phones.length === 0 && (
                        <span className="text-xs text-slate-400">— No contact info —</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 items-center">
                      {job.jobLink && job.jobLink !== '#' ? (
                        <button
                          onClick={() => openJobLink(job.jobLink)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors cursor-pointer"
                          title="View job ad"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span className="text-xs">View Job</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">No link</span>
                      )}
                      {job.isVerified && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <Award className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination - only show if no active filters or if filtered jobs exceed page size */}
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

      {/* Show message when filters are active and no results */}
      {hasActiveFilters && displayJobs.length === 0 && (
        <div className="text-center py-8">
          <p className="text-slate-500 dark:text-slate-400">No jobs match your filter criteria</p>
          <button 
            onClick={clearFilters} 
            className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}