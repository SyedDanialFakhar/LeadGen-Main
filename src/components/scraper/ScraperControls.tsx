// src/components/scraper/ScraperControls.tsx
import { useState } from 'react'
import {
  Play,
  Settings2,
  Plus,
  MapPin,
  Zap,
  Calendar,
  SkipForward,
  Target,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { CITIES, JOB_ROLES } from '@/utils/constants'

interface ScraperControlsProps {
  onStart: (
    jobTitles: string[],
    city: string,
    maxResults: number,
    skipPages: number,
    minAgeDays: number,
    salesOnly: boolean
  ) => void
  onLoadMore?: () => void
  isLoading: boolean
  isLoadingMore?: boolean
  hasMore?: boolean
  currentResultCount?: number
}

const SKIP_OPTIONS = [
  { value: 0, label: 'Newest', desc: 'Page 1' },
  { value: 5, label: 'Skip 5', desc: '~100 jobs' },
  { value: 10, label: 'Skip 10', desc: '~200 jobs' },
  { value: 15, label: 'Skip 15', desc: '~300 jobs' },
  { value: 20, label: 'Skip 20', desc: '~400 jobs' },
  { value: 30, label: 'Skip 30', desc: '~600 jobs' },
]

const DATE_OPTIONS = [
  { value: 0, label: 'All time' },
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 21, label: '21 days' },
  { value: 30, label: '30 days' },
]

const FILTER_BADGES = [
  { icon: '🚫', label: 'No agencies' },
  { icon: '📝', label: 'No disclaimers' },
  { icon: '🏢', label: 'No private ads' },
  { icon: '⚖️', label: 'No law firms' },
]

export function ScraperControls({
  onStart,
  onLoadMore,
  isLoading,
  isLoadingMore = false,
  hasMore = false,
  currentResultCount = 0,
}: ScraperControlsProps) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([JOB_ROLES[0]])
  const [customRoles, setCustomRoles] = useState<string[]>([])
  const [currentCustomRole, setCurrentCustomRole] = useState('')
  const [useCustomRoles, setUseCustomRoles] = useState(false)
  const [selectedCity, setSelectedCity] = useState('Australia')
  const [customCity, setCustomCity] = useState('')
  const [useCustomCity, setUseCustomCity] = useState(false)
  const [maxResultsPerRun, setMaxResultsPerRun] = useState(20)
  const [skipPages, setSkipPages] = useState(0)
  const [minAgeDays, setMinAgeDays] = useState(0)
  const [salesOnly, setSalesOnly] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const jobTitles = useCustomRoles ? customRoles : selectedRoles
    const city = useCustomCity ? customCity : selectedCity
    if (jobTitles.length === 0 || !city.trim()) return
    onStart(jobTitles, city.trim(), maxResultsPerRun, skipPages, minAgeDays, salesOnly)
  }

  const handleAddCustomRole = () => {
    if (currentCustomRole.trim() && !customRoles.includes(currentCustomRole.trim())) {
      setCustomRoles([...customRoles, currentCustomRole.trim()])
      setCurrentCustomRole('')
    }
  }

  const handleRemoveCustomRole = (role: string) => {
    setCustomRoles(customRoles.filter((r) => r !== role))
  }

  const getAllJobTitles = () => (useCustomRoles ? customRoles : selectedRoles)
  const getCityDisplay = () => {
    if (useCustomCity) return customCity || 'Not set'
    return selectedCity === 'Australia' ? 'All Australia' : selectedCity
  }
  const canSubmit = !isLoading && getAllJobTitles().length > 0 && !(useCustomCity && !customCity.trim())

  return (
    <Card className="overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 border-b-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Settings2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Scraper Configuration</h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Sales filter applied at Seek level — faster &amp; accurate
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 backdrop-blur rounded-full">
            <Zap className="w-3 h-3 text-yellow-300" />
            <span className="text-xs font-semibold text-white">~20s</span>
          </div>
        </div>
      </CardHeader>

      <CardBody className="pt-5">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── Job Roles ────────────────────────────────────────────── */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-blue-500" />
                Job Titles
              </label>
              <div className="flex gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setUseCustomRoles(false)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                    !useCustomRoles
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                  }`}
                >
                  Preset
                </button>
                <button
                  type="button"
                  onClick={() => setUseCustomRoles(true)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                    useCustomRoles
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            {!useCustomRoles ? (
              <MultiSelect
                label=""
                options={JOB_ROLES}
                selected={selectedRoles}
                onChange={setSelectedRoles}
                placeholder="Select job titles..."
                disabled={isLoading}
                helperText={`${selectedRoles.length} title${selectedRoles.length !== 1 ? 's' : ''} selected`}
              />
            ) : (
              <div className="space-y-2">
                {customRoles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    {customRoles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium border border-blue-200 dark:border-blue-800"
                      >
                        {role}
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomRole(role)}
                          className="hover:text-red-500 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={currentCustomRole}
                    onChange={(e) => setCurrentCustomRole(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); handleAddCustomRole() }
                    }}
                    placeholder="Type a job title and press Enter or Add..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleAddCustomRole}
                    variant="outline"
                    size="sm"
                    disabled={!currentCustomRole.trim() || isLoading}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── Location ──────────────────────────────────────────────── */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                Location
              </label>
              <div className="flex gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setUseCustomCity(false)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                    !useCustomCity
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Preset
                </button>
                <button
                  type="button"
                  onClick={() => setUseCustomCity(true)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                    useCustomCity
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            {!useCustomCity ? (
              <div className="grid grid-cols-3 gap-1.5">
                {CITIES.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setSelectedCity(city)}
                    disabled={isLoading}
                    className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all ${
                      selectedCity === city
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-300 hover:text-emerald-700 dark:hover:text-emerald-400'
                    }`}
                  >
                    {city === 'Australia' ? '🌏 Australia' : city}
                  </button>
                ))}
              </div>
            ) : (
              <Input
                value={customCity}
                onChange={(e) => setCustomCity(e.target.value)}
                placeholder="e.g. Gold Coast QLD"
                disabled={isLoading}
              />
            )}
          </div>

          {/* ── Sales Classification Toggle ────────────────────────────── */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Classification Filter
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSalesOnly(true)}
                disabled={isLoading}
                className={`py-2.5 text-sm font-semibold rounded-xl border-2 transition-all ${
                  salesOnly
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300'
                }`}
              >
                💼 Sales Only
              </button>
              <button
                type="button"
                onClick={() => setSalesOnly(false)}
                disabled={isLoading}
                className={`py-2.5 text-sm font-semibold rounded-xl border-2 transition-all ${
                  !salesOnly
                    ? 'bg-slate-700 border-slate-700 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                }`}
              >
                📂 All Classifications
              </button>
            </div>
          </div>

          {/* ── Max Results ───────────────────────────────────────────── */}
          {/* ── Max Results ───────────────────────────────────────────── */}
<div className="space-y-2">
  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
    Results Per Job Title
  </label>
  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
    {[10, 20, 30, 50, 100, 550].map((n) => (
      <button
        key={n}
        type="button"
        onClick={() => setMaxResultsPerRun(n)}
        className={`py-2.5 text-sm font-bold rounded-xl border-2 transition-all ${
          maxResultsPerRun === n
            ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-violet-300'
        }`}
        disabled={isLoading}
      >
        {n}
      </button>
    ))}
  </div>
</div>

          {/* ── Advanced Options ──────────────────────────────────────── */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Advanced Options</span>
                {(skipPages > 0 || minAgeDays > 0) && (
                  <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-full text-xs font-semibold">
                    Active
                  </span>
                )}
              </div>
              {showAdvanced
                ? <ChevronUp className="w-4 h-4 text-slate-400" />
                : <ChevronDown className="w-4 h-4 text-slate-400" />
              }
            </button>

            {showAdvanced && (
              <div className="p-4 space-y-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                {/* Skip Pages */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <SkipForward className="w-3 h-3" />
                    Skip Pages (older jobs)
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {SKIP_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSkipPages(opt.value)}
                        className={`px-2 py-2.5 text-xs rounded-xl border-2 transition-all text-left ${
                          skipPages === opt.value
                            ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-300'
                        }`}
                        disabled={isLoading}
                      >
                        <div className="font-bold">{opt.label}</div>
                        <div className={`text-xs mt-0.5 ${skipPages === opt.value ? 'text-amber-100' : 'text-slate-400'}`}>{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                  {skipPages > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                      ⏩ Will skip first {skipPages * 20} jobs and fetch the next {maxResultsPerRun}
                    </p>
                  )}
                </div>

                {/* Date Range */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    Date Range
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {DATE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setMinAgeDays(opt.value)}
                        className={`py-2.5 text-xs rounded-xl border-2 font-bold transition-all ${
                          minAgeDays === opt.value
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300'
                        }`}
                        disabled={isLoading}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Active Filters badges ─────────────────────────────────── */}
          <div className="flex flex-wrap gap-1.5">
            {FILTER_BADGES.map((f) => (
              <span
                key={f.label}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs font-medium"
              >
                {f.icon} {f.label}
              </span>
            ))}
          </div>

          {/* ── Summary Bar ──────────────────────────────────────────── */}
          <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
            <span className="font-bold text-slate-700 dark:text-slate-300">Search:</span>
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full font-medium">
              {getAllJobTitles().length} title{getAllJobTitles().length !== 1 ? 's' : ''}
            </span>
            <span>in</span>
            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full font-medium">
              {getCityDisplay()}
            </span>
            <span>·</span>
            <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 rounded-full font-medium">
              {maxResultsPerRun} results
            </span>
            {skipPages > 0 && (
              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full font-medium">
                Skip {skipPages} pages
              </span>
            )}
          </div>

          {/* ── Submit ───────────────────────────────────────────────── */}
          <Button
            type="submit"
            isLoading={isLoading}
            leftIcon={<Play className="w-4 h-4" />}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-md shadow-blue-200 dark:shadow-blue-900/30 border-0"
            size="lg"
            disabled={!canSubmit}
          >
            {isLoading
              ? 'Scraping in progress...'
              : `Search ${getAllJobTitles().length} Title${getAllJobTitles().length !== 1 ? 's' : ''} · ${getCityDisplay()}`}
          </Button>

          {onLoadMore && hasMore && !isLoading && (
            <Button
              type="button"
              onClick={onLoadMore}
              isLoading={isLoadingMore}
              variant="outline"
              className="w-full"
            >
              {isLoadingMore
                ? 'Loading More...'
                : `Load More Results (${currentResultCount} shown so far)`}
            </Button>
          )}
        </form>
      </CardBody>
    </Card>
  )
}