// src/components/scraper/ScraperHistory.tsx
import { useState } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import {
  Calendar, Briefcase, MapPin, TrendingUp, Filter, AlertCircle,
  ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock,
  Building2, ExternalLink, Tag, ShieldX,
} from 'lucide-react'
import { formatDateTime } from '@/utils/dateUtils'
import type { ScraperHistoryItem, FilteredJobRecord } from '@/services/scraperHistoryService'
import { cn } from '@/utils/cn'

interface ScraperHistoryProps {
  history: ScraperHistoryItem[]
  isLoading: boolean
}

// ─── Category display config ─────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; colour: string; icon: string }> = {
  recruitment_agency:    { label: 'Recruitment Agency',     colour: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',       icon: '🚫' },
  recruitment_website:   { label: 'Agency Website',         colour: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',       icon: '🌐' },
  no_agency_disclaimer:  { label: 'Blocks Agencies',        colour: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', icon: '⛔' },
  hr_consulting:         { label: 'HR Consulting',          colour: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',   icon: '👥' },
  law_firm:              { label: 'Law Firm',               colour: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', icon: '⚖️' },
  private_advertiser:    { label: 'Private Advertiser',     colour: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',      icon: '🏢' },
  non_sales:             { label: 'Non-Sales',              colour: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',       icon: '📂' },
  missing_website:       { label: 'No Website',             colour: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', icon: '⚠️' },
  no_company_name:       { label: 'No Company Name',        colour: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400',      icon: '❓' },
  recruitment_intro:     { label: 'Agency Description',     colour: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',       icon: '📝' },
}

const STATUS_CONFIG = {
  completed: { label: 'Completed', dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  failed:    { label: 'Failed',    dot: 'bg-red-500',     text: 'text-red-700 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-900/20' },
  running:   { label: 'Running',   dot: 'bg-amber-500',   text: 'text-amber-700 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-900/20' },
}

// ─── FilteredJobRow ───────────────────────────────────────────────────────────

function FilteredJobRow({ job }: { job: FilteredJobRecord }) {
  const cfg = CATEGORY_CONFIG[job.category] ?? {
    label: job.category,
    colour: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    icon: '❓',
  }

  return (
    <div className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
      {/* Company + job */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
            {job.companyName}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[160px]">
            — {job.jobTitle}
          </span>
          {job.jobLink && (
            <a
              href={job.jobLink}
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              title="View original job"
            >
              <ExternalLink className="w-3 h-3 text-blue-500 hover:text-blue-700" />
            </a>
          )}
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
          {job.reason}
        </p>
      </div>

      {/* Category badge */}
      <div className="shrink-0 flex flex-col items-end gap-1">
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap', cfg.colour)}>
          <span>{cfg.icon}</span>
          {cfg.label}
        </span>
        <div className="flex items-center gap-1">
          <div
            className="h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"
            style={{ width: 40 }}
            title={`Confidence: ${job.confidence}%`}
          >
            <div
              className={cn(
                'h-full rounded-full',
                job.confidence >= 90 ? 'bg-red-500' :
                job.confidence >= 70 ? 'bg-amber-500' : 'bg-yellow-400'
              )}
              style={{ width: `${job.confidence}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400">{job.confidence}%</span>
        </div>
      </div>
    </div>
  )
}

// ─── CategorySummary ──────────────────────────────────────────────────────────

function CategorySummary({ jobs }: { jobs: FilteredJobRecord[] }) {
  const counts: Record<string, number> = {}
  for (const j of jobs) counts[j.category] = (counts[j.category] || 0) + 1

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {entries.map(([cat, count]) => {
        const cfg = CATEGORY_CONFIG[cat] ?? { label: cat, colour: 'bg-slate-100 text-slate-600', icon: '❓' }
        return (
          <span
            key={cat}
            className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold', cfg.colour)}
          >
            {cfg.icon} {cfg.label}: {count}
          </span>
        )
      })}
    </div>
  )
}

// ─── HistoryRow ───────────────────────────────────────────────────────────────

function HistoryRow({ run }: { run: ScraperHistoryItem }) {
  const [expanded, setExpanded] = useState(false)
  const [search, setSearch] = useState('')

  const statusCfg = STATUS_CONFIG[run.status] ?? STATUS_CONFIG.running
  const filteredJobs = run.filtered_jobs ?? []

  const startTime = new Date(run.created_at)
  const endTime = run.completed_at ? new Date(run.completed_at) : new Date()
  const durationMs = endTime.getTime() - startTime.getTime()
  const durationText = durationMs < 60000
    ? `${Math.floor(durationMs / 1000)}s`
    : `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`

  const passRate = run.jobs_found > 0
    ? Math.round((run.jobs_passed / run.jobs_found) * 100)
    : 0

  const visibleJobs = filteredJobs.filter(j => {
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return j.companyName.toLowerCase().includes(s) ||
      j.jobTitle.toLowerCase().includes(s) ||
      j.reason.toLowerCase().includes(s) ||
      j.category.toLowerCase().includes(s)
  })

  return (
    <div className="border border-slate-100 dark:border-slate-700/60 rounded-xl overflow-hidden transition-all duration-200">
      {/* ── Main row ── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
        {/* Status dot */}
        <div className={cn('w-2 h-2 rounded-full shrink-0', statusCfg.dot, run.status === 'running' && 'animate-pulse')} />

        {/* Date */}
        <div className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap w-32 shrink-0">
          {formatDateTime(run.created_at)}
        </div>

        {/* Job title */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
            {run.job_title}
          </span>
        </div>

        {/* City */}
        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 w-28 shrink-0">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{run.city === 'Australia' ? 'All AU' : run.city}</span>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Found */}
          <div className="flex items-center gap-1" title="Jobs found">
            <TrendingUp className="w-3 h-3 text-slate-400" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{run.jobs_found}</span>
          </div>

          {/* Passed */}
          <div className="flex items-center gap-1" title="Jobs passed filter">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{run.jobs_passed}</span>
          </div>

          {/* Filtered */}
          <div className="flex items-center gap-1" title="Jobs filtered out">
            <XCircle className="w-3 h-3 text-red-400" />
            <span className="text-xs font-semibold text-red-600 dark:text-red-400">{run.jobs_filtered}</span>
          </div>

          {/* Pass rate */}
          <div className="w-16 hidden sm:block" title={`${passRate}% pass rate`}>
            <div className="flex items-center gap-1">
              <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full',
                    passRate >= 60 ? 'bg-emerald-500' :
                    passRate >= 30 ? 'bg-amber-500' : 'bg-red-500'
                  )}
                  style={{ width: `${passRate}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 w-6 text-right">{passRate}%</span>
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-1 text-xs text-slate-400 w-12 shrink-0 hidden md:flex">
            <Clock className="w-3 h-3" />
            <span>{durationText}</span>
          </div>
        </div>

        {/* Expand toggle — only if there are filtered jobs */}
        {filteredJobs.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className={cn(
              'flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0',
              expanded
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
            )}
            title="See filtered-out jobs"
          >
            <ShieldX className="w-3 h-3" />
            <span>{filteredJobs.length} filtered</span>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* ── Expanded filtered jobs panel ── */}
      {expanded && filteredJobs.length > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" />
              Filtered-out jobs ({filteredJobs.length})
            </p>
            {filteredJobs.length > 8 && (
              <input
                type="text"
                placeholder="Search filtered jobs…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
              />
            )}
          </div>

          <CategorySummary jobs={filteredJobs} />

          <div className="max-h-64 overflow-y-auto space-y-0.5 rounded-lg border border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800 divide-y divide-slate-50 dark:divide-slate-700/40">
            {visibleJobs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No matches for "{search}"</p>
            ) : (
              visibleJobs.map((job, i) => <FilteredJobRow key={i} job={job} />)
            )}
          </div>

          {visibleJobs.length < filteredJobs.length && !search && (
            <p className="text-[10px] text-slate-400 text-center mt-1.5">
              Showing {visibleJobs.length} of {filteredJobs.length} — use search to filter
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ScraperHistory({ history, isLoading }: ScraperHistoryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardBody>
          <div className="flex justify-center py-8"><Spinner /></div>
        </CardBody>
      </Card>
    )
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardBody>
          <div className="text-center py-10">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No history yet</p>
            <p className="text-xs text-slate-400 mt-1">Run your first scrape to see results here</p>
          </div>
        </CardBody>
      </Card>
    )
  }

  // Aggregate stats
  const totalFound   = history.reduce((s, r) => s + (r.jobs_found   || 0), 0)
  const totalPassed  = history.reduce((s, r) => s + (r.jobs_passed  || 0), 0)
  const totalFiltered = history.reduce((s, r) => s + (r.jobs_filtered || 0), 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Scraping History</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {history.length} run{history.length !== 1 ? 's' : ''} — click a run's "filtered" button to inspect which jobs were removed
            </p>
          </div>

          {/* Mini summary */}
          <div className="hidden md:flex items-center gap-4 text-xs">
            <div className="text-center">
              <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{totalFound}</p>
              <p className="text-slate-500">Total Found</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-600">{totalPassed}</p>
              <p className="text-slate-500">Passed</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-red-500">{totalFiltered}</p>
              <p className="text-slate-500">Filtered</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardBody className="p-0">
        {/* Column headers */}
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/60">
          <div className="w-2 shrink-0" />
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-32 shrink-0">Date & Time</div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex-1">Job Title</div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-28 shrink-0">Location</div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Found</div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Passed</div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Filtered</div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-16 hidden sm:block">Rate</div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-12 hidden md:block">Time</div>
          <div className="w-24 shrink-0" />
        </div>

        {/* Rows */}
        <div className="p-3 space-y-2">
          {history.map(run => <HistoryRow key={run.id} run={run} />)}
        </div>
      </CardBody>
    </Card>
  )
}