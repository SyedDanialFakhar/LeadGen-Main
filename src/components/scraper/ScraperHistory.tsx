// src/components/scraper/ScraperHistory.tsx
import { useState } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import {
  Calendar, Briefcase, MapPin, TrendingUp, Filter,
  ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock,
  ExternalLink, ShieldX, RotateCcw, Sparkles,
} from 'lucide-react'
import { formatDateTime } from '@/utils/dateUtils'
import type { ScraperHistoryItem, FilteredJobRecord } from '@/services/scraperHistoryService'
import { cn } from '@/utils/cn'

interface ScraperHistoryProps {
  history: ScraperHistoryItem[]
  isLoading: boolean
  onRestoreJobs?: (jobs: FilteredJobRecord[]) => Promise<void>
}

const C = {
  dot:      'w-4 shrink-0',
  date:     'w-36 shrink-0',
  title:    'flex-1 min-w-0',
  city:     'w-28 shrink-0',
  found:    'w-16 shrink-0',
  passed:   'w-16 shrink-0',
  filtered: 'w-16 shrink-0',
  rate:     'w-24 shrink-0',
  time:     'w-14 shrink-0',
  action:   'w-32 shrink-0 flex justify-end',
}

const CATEGORY_CONFIG: Record<string, { label: string; colour: string; icon: string }> = {
  recruitment_agency:   { label: 'Recruitment Agency', colour: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',         icon: '🚫' },
  recruitment_website:  { label: 'Agency Website',     colour: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',         icon: '🌐' },
  no_agency_disclaimer: { label: 'Blocks Agencies',    colour: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', icon: '⛔' },
  hr_consulting:        { label: 'HR Consulting',      colour: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',     icon: '👥' },
  law_firm:             { label: 'Law Firm',           colour: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', icon: '⚖️' },
  private_advertiser:   { label: 'Private Advertiser', colour: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',        icon: '🏢' },
  non_sales:            { label: 'Non-Sales',          colour: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',         icon: '📂' },
  missing_website:      { label: 'No Website',         colour: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', icon: '⚠️' },
  no_company_name:      { label: 'No Company Name',    colour: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400',        icon: '❓' },
  recruitment_intro:    { label: 'Agency Description', colour: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',         icon: '📝' },
  recruiter_profile:    { label: 'Recruiter Profile',  colour: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',         icon: '👤' },
  recruiter_email:      { label: 'Recruiter Email',    colour: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',         icon: '📧' },
  external_recruiter:   { label: 'External Recruiter', colour: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',             icon: '🔗' },
}

const STATUS_DOT: Record<string, string> = {
  completed: 'bg-emerald-500',
  failed:    'bg-red-500',
  running:   'bg-amber-500 animate-pulse',
}

function CategorySummary({ jobs }: { jobs: FilteredJobRecord[] }) {
  const counts: Record<string, number> = {}
  for (const j of jobs) counts[j.category] = (counts[j.category] || 0) + 1
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
  if (!entries.length) return null
  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {entries.map(([cat, n]) => {
        const cfg = CATEGORY_CONFIG[cat] ?? { label: cat, colour: 'bg-slate-100 text-slate-600', icon: '❓' }
        return (
          <span key={cat} className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold', cfg.colour)}>
            {cfg.icon} {cfg.label}: {n}
          </span>
        )
      })}
    </div>
  )
}

function FilteredJobRow({ job, onRestore }: { job: FilteredJobRecord; onRestore?: () => void }) {
  const cfg = CATEGORY_CONFIG[job.category] ?? { label: job.category, colour: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300', icon: '❓' }
  
  return (
    <div className="flex items-start gap-3 py-2.5 px-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200 group rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{job.companyName}</span>
          <span className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[180px]">— {job.jobTitle}</span>
          {job.jobLink && (
            <a href={job.jobLink} target="_blank" rel="noopener noreferrer"
              className="opacity-0 group-hover:opacity-100 transition-opacity" title="View job">
              <ExternalLink className="w-3 h-3 text-blue-500 hover:text-blue-700" />
            </a>
          )}
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{job.reason}</p>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1.5">
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap', cfg.colour)}>
          {cfg.icon} {cfg.label}
        </span>
        <div className="flex items-center gap-2">
          <div className="h-1 w-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden" title={`Confidence: ${job.confidence}%`}>
            <div
              className={cn('h-full rounded-full', job.confidence >= 90 ? 'bg-red-500' : job.confidence >= 70 ? 'bg-amber-500' : 'bg-yellow-400')}
              style={{ width: `${job.confidence}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 tabular-nums">{job.confidence}%</span>
          {onRestore && (
            <button
              onClick={onRestore}
              className="opacity-0 group-hover:opacity-100 transition-all p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400"
              title="Restore this job to leads"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function HistoryRow({ run, onRestoreJobs }: { run: ScraperHistoryItem; onRestoreJobs?: (jobs: FilteredJobRecord[]) => Promise<void> }) {
  const [expanded, setExpanded] = useState(false)
  const [search, setSearch] = useState('')
  const [restoring, setRestoring] = useState(false)
  const [selectedJobs, setSelectedJobs] = useState<Set<number>>(new Set())

  const filteredJobs = run.filtered_jobs ?? []
  const passRate = run.jobs_found > 0 ? Math.round((run.jobs_passed / run.jobs_found) * 100) : 0
  const durationMs = run.completed_at
    ? new Date(run.completed_at).getTime() - new Date(run.created_at).getTime()
    : null
  const durationText = durationMs == null ? '—'
    : durationMs < 60000 ? `${Math.floor(durationMs / 1000)}s`
    : `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`

  const visible = filteredJobs.filter(j => {
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return j.companyName.toLowerCase().includes(s) || j.jobTitle.toLowerCase().includes(s) ||
      j.reason.toLowerCase().includes(s) || j.category.toLowerCase().includes(s)
  })

  const handleRestoreSelected = async () => {
    if (!onRestoreJobs || selectedJobs.size === 0) return
    setRestoring(true)
    try {
      const jobsToRestore = Array.from(selectedJobs).map(idx => filteredJobs[idx])
      await onRestoreJobs(jobsToRestore)
      setSelectedJobs(new Set())
      setExpanded(false)
    } catch (err) {
      console.error('Failed to restore jobs:', err)
    } finally {
      setRestoring(false)
    }
  }

  const handleRestoreJob = async (index: number) => {
    if (!onRestoreJobs) return
    setRestoring(true)
    try {
      await onRestoreJobs([filteredJobs[index]])
    } catch (err) {
      console.error('Failed to restore job:', err)
    } finally {
      setRestoring(false)
    }
  }

  const toggleJobSelection = (index: number) => {
    const newSet = new Set(selectedJobs)
    if (newSet.has(index)) {
      newSet.delete(index)
    } else {
      newSet.add(index)
    }
    setSelectedJobs(newSet)
  }

  return (
    <div className="border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      
      {/* Data row */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}>

        <div className={cn(C.dot, 'flex items-center justify-center')}>
          <div className={cn('w-2 h-2 rounded-full', STATUS_DOT[run.status] ?? 'bg-slate-400')} />
        </div>

        <div className={cn(C.date, 'text-xs text-slate-500 dark:text-slate-400 tabular-nums')}>
          {formatDateTime(run.created_at)}
        </div>

        <div className={cn(C.title, 'flex items-center gap-1.5')}>
          <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{run.job_title}</span>
        </div>

        <div className={cn(C.city, 'flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400')}>
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{run.city === 'Australia' ? 'All AU' : run.city}</span>
        </div>

        <div className={cn(C.found, 'flex items-center gap-1')}>
          <TrendingUp className="w-3 h-3 text-slate-400" />
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums">{run.jobs_found}</span>
        </div>

        <div className={cn(C.passed, 'flex items-center gap-1')}>
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{run.jobs_passed}</span>
        </div>

        <div className={cn(C.filtered, 'flex items-center gap-1')}>
          <XCircle className="w-3 h-3 text-red-400" />
          <span className="text-xs font-semibold text-red-600 dark:text-red-400 tabular-nums">{run.jobs_filtered}</span>
        </div>

        <div className={C.rate}>
          <div className="flex items-center gap-1.5">
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', passRate >= 60 ? 'bg-emerald-500' : passRate >= 30 ? 'bg-amber-400' : 'bg-red-500')}
                style={{ width: `${passRate}%` }}
              />
            </div>
            <span className="text-[10px] tabular-nums text-slate-500 dark:text-slate-400 w-7 text-right">{passRate}%</span>
          </div>
        </div>

        <div className={cn(C.time, 'flex items-center gap-1 justify-end')}>
          <Clock className="w-3 h-3 text-slate-400" />
          <span className="text-xs text-slate-400 tabular-nums">{durationText}</span>
        </div>

        <div className={C.action} onClick={(e) => e.stopPropagation()}>
          {filteredJobs.length > 0 ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                expanded
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 ring-1 ring-red-200 dark:ring-red-800'
              )}
            >
              <ShieldX className="w-3 h-3" />
              {filteredJobs.length} filtered
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          ) : (
            <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
          )}
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && filteredJobs.length > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-700/60 bg-gradient-to-b from-slate-50/60 to-white dark:from-slate-900/30 dark:to-slate-900/10 px-4 py-3">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" />
              Filtered-out jobs ({filteredJobs.length})
            </p>
            <div className="flex items-center gap-2">
              {selectedJobs.size > 0 && onRestoreJobs && (
                <Button
                  size="sm"
                  onClick={handleRestoreSelected}
                  isLoading={restoring}
                  leftIcon={<Sparkles className="w-3 h-3" />}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Restore {selectedJobs.size} to Leads
                </Button>
              )}
              {filteredJobs.length > 6 && (
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 w-40"
                />
              )}
            </div>
          </div>
          
          <CategorySummary jobs={filteredJobs} />
          
          <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800 divide-y divide-slate-50 dark:divide-slate-700/40">
            {visible.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-5">No matches for "{search}"</p>
            ) : (
              visible.map((job, i) => {
                const originalIndex = filteredJobs.indexOf(job)
                return (
                  <div key={i} className="flex items-start gap-2 pr-2">
                    {onRestoreJobs && (
                      <div className="flex items-center justify-center px-2 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedJobs.has(originalIndex)}
                          onChange={() => toggleJobSelection(originalIndex)}
                          className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </div>
                    )}
                    <FilteredJobRow
                      job={job}
                      onRestore={onRestoreJobs ? () => handleRestoreJob(originalIndex) : undefined}
                    />
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function ScraperHistory({ history, isLoading, onRestoreJobs }: ScraperHistoryProps) {
  if (isLoading) return <Card><CardBody><div className="flex justify-center py-10"><Spinner /></div></CardBody></Card>

  if (!history.length) {
    return (
      <Card>
        <CardBody>
          <div className="text-center py-12">
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

  const totalFound    = history.reduce((s, r) => s + (r.jobs_found    || 0), 0)
  const totalPassed   = history.reduce((s, r) => s + (r.jobs_passed   || 0), 0)
  const totalFiltered = history.reduce((s, r) => s + (r.jobs_filtered || 0), 0)

  return (
    <Card className="shadow-md">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/50 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              Scraping History
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {history.length} run{history.length !== 1 ? 's' : ''} — click filtered count to inspect or restore jobs
            </p>
          </div>
          <div className="flex items-center gap-6 text-xs">
            {[
              { label: 'Total Found', value: totalFound,    colour: 'text-slate-700 dark:text-slate-200' },
              { label: 'Passed',      value: totalPassed,   colour: 'text-emerald-600' },
              { label: 'Filtered',    value: totalFiltered, colour: 'text-red-500' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={cn('text-xl font-black tabular-nums', s.colour)}>{s.value}</p>
                <p className="text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardBody className="p-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/60 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          <div className={C.dot} />
          <div className={C.date}>Date & Time</div>
          <div className={C.title}>Job Title</div>
          <div className={C.city}>Location</div>
          <div className={C.found}>Found</div>
          <div className={C.passed}>Passed</div>
          <div className={C.filtered}>Filtered</div>
          <div className={C.rate}>Pass Rate</div>
          <div className={cn(C.time, 'text-right')}>Time</div>
          <div className={C.action} />
        </div>

        <div className="p-3 space-y-2">
          {history.map(run => <HistoryRow key={run.id} run={run} onRestoreJobs={onRestoreJobs} />)}
        </div>
      </CardBody>
    </Card>
  )
}