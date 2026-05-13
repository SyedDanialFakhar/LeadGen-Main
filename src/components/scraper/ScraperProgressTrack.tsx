// src/components/scraper/ScraperProgressTracker.tsx
import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  Zap,
  Clock,
  Check,
} from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { cn } from '@/utils/cn'
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
    description: 'Starting websift/seek-job-scraper with Sales=1201',
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

type StepStatus = 'complete' | 'active' | 'pending' | 'error'

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
    const interval = setInterval(() => setLiveSeconds((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [isRunning, metrics.elapsedSeconds])

  useEffect(() => {
    if (isRunning) setLiveSeconds(0)
  }, [isRunning])

  const currentStepIndex = getStepIndex(scraperStep)
  const progressPercent =
    scraperStep === 'done' ? 100
    : scraperStep === 'idle' ? 0
    : Math.round((currentStepIndex / STEPS.length) * 100)

  const getStatus = (step: Step): StepStatus => {
    if (error && scraperStep === step.id) return 'error'
    const i = getStepIndex(step.id)
    if (scraperStep === 'done') return 'complete'
    if (i < currentStepIndex) return 'complete'
    if (i === currentStepIndex) return 'active'
    return 'pending'
  }

  const isDone  = scraperStep === 'done'
  const isIdle  = scraperStep === 'idle'
  const isError = !!error

  const headerClass = isDone
    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
    : isError
    ? 'bg-gradient-to-r from-red-500 to-red-600'
    : isRunning
    ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
    : 'bg-white dark:bg-slate-800/50'

  return (
    <Card className="overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">

      {/* Header */}
      <CardHeader className={cn('border-b border-slate-200 dark:border-slate-700', headerClass)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center shadow-sm shrink-0',
              isDone || isError || isRunning
                ? 'bg-white/20 backdrop-blur-sm'
                : 'bg-slate-100 dark:bg-slate-700'
            )}>
              {isDone   && <CheckCircle2 className="w-5 h-5 text-white" />}
              {isError  && <AlertCircle  className="w-5 h-5 text-white" />}
              {isRunning && !isDone && !isError && <Loader2 className="w-5 h-5 text-white animate-spin" />}
              {isIdle   && <Zap className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
            </div>

            <div>
              <h3 className={cn('font-semibold text-sm',
                isDone || isError || isRunning ? 'text-white' : 'text-slate-900 dark:text-white'
              )}>
                {isDone    ? '✨ Search Complete'
                : isError  ? 'Error Occurred'
                : isRunning ? 'Scraping in Progress…'
                : 'Scraper Status'}
              </h3>
              <p className={cn('text-xs mt-0.5',
                isDone || isError || isRunning ? 'text-white/70' : 'text-slate-500 dark:text-slate-400'
              )}>
                {isDone
                  ? `${metrics.validLeads} valid leads from ${metrics.totalRaw} jobs`
                  : isRunning
                  ? 'Fetching Sales jobs from Seek.com.au…'
                  : 'Configure settings and click Search to start'}
              </p>
            </div>
          </div>

          {(isRunning || (isDone && metrics.elapsedSeconds > 0)) && (
            <div className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0',
              isDone || isRunning ? 'bg-white/20 backdrop-blur-sm' : 'bg-slate-100 dark:bg-slate-800'
            )}>
              <Clock className={cn('w-3.5 h-3.5', isDone || isRunning ? 'text-white/80' : 'text-slate-500')} />
              <span className={cn(
                'text-sm font-mono font-bold tabular-nums',
                isDone || isRunning ? 'text-white' : 'text-slate-700 dark:text-slate-300'
              )}>
                {liveSeconds}s
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardBody className="space-y-5 py-5">

        {/* Progress Bar */}
        {(isRunning || isDone) && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Progress
              </span>
              <span className={cn(
                'text-xs font-bold',
                isDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
              )}>
                {progressPercent}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-700 ease-out',
                  isDone
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                    : 'bg-gradient-to-r from-blue-400 to-indigo-500'
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* ✨ FIXED: Step List with Perfectly Centered Connector Lines */}
        {(isRunning || isDone || isError) && (
          <div className="space-y-0">
            {STEPS.map((step, index) => {
              const status  = getStatus(step)
              const isLast  = index === STEPS.length - 1
              const isActive = status === 'active'

              return (
                <div
                  key={step.id}
                  className={cn(
                    'flex gap-3 rounded-xl transition-all duration-200',
                    isActive && 'bg-blue-50 dark:bg-blue-950/30 -mx-2 px-2'
                  )}
                >
                  {/* ✨ LEFT COLUMN: Circle + Connector Line (Perfectly Centered) */}
                  <div className="flex flex-col items-center shrink-0 w-8 pt-3">
                    
                    {/* Circle */}
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300',
                      status === 'complete' && 'bg-emerald-500 shadow-sm shadow-emerald-200 dark:shadow-emerald-900/40',
                      status === 'active'   && 'bg-white dark:bg-slate-900 ring-2 ring-blue-500 dark:ring-blue-400 shadow-sm shadow-blue-100 dark:shadow-blue-900/40',
                      status === 'error'    && 'bg-red-500',
                      status === 'pending'  && 'bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700',
                    )}>
                      {status === 'complete' && (
                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                      )}
                      {status === 'active' && (
                        <Loader2 className="w-4 h-4 text-blue-500 dark:text-blue-400 animate-spin" />
                      )}
                      {status === 'error' && (
                        <AlertCircle className="w-4 h-4 text-white" />
                      )}
                      {status === 'pending' && (
                        <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                      )}
                    </div>

                    {/* ✨ Connector Line - Perfectly Centered using flex-1 */}
                    {!isLast && (
                      <div className={cn(
                        'w-0.5 flex-1 rounded-full transition-all duration-500 mt-1.5',
                        status === 'complete'
                          ? 'bg-emerald-400 dark:bg-emerald-500'
                          : 'bg-slate-200 dark:bg-slate-700'
                      )} 
                      style={{ minHeight: '24px' }}
                      />
                    )}
                  </div>

                  {/* RIGHT COLUMN: Text Content */}
                  <div className={cn('flex-1 py-3 min-w-0', !isLast && 'pb-4')}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base leading-none">{step.emoji}</span>
                      <p className={cn(
                        'text-sm font-semibold leading-tight',
                        status === 'complete' && 'text-emerald-700 dark:text-emerald-400',
                        status === 'active'   && 'text-blue-700 dark:text-blue-300',
                        status === 'error'    && 'text-red-600 dark:text-red-400',
                        status === 'pending'  && 'text-slate-400 dark:text-slate-500',
                      )}>
                        {step.title}
                      </p>
                      {status === 'active' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          Live
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">
                      {step.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Live Metrics */}
        {(metrics.totalRaw > 0 || isDone) && (
          <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            {[
              { label: 'Jobs Found',   value: metrics.totalRaw,    bg: 'bg-slate-50 dark:bg-slate-800/60',    border: 'border-slate-200 dark:border-slate-700',  text: 'text-slate-700 dark:text-slate-200',    sub: 'text-slate-500 dark:text-slate-400' },
              { label: 'Filtered Out', value: metrics.filteredOut,  bg: 'bg-red-50 dark:bg-red-900/20',       border: 'border-red-100 dark:border-red-900/40',   text: 'text-red-600 dark:text-red-400',        sub: 'text-red-500 dark:text-red-500' },
              { label: 'Valid Leads',  value: metrics.validLeads,   bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-100 dark:border-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-400', sub: 'text-emerald-600 dark:text-emerald-500' },
            ].map(({ label, value, bg, border, text, sub }) => (
              <div key={label} className={cn('rounded-xl border p-3 text-center transition-all duration-300 hover:scale-105', bg, border)}>
                <p className={cn('text-2xl font-black tabular-nums leading-none', text)}>{value}</p>
                <p className={cn('text-[11px] font-medium mt-1', sub)}>{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-700 dark:text-red-300">Error Occurred</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Idle State */}
        {isIdle && !error && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-800 dark:to-slate-700 rounded-2xl flex items-center justify-center mb-4 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
              <Zap className="w-7 h-7 text-blue-500" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Ready to search</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 max-w-[240px] leading-relaxed">
              Configure your job titles, location and results above, then click <strong>Search</strong>.
            </p>
          </div>
        )}

        {/* Done Banner */}
        {isDone && !error && (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-200">
              <Check className="w-5 h-5 text-white" strokeWidth={3} />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                Completed in {metrics.elapsedSeconds}s
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                {metrics.validLeads} valid leads from {metrics.totalRaw} Sales jobs
                {metrics.filteredOut > 0 && ` · ${metrics.filteredOut} removed`}
              </p>
            </div>
          </div>
        )}

      </CardBody>
    </Card>
  )
}