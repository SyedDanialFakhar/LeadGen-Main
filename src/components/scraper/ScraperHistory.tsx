// src/components/scraper/ScraperHistory.tsx
import { useState } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import {
  Calendar, Briefcase, MapPin, TrendingUp, Filter,
  CheckCircle2, XCircle, Clock, ExternalLink, RotateCcw,
  ChevronDown, ChevronUp, Sparkles, Search,
} from 'lucide-react'
import { formatDateTime } from '@/utils/dateUtils'
import type { ScraperHistoryItem, FilteredJobRecord } from '@/services/scraperHistoryService'
import { cn } from '@/utils/cn'

interface ScraperHistoryProps {
  history: ScraperHistoryItem[]
  isLoading: boolean
  onRestoreJobs?: (jobs: FilteredJobRecord[]) => Promise<void>
}

// ─── Category config — includes too_new for age-filtered jobs ─────────────────
const CATEGORY_CONFIG: Record<string, { label: string; colour: string; icon: string }> = {
  recruitment_agency:   { label: 'Agency',           colour: 'bg-red-500',    icon: '🚫' },
  recruitment_website:  { label: 'Agency Site',       colour: 'bg-orange-500', icon: '🌐' },
  no_agency_disclaimer: { label: 'Blocks Agencies',   colour: 'bg-amber-500',  icon: '⛔' },
  hr_consulting:        { label: 'HR Consulting',      colour: 'bg-yellow-500', icon: '👥' },
  law_firm:             { label: 'Law Firm',           colour: 'bg-indigo-500', icon: '⚖️' },
  private_advertiser:   { label: 'Private',           colour: 'bg-slate-500',  icon: '🏢' },
  non_sales:            { label: 'Non-Sales',          colour: 'bg-blue-500',   icon: '📂' },
  recruiter_profile:    { label: 'Recruiter',          colour: 'bg-rose-500',   icon: '👤' },
  recruiter_email:      { label: 'Recruiter Email',    colour: 'bg-pink-500',   icon: '📧' },
  external_recruiter:   { label: 'External',           colour: 'bg-red-600',    icon: '🔗' },
  too_new:              { label: 'Too New (< 7 days)', colour: 'bg-sky-500',    icon: '🕐' },
}

const STATUS_CONFIG: Record<string, { dot: string; bg: string; text: string }> = {
  completed: { dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400' },
  failed:    { dot: 'bg-red-500',     bg: 'bg-red-50 dark:bg-red-900/20',         text: 'text-red-700 dark:text-red-400' },
  running:   { dot: 'bg-amber-500 animate-pulse', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400' },
}

function FilteredJobsPanel({
  jobs,
  onRestoreJobs,
  runId,
}: {
  jobs: FilteredJobRecord[]
  onRestoreJobs?: (jobs: FilteredJobRecord[]) => Promise<void>
  runId: string
}) {
  const [search, setSearch] = useState('')
  const [selectedJobs, setSelectedJobs] = useState<Set<number>>(new Set())
  const [restoring, setRestoring] = useState(false)

  const visible = jobs.filter((j) => {
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return (
      j.companyName.toLowerCase().includes(s) ||
      j.jobTitle.toLowerCase().includes(s) ||
      j.reason.toLowerCase().includes(s)
    )
  })

  const handleRestoreSelected = async () => {
    if (!onRestoreJobs || selectedJobs.size === 0) return
    setRestoring(true)
    try {
      const jobsToRestore = Array.from(selectedJobs).map((idx) => jobs[idx])
      await onRestoreJobs(jobsToRestore)
      setSelectedJobs(new Set())
    } catch (err) {
      console.error('Restore failed:', err)
    } finally {
      setRestoring(false)
    }
  }

  const handleRestoreAll = async () => {
    if (!onRestoreJobs) return
    setRestoring(true)
    try {
      await onRestoreJobs(jobs)
      setSelectedJobs(new Set())
    } catch (err) {
      console.error('Restore all failed:', err)
    } finally {
      setRestoring(false)
    }
  }

  const toggleJob = (idx: number) => {
    const newSet = new Set(selectedJobs)
    if (newSet.has(idx)) newSet.delete(idx)
    else newSet.add(idx)
    setSelectedJobs(newSet)
  }

  const toggleAll = () => {
    if (selectedJobs.size === visible.length) setSelectedJobs(new Set())
    else setSelectedJobs(new Set(visible.map((_, i) => jobs.indexOf(_))))
  }

  // Category summary — separate content filters from age filters
  const categoryCounts: Record<string, number> = {}
  jobs.forEach((j) => { categoryCounts[j.category] = (categoryCounts[j.category] || 0) + 1 })

  const contentFilteredCount = jobs.filter((j) => j.category !== 'too_new').length
  const ageFilteredCount = jobs.filter((j) => j.category === 'too_new').length

  return (
    <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {jobs.length} Filtered Jobs
            </span>
          </div>
          {/* Summary pills */}
          {contentFilteredCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium">
              {contentFilteredCount} content
            </span>
          )}
          {ageFilteredCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 text-xs font-medium">
              🕐 {ageFilteredCount} too new
            </span>
          )}
          {selectedJobs.size > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold">
              {selectedJobs.size} selected
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onRestoreJobs && jobs.length > 0 && (
            <Button
              size="sm"
              onClick={handleRestoreAll}
              isLoading={restoring}
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm text-xs"
            >
              Restore All ({jobs.length})
            </Button>
          )}
          {selectedJobs.size > 0 && onRestoreJobs && (
            <Button
              size="sm"
              onClick={handleRestoreSelected}
              isLoading={restoring}
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm text-xs"
            >
              Restore ({selectedJobs.size})
            </Button>
          )}
          {jobs.length > 5 && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
              />
            </div>
          )}
        </div>
      </div>

      {/* Category badges */}
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(categoryCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([cat, count]) => {
            const cfg = CATEGORY_CONFIG[cat] ?? { label: cat, colour: 'bg-slate-500', icon: '❓' }
            return (
              <span
                key={cat}
                className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white shadow-sm', cfg.colour)}
              >
                {cfg.icon} {cfg.label} <span className="opacity-75">({count})</span>
              </span>
            )
          })}
      </div>

      {/* Jobs table */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 z-10">
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-3 py-2 text-left w-10">
                  <input
                    type="checkbox"
                    checked={selectedJobs.size === visible.length && visible.length > 0}
                    onChange={toggleAll}
                    className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-400">Company</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-400">Job Title</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-400">Reason</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-400">Category</th>
                <th className="px-3 py-2 text-center font-semibold text-slate-600 dark:text-slate-400 w-20">Confidence</th>
                <th className="px-3 py-2 text-center font-semibold text-slate-600 dark:text-slate-400 w-16">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-400 text-xs">
                    {search ? `No matches for "${search}"` : 'No filtered jobs'}
                  </td>
                </tr>
              ) : (
                visible.map((job, i) => {
                  const originalIdx = jobs.indexOf(job)
                  const cfg = CATEGORY_CONFIG[job.category] ?? { label: job.category, colour: 'bg-slate-500', icon: '❓' }
                  const isTooNew = job.category === 'too_new'
                  return (
                    <tr
                      key={i}
                      className={cn(
                        'hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors',
                        isTooNew && 'bg-sky-50/40 dark:bg-sky-900/5'
                      )}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedJobs.has(originalIdx)}
                          onChange={() => toggleJob(originalIdx)}
                          className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-200">{job.companyName}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400 max-w-xs truncate">{job.jobTitle}</td>
                      <td className="px-3 py-2 text-slate-500 dark:text-slate-400 max-w-md truncate">{job.reason}</td>
                      <td className="px-3 py-2">
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white', cfg.colour)}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5 justify-center">
                          <div className="h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', isTooNew ? 'bg-sky-400' : job.confidence >= 90 ? 'bg-red-500' : job.confidence >= 70 ? 'bg-amber-500' : 'bg-yellow-400')}
                              style={{ width: `${job.confidence}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 tabular-nums w-8 text-right">{job.confidence}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {job.jobLink ? (
                          <a
                            href={job.jobLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function HistoryRow({
  run,
  onRestoreJobs,
}: {
  run: ScraperHistoryItem
  onRestoreJobs?: (jobs: FilteredJobRecord[]) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const filteredJobs = run.filtered_jobs ?? []
  const passRate = run.jobs_found > 0 ? Math.round((run.jobs_passed / run.jobs_found) * 100) : 0
  const durationMs = run.completed_at
    ? new Date(run.completed_at).getTime() - new Date(run.created_at).getTime()
    : null
  const durationText =
    durationMs == null ? '—'
    : durationMs < 60000 ? `${Math.floor(durationMs / 1000)}s`
    : `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`
  const statusCfg = STATUS_CONFIG[run.status] || STATUS_CONFIG.completed

  // Separate content-filtered vs age-filtered for the badge
  const tooNewCount = filteredJobs.filter((j) => j.category === 'too_new').length
  const contentFilteredCount = filteredJobs.filter((j) => j.category !== 'too_new').length

  const handleRestoreAll = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onRestoreJobs || filteredJobs.length === 0) return
    try { await onRestoreJobs(filteredJobs) } catch (err) { console.error(err) }
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Main row */}
      <div
        className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors"
        onClick={() => filteredJobs.length > 0 && setExpanded(!expanded)}
      >
        {/* Status dot */}
        <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', statusCfg.dot)} />

        {/* Date */}
        <div className="shrink-0 w-36">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            <span className="font-medium tabular-nums">{formatDateTime(run.created_at)}</span>
          </div>
        </div>

        {/* Job title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{run.job_title}</span>
          </div>
        </div>

        {/* Location */}
        <div className="shrink-0 w-28">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate">{run.city === 'Australia' ? 'All AU' : run.city}</span>
          </div>
        </div>

        {/* Metrics */}
        <div className="shrink-0 flex items-center gap-4">
          <div className="flex items-center gap-1.5" title="Total found">
            <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{run.jobs_found}</span>
          </div>
          <div className="flex items-center gap-1.5" title="Passed filters">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{run.jobs_passed}</span>
          </div>
          <div className="flex items-center gap-1.5" title="Filtered out">
            <XCircle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-sm font-bold text-red-600 dark:text-red-400 tabular-nums">{run.jobs_filtered}</span>
          </div>
        </div>

        {/* Pass rate bar */}
        <div className="shrink-0 w-24">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', passRate >= 60 ? 'bg-emerald-500' : passRate >= 30 ? 'bg-amber-400' : 'bg-red-500')}
                style={{ width: `${passRate}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums w-9 text-right">{passRate}%</span>
          </div>
        </div>

        {/* Duration */}
        <div className="shrink-0 w-14">
          <div className="flex items-center gap-1 justify-end text-xs text-slate-400 dark:text-slate-500">
            <Clock className="w-3 h-3" />
            <span className="tabular-nums">{durationText}</span>
          </div>
        </div>

        {/* Expand / restore */}
        <div className="shrink-0 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {filteredJobs.length > 0 && onRestoreJobs && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRestoreAll}
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              className="h-7 px-2 text-xs border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
            >
              Restore ({filteredJobs.length})
            </Button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ring-1',
              filteredJobs.length > 0
                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 ring-red-200 dark:ring-red-800 hover:bg-red-100 dark:hover:bg-red-900/30'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-400 ring-slate-200 dark:ring-slate-700 cursor-default'
            )}
            disabled={filteredJobs.length === 0}
          >
            {filteredJobs.length}
            {tooNewCount > 0 && <span className="text-sky-500 dark:text-sky-400"> (+{tooNewCount}🕐)</span>}
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && filteredJobs.length > 0 && (
        <FilteredJobsPanel jobs={filteredJobs} onRestoreJobs={onRestoreJobs} runId={run.id} />
      )}
    </div>
  )
}

export function ScraperHistory({ history, isLoading, onRestoreJobs }: ScraperHistoryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardBody>
          <div className="flex justify-center py-10"><Spinner /></div>
        </CardBody>
      </Card>
    )
  }

  if (!history.length) {
    return (
      <Card>
        <CardBody>
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Calendar className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No scraping history yet</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Your scraping runs will appear here</p>
          </div>
        </CardBody>
      </Card>
    )
  }

  const totalFound    = history.reduce((s, r) => s + (r.jobs_found    || 0), 0)
  const totalPassed   = history.reduce((s, r) => s + (r.jobs_passed   || 0), 0)
  const totalFiltered = history.reduce((s, r) => s + (r.jobs_filtered || 0), 0)

  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-700">
      <CardHeader className="bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-sm">
                <Calendar className="w-3.5 h-3.5 text-white" />
              </div>
              Scraping History
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {history.length} run{history.length !== 1 ? 's' : ''} · Click "Restore" to add filtered jobs to leads
            </p>
          </div>
          <div className="flex items-center gap-8">
            {[
              { label: 'Found',    value: totalFound,    color: 'text-slate-700 dark:text-slate-200' },
              { label: 'Passed',   value: totalPassed,   color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Filtered', value: totalFiltered, color: 'text-red-600 dark:text-red-400' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className={cn('text-2xl font-black tabular-nums', stat.color)}>{stat.value}</p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardBody className="p-4">
        <div className="space-y-2.5">
          {history.map((run) => (
            <HistoryRow key={run.id} run={run} onRestoreJobs={onRestoreJobs} />
          ))}
        </div>
      </CardBody>
    </Card>
  )
}