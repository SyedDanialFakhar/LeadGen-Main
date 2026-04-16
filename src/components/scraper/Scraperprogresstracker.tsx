// src/components/scraper/ScraperProgressTracker.tsx
import { CheckCircle2, Loader2, Circle, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'

interface ScraperProgressTrackerProps {
  isRunning: boolean
  currentStep: number
  totalSteps: number
  metrics: {
    totalRaw: number
    validLeads: number
    filteredOut: number
  }
  error?: string | null
}

interface Step {
  id: number
  title: string
  description: string
  emoji: string
}

const SCRAPING_STEPS: Step[] = [
  {
    id: 1,
    title: 'Building Search Query',
    description: 'Preparing Seek URL with filters',
    emoji: '🔍',
  },
  {
    id: 2,
    title: 'Searching Seek.com.au',
    description: 'Fetching job listings from Seek',
    emoji: '🌐',
  },
  {
    id: 3,
    title: 'Extracting Job Data',
    description: 'Parsing job details and company info',
    emoji: '📊',
  },
  {
    id: 4,
    title: 'Applying Filters',
    description: 'Removing agencies, law firms, and private listings',
    emoji: '🔬',
  },
  {
    id: 5,
    title: 'Extracting Contacts',
    description: 'Finding emails, phones, and contact names',
    emoji: '📇',
  },
]

export function ScraperProgressTracker({
  isRunning,
  currentStep,
  totalSteps,
  metrics,
  error,
}: ScraperProgressTrackerProps) {
  // Calculate progress percentage
  const progressPercent = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0

  // Get step status
  const getStepStatus = (stepId: number): 'complete' | 'active' | 'pending' | 'error' => {
    if (error && stepId === currentStep) return 'error'
    if (stepId < currentStep) return 'complete'
    if (stepId === currentStep) return 'active'
    return 'pending'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              📊 Scraping Progress
            </h3>
          </div>
          {isRunning && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-full">
              <Loader2 className="w-3 h-3 text-blue-600 dark:text-blue-400 animate-spin" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                In Progress...
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardBody className="space-y-4">
        {/* ───────────────────────────────────────────────────────────────── */}
        {/* PROGRESS BAR */}
        {/* ───────────────────────────────────────────────────────────────── */}
        {isRunning && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Overall Progress
              </span>
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* STEP INDICATORS */}
        {/* ───────────────────────────────────────────────────────────────── */}
        <div className="space-y-3">
          {SCRAPING_STEPS.map((step, index) => {
            const status = getStepStatus(step.id)
            const isLast = index === SCRAPING_STEPS.length - 1

            return (
              <div key={step.id} className="relative">
                {/* Connecting Line */}
                {!isLast && (
                  <div
                    className={`absolute left-5 top-10 w-0.5 h-8 ${
                      status === 'complete'
                        ? 'bg-green-400 dark:bg-green-500'
                        : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  />
                )}

                {/* Step Content */}
                <div className="flex items-start gap-3">
                  {/* Status Icon */}
                  <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    status === 'complete'
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : status === 'active'
                      ? 'bg-blue-100 dark:bg-blue-900/30'
                      : status === 'error'
                      ? 'bg-red-100 dark:bg-red-900/30'
                      : 'bg-slate-100 dark:bg-slate-800'
                  }`}>
                    {status === 'complete' && (
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    )}
                    {status === 'active' && (
                      <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
                    )}
                    {status === 'error' && (
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    )}
                    {status === 'pending' && (
                      <Circle className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                    )}
                  </div>

                  {/* Step Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{step.emoji}</span>
                      <p className={`font-medium text-sm ${
                        status === 'complete'
                          ? 'text-green-700 dark:text-green-300'
                          : status === 'active'
                          ? 'text-blue-700 dark:text-blue-300'
                          : status === 'error'
                          ? 'text-red-700 dark:text-red-300'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {step.title}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* LIVE METRICS */}
        {/* ───────────────────────────────────────────────────────────────── */}
        {(metrics.totalRaw > 0 || isRunning) && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Live Metrics
            </p>
            <div className="grid grid-cols-3 gap-3">
              {/* Total Raw */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {metrics.totalRaw}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  📊 Total Found
                </p>
              </div>

              {/* Filtered Out */}
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {metrics.filteredOut}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  🚫 Filtered
                </p>
              </div>

              {/* Valid Leads */}
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {metrics.validLeads}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  ✅ Valid Leads
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* ERROR MESSAGE */}
        {/* ───────────────────────────────────────────────────────────────── */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                  Error Occurred
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* READY STATE */}
        {/* ───────────────────────────────────────────────────────────────── */}
        {!isRunning && metrics.totalRaw === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
              <span className="text-3xl">🔍</span>
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Ready to search
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
              Configure your search and click "Search" to start
            </p>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* COMPLETED STATE */}
        {/* ───────────────────────────────────────────────────────────────── */}
        {!isRunning && metrics.totalRaw > 0 && !error && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-green-700 dark:text-green-300 text-sm">
                  ✨ Search Complete!
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Found {metrics.validLeads} valid leads from {metrics.totalRaw} raw results
                  {metrics.filteredOut > 0 && ` (${metrics.filteredOut} filtered out)`}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}