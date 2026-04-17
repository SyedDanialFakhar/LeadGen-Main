// src/components/scraper/ScraperProgressTracker.tsx
import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  Loader2,
  Circle,
  AlertCircle,
  Zap,
  Clock,
  TrendingUp,
} from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import type { ScraperStep, ScraperMetrics } from '@/hooks/useScraper'

interface ScraperProgressTrackerProps {
  isRunning: boolean
  scraperStep: ScraperStep
  metrics: ScraperMetrics
  error?: string | null
}

interface Step {
  id: ScraperStep
  title: string
  description: string
  emoji: string
}

const STEPS: Step[] = [
  {
    id: 'building_query',
    title: 'Building Search Query',
    description: 'Preparing Seek URL with Sales classification filter',
    emoji: '🔍',
  },
  {
    id: 'running_apify',
    title: 'Launching Apify Scraper',
    description: 'Starting websift/seek-job-scraper with Sales=1209',
    emoji: '🚀',
  },
  {
    id: 'waiting_apify',
    title: 'Fetching from Seek',
    description: 'Apify is scraping Sales jobs directly from Seek.com.au',
    emoji: '🌐',
  },
  {
    id: 'fetching_results',
    title: 'Downloading Results',
    description: 'Retrieving job data from Apify dataset',
    emoji: '📥',
  },
  {
    id: 'filtering',
    title: 'Filtering Agencies & Firms',
    description: 'Removing recruitment agencies, law firms, private ads',
    emoji: '🔬',
  },
]

const STEP_ORDER: ScraperStep[] = [
  'building_query',
  'running_apify',
  'waiting_apify',
  'fetching_results',
  'filtering',
  'done',
]

function getStepIndex(step: ScraperStep): number {
  return STEP_ORDER.indexOf(step)
}

export function ScraperProgressTracker({
  isRunning,
  scraperStep,
  metrics,
  error,
}: ScraperProgressTrackerProps) {
  const [liveSeconds, setLiveSeconds] = useState(0)

  useEffect(() => {
    if (!isRunning) {
      setLiveSeconds(metrics.elapsedSeconds)
      return
    }
    const interval = setInterval(() => {
      setLiveSeconds((s) => s + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning, metrics.elapsedSeconds])

  useEffect(() => {
    if (isRunning) setLiveSeconds(0)
  }, [isRunning])

  const currentStepIndex = getStepIndex(scraperStep)
  const progressPercent =
    scraperStep === 'done'
      ? 100
      : scraperStep === 'idle'
      ? 0
      : Math.round((currentStepIndex / STEPS.length) * 100)

  const getStatus = (step: Step): 'complete' | 'active' | 'pending' | 'error' => {
    if (error && scraperStep === step.id) return 'error'
    const stepIdx = getStepIndex(step.id)
    if (scraperStep === 'done') return 'complete'
    if (stepIdx < currentStepIndex) return 'complete'
    if (stepIdx === currentStepIndex) return 'active'
    return 'pending'
  }

  const isDone = scraperStep === 'done'
  const isIdle = scraperStep === 'idle'

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/50 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${
                isDone
                  ? 'bg-emerald-600'
                  : error
                  ? 'bg-red-500'
                  : isRunning
                  ? 'bg-blue-600'
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 text-white" />
              ) : error ? (
                <AlertCircle className="w-4 h-4 text-white" />
              ) : isRunning ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <TrendingUp className="w-4 h-4 text-white" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {isDone ? 'Search Complete ✨' : error ? 'Error' : isRunning ? 'Scraping in Progress' : 'Scraper Status'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isDone
                  ? `${metrics.validLeads} valid leads from ${metrics.totalRaw} Sales jobs`
                  : isRunning
                  ? 'Fetching Sales jobs from Seek...'
                  : 'Configure and click Search to start'}
              </p>
            </div>
          </div>

          {/* Timer */}
          {(isRunning || (isDone && metrics.elapsedSeconds > 0)) && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
              <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="text-sm font-mono font-semibold text-slate-700 dark:text-slate-300">
                {liveSeconds}s
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardBody className="space-y-5">

        {/* ── Progress Bar ─────────────────────────────────────────────── */}
        {(isRunning || isDone) && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Overall Progress
              </span>
              <span
                className={`text-xs font-bold ${
                  isDone
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-blue-600 dark:text-blue-400'
                }`}
              >
                {progressPercent}%
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-700 ease-out ${
                  isDone
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                    : 'bg-gradient-to-r from-blue-400 to-blue-600'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Step Indicators ───────────────────────────────────────────── */}
        {(isRunning || isDone || !!error) && (
          <div className="space-y-2">
            {STEPS.map((step, index) => {
              const status = getStatus(step)
              const isLast = index === STEPS.length - 1

              return (
                <div key={step.id} className="relative">
                  {!isLast && (
                    <div
                      className={`absolute left-[18px] top-9 w-0.5 h-5 ${
                        status === 'complete'
                          ? 'bg-emerald-400 dark:bg-emerald-500'
                          : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    />
                  )}
                  <div className="flex items-start gap-3">
                    <div
                      className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-0.5 ${
                        status === 'complete'
                          ? 'bg-emerald-100 dark:bg-emerald-900/40'
                          : status === 'active'
                          ? 'bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-300 dark:ring-blue-600'
                          : status === 'error'
                          ? 'bg-red-100 dark:bg-red-900/40'
                          : 'bg-slate-100 dark:bg-slate-800'
                      }`}
                    >
                      {status === 'complete' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      )}
                      {status === 'active' && (
                        <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                      )}
                      {status === 'error' && (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                      {status === 'pending' && (
                        <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                      )}
                    </div>

                    <div className="flex-1 pt-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{step.emoji}</span>
                        <p
                          className={`text-sm font-medium ${
                            status === 'complete'
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : status === 'active'
                              ? 'text-blue-700 dark:text-blue-300'
                              : status === 'error'
                              ? 'text-red-700 dark:text-red-300'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {step.title}
                        </p>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 ml-6 mt-0.5">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Live Metrics ──────────────────────────────────────────────── */}
        {(metrics.totalRaw > 0 || isDone) && (
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 text-center">
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 tabular-nums">
                {metrics.totalRaw}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Sales Found</p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 text-center">
              <p className="text-2xl font-bold text-red-700 dark:text-red-300 tabular-nums">
                {metrics.filteredOut}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Agencies Removed</p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center">
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                {metrics.validLeads}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Valid Leads</p>
            </div>
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                  Error Occurred
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Idle State ────────────────────────────────────────────────── */}
        {isIdle && !error && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
              <Zap className="w-7 h-7 text-blue-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Ready to search
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 max-w-[220px]">
              Configure search settings and click Search to begin finding Sales leads
            </p>
          </div>
        )}

        {/* ── Done callout ──────────────────────────────────────────────── */}
        {isDone && !error && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                  ✨ Search Complete in {metrics.elapsedSeconds}s
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {metrics.validLeads} valid leads from {metrics.totalRaw} Sales jobs
                  {metrics.filteredOut > 0 &&
                    ` · ${metrics.filteredOut} agencies/firms removed`}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}