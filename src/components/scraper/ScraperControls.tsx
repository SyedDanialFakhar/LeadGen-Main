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
  Clock,
  Filter,
  Info,
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
  onFilterOlderThan7DaysChange?: (enabled: boolean) => void
  filterOlderThan7Days?: boolean
}

// How many pages useScraper auto-skips when filterOlderThan7Days=true and
// no manual skip is set — keep in sync with AUTO_SKIP_PAGES_FOR_OLDER_JOBS
// in useScraper.ts
const AUTO_SKIP_PAGES = 10

const SKIP_OPTIONS = [
  { value: 0,  label: 'Newest',  desc: 'Page 1' },
  { value: 5,  label: 'Skip 5',  desc: '~100 jobs' },
  { value: 10, label: 'Skip 10', desc: '~200 jobs' },
  { value: 15, label: 'Skip 15', desc: '~300 jobs' },
  { value: 20, label: 'Skip 20', desc: '~400 jobs' },
  { value: 30, label: 'Skip 30', desc: '~600 jobs' },
]

const DATE_OPTIONS = [
  { value: 0,  label: 'All time' },
  { value: 7,  label: '7 days' },
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
  onFilterOlderThan7DaysChange,
  filterOlderThan7Days = true,
}: ScraperControlsProps) {
  const [selectedRoles,       setSelectedRoles]       = useState<string[]>([JOB_ROLES[0]])
  const [customRoles,         setCustomRoles]         = useState<string[]>([])
  const [currentCustomRole,   setCurrentCustomRole]   = useState('')
  const [useCustomRoles,      setUseCustomRoles]      = useState(false)
  const [selectedCity,        setSelectedCity]        = useState('Australia')
  const [customCity,          setCustomCity]          = useState('')
  const [useCustomCity,       setUseCustomCity]       = useState(false)
  const [maxResultsPerRun,    setMaxResultsPerRun]    = useState(20)
  const [skipPages,           setSkipPages]           = useState(0)
  const [minAgeDays,          setMinAgeDays]          = useState(0)
  const [salesOnly,           setSalesOnly]           = useState(true)
  const [showAdvanced,        setShowAdvanced]        = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const jobTitles = useCustomRoles ? customRoles : selectedRoles
    const city      = useCustomCity  ? customCity  : selectedCity
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

  const getAllJobTitles  = () => (useCustomRoles ? customRoles : selectedRoles)
  const getCityDisplay  = () => {
    if (useCustomCity) return customCity || 'Not set'
    return selectedCity === 'Australia' ? 'All Australia' : selectedCity
  }
  const canSubmit = !isLoading && getAllJobTitles().length > 0 && !(useCustomCity && !customCity.trim())

  // Whether the auto-skip will kick in this run
  const autoSkipActive = filterOlderThan7Days && skipPages === 0

  return (
    <Card className="overflow-hidden border border-slate-200 dark:border-slate-700 shadow-lg">
      {/* Header */}
      <CardHeader className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 dark:from-blue-700 dark:via-blue-800 dark:to-indigo-900 border-b-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg ring-2 ring-white/30">
              <Settings2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Scraper Configuration</h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Sales filter applied at Seek level — faster &amp; accurate
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-white/20 backdrop-blur-sm rounded-xl shadow-inner">
            <Zap className="w-4 h-4 text-yellow-300 animate-pulse" />
            <span className="text-sm font-bold text-white">~20s</span>
          </div>
        </div>
      </CardHeader>

      <CardBody className="pt-6 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Job Roles ──────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Job Titles
              </label>
              <div className="flex gap-0.5 bg-slate-200/80 dark:bg-slate-700/80 rounded-lg p-0.5 backdrop-blur-sm">
                {['Preset', 'Custom'].map((label) => {
                  const isActive = label === 'Preset' ? !useCustomRoles : useCustomRoles
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setUseCustomRoles(label === 'Custom')}
                      className={`px-3 py-1.5 text-xs rounded-md font-semibold transition-all ${
                        isActive
                          ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-md scale-105'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
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
                  <div className="flex flex-wrap gap-2 p-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-800">
                    {customRoles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md"
                      >
                        {role}
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomRole(role)}
                          className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
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

          {/* ── Location ───────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Location
              </label>
              <div className="flex gap-0.5 bg-slate-200/80 dark:bg-slate-700/80 rounded-lg p-0.5 backdrop-blur-sm">
                {['Preset', 'Custom'].map((label) => {
                  const isActive = label === 'Preset' ? !useCustomCity : useCustomCity
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setUseCustomCity(label === 'Custom')}
                      className={`px-3 py-1.5 text-xs rounded-md font-semibold transition-all ${
                        isActive
                          ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-md scale-105'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {!useCustomCity ? (
              <div className="grid grid-cols-3 gap-2">
                {CITIES.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setSelectedCity(city)}
                    disabled={isLoading}
                    className={`py-2.5 px-3 text-xs font-semibold rounded-xl border-2 transition-all hover:scale-105 ${
                      selectedCity === city
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 border-emerald-400 text-white shadow-lg'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-300 hover:shadow-md'
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

          {/* ── Age Filter Toggle ──────────────────────────────────────────── */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Display Filter
            </label>

            <div className="relative overflow-hidden rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-blue-900/20 dark:via-slate-800 dark:to-blue-900/20 shadow-md">
              <div className="relative p-4">
                <button
                  type="button"
                  onClick={() => onFilterOlderThan7DaysChange?.(!filterOlderThan7Days)}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`relative w-12 h-7 rounded-full transition-all duration-300 ${
                      filterOlderThan7Days
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/50'
                        : 'bg-slate-300 dark:bg-slate-600'
                    }`}>
                      <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${
                        filterOlderThan7Days ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </div>

                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <Clock className={`w-4 h-4 transition-colors ${
                          filterOlderThan7Days ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                        }`} />
                        <span className={`text-sm font-bold transition-colors ${
                          filterOlderThan7Days ? 'text-blue-900 dark:text-blue-100' : 'text-slate-600 dark:text-slate-400'
                        }`}>
                          Show only jobs 7+ days old
                        </span>
                      </div>
                      <p className={`text-xs mt-1 transition-colors ${
                        filterOlderThan7Days ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-500'
                      }`}>
                        {filterOlderThan7Days
                          ? '✓ Filtering out fresh jobs — showing seasoned opportunities only'
                          : '○ Showing all jobs regardless of age'}
                      </p>
                    </div>

                    <div className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      filterOlderThan7Days
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}>
                      {filterOlderThan7Days ? 'ON' : 'OFF'}
                    </div>
                  </div>
                </button>

                {filterOlderThan7Days && (
                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800 space-y-2">
                    <div className="flex items-start gap-2 text-xs">
                      <span className="text-blue-600 dark:text-blue-400 font-bold">ℹ️</span>
                      <p className="text-blue-700 dark:text-blue-300 leading-relaxed">
                        Jobs posted within the last 7 days will be hidden from results.
                        This helps you focus on positions that have been open longer.
                      </p>
                    </div>

                    {/* ⭐ Auto-skip notice */}
                    {autoSkipActive && (
                      <div className="flex items-start gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs">
                        <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                        <p className="text-indigo-700 dark:text-indigo-300 leading-relaxed">
                          <span className="font-bold">Auto-skip active:</span> the scraper will automatically
                          skip the first {AUTO_SKIP_PAGES} pages ({AUTO_SKIP_PAGES * 20} newest jobs) so your
                          results land in the older-jobs zone. Set a manual skip below to override this.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Sales Classification Toggle ────────────────────────────────── */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
              Classification Filter
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSalesOnly(true)}
                disabled={isLoading}
                className={`py-3 text-sm font-bold rounded-xl border-2 transition-all hover:scale-105 ${
                  salesOnly
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-500 text-white shadow-lg'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-300 hover:shadow-md'
                }`}
              >
                💼 Sales Only
              </button>
              <button
                type="button"
                onClick={() => setSalesOnly(false)}
                disabled={isLoading}
                className={`py-3 text-sm font-bold rounded-xl border-2 transition-all hover:scale-105 ${
                  !salesOnly
                    ? 'bg-gradient-to-r from-slate-700 to-slate-800 border-slate-600 text-white shadow-lg'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400 hover:shadow-md'
                }`}
              >
                📂 All Classifications
              </button>
            </div>
          </div>

          {/* ── Max Results ────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
              Results Per Job Title
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[10, 20, 30, 50, 100, 550].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMaxResultsPerRun(n)}
                  className={`py-3 text-sm font-bold rounded-xl border-2 transition-all hover:scale-105 ${
                    maxResultsPerRun === n
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 border-violet-500 text-white shadow-lg'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-violet-300 hover:shadow-md'
                  }`}
                  disabled={isLoading}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* ── Advanced Options ───────────────────────────────────────────── */}
          <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 shadow-md">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 hover:from-slate-100 hover:to-slate-200 dark:hover:from-slate-700 dark:hover:to-slate-600 transition-all"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Advanced Options</span>
                {(skipPages > 0 || minAgeDays > 0) && (
                  <span className="px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-full text-xs font-bold shadow-md">
                    Active
                  </span>
                )}
                {filterOlderThan7Days && skipPages === 0 && (
                  <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-semibold">
                    Auto-skip {AUTO_SKIP_PAGES}p
                  </span>
                )}
              </div>
              {showAdvanced
                ? <ChevronUp className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                : <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              }
            </button>

            {showAdvanced && (
              <div className="p-4 space-y-4 border-t-2 border-slate-200 dark:border-slate-700 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">

                {/* Skip Pages */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
                    <SkipForward className="w-3.5 h-3.5" />
                    Skip Pages (older jobs)
                  </label>

                  {/* Auto-skip override note */}
                  {filterOlderThan7Days && (
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg px-3 py-2">
                      💡 "7+ days" is ON — selecting any value here overrides the auto-skip of {AUTO_SKIP_PAGES} pages.
                      Choose "Newest" to restore auto-skip behaviour.
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    {SKIP_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSkipPages(opt.value)}
                        className={`px-2 py-3 text-xs rounded-xl border-2 transition-all text-left hover:scale-105 ${
                          skipPages === opt.value
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 border-amber-400 text-white shadow-lg'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-300 hover:shadow-md'
                        }`}
                        disabled={isLoading}
                      >
                        <div className="font-bold">{opt.label}</div>
                        <div className={`text-xs mt-0.5 ${skipPages === opt.value ? 'text-amber-100' : 'text-slate-500 dark:text-slate-500'}`}>
                          {opt.desc}
                        </div>
                      </button>
                    ))}
                  </div>

                  {skipPages > 0 && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 font-medium">
                      ⏩ Will skip first {skipPages * 20} jobs and fetch the next {maxResultsPerRun}
                    </p>
                  )}
                </div>

                {/* Date Range */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    Date Range
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {DATE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setMinAgeDays(opt.value)}
                        className={`py-3 text-xs rounded-xl border-2 font-bold transition-all hover:scale-105 ${
                          minAgeDays === opt.value
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-500 text-white shadow-lg'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-300 hover:shadow-md'
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

          {/* ── Active Filters badges ──────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2">
            {FILTER_BADGES.map((f) => (
              <span
                key={f.label}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg text-xs font-semibold shadow-md"
              >
                <span className="text-base">{f.icon}</span> {f.label}
              </span>
            ))}
          </div>

          {/* ── Summary Bar ────────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 flex-wrap shadow-inner">
            <span className="font-bold text-slate-900 dark:text-white">Search:</span>
            <span className="px-2.5 py-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full font-semibold shadow-md">
              {getAllJobTitles().length} title{getAllJobTitles().length !== 1 ? 's' : ''}
            </span>
            <span>in</span>
            <span className="px-2.5 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full font-semibold shadow-md">
              {getCityDisplay()}
            </span>
            <span>·</span>
            <span className="px-2.5 py-1 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-full font-semibold shadow-md">
              {maxResultsPerRun} results
            </span>
            {skipPages > 0 && (
              <span className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full font-semibold shadow-md">
                Skip {skipPages} pages
              </span>
            )}
            {filterOlderThan7Days && (
              <span className="px-2.5 py-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full font-semibold shadow-md">
                7+ days only {autoSkipActive ? `(auto-skip ${AUTO_SKIP_PAGES}p)` : ''}
              </span>
            )}
          </div>

          {/* ── Submit Button ───────────────────────────────────────────────── */}
          <Button
            type="submit"
            isLoading={isLoading}
            leftIcon={<Play className="w-4 h-4" />}
            className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold shadow-xl shadow-blue-500/30 dark:shadow-blue-900/50 border-0 py-4 text-base"
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
              className="w-full border-2 hover:bg-slate-50 dark:hover:bg-slate-800"
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