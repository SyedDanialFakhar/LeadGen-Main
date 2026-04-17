// src/components/scraper/ScraperControls.tsx
import { useState } from 'react'
import {
  Play,
  Settings2,
  Plus,
  MapPin,
  Info,
  Zap,
  Calendar,
  SkipForward,
  Target,
  ChevronDown,
  ChevronUp,
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
  { value: 0, label: 'Newest First', desc: 'Page 1+' },
  { value: 5, label: 'Skip 5 pages', desc: '~100 skipped' },
  { value: 10, label: 'Skip 10 pages', desc: '~200 skipped' },
  { value: 15, label: 'Skip 15 pages', desc: '~300 skipped' },
  { value: 20, label: 'Skip 20 pages', desc: '~400 skipped' },
  { value: 30, label: 'Skip 30 pages', desc: '~600 skipped' },
]

const DATE_OPTIONS = [
  { value: 0, label: 'All time' },
  { value: 7, label: 'Last 7 days' },
  { value: 14, label: 'Last 14 days' },
  { value: 21, label: 'Last 21 days' },
  { value: 30, label: 'Last 30 days' },
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

  const canSubmit =
    !isLoading && getAllJobTitles().length > 0 && !(useCustomCity && !customCity.trim())

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/50 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
              <Settings2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Scraper Configuration
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Sales filter applied at Seek level — faster &amp; more accurate
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-full border border-emerald-200 dark:border-emerald-800">
            <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              ~20s target
            </span>
          </div>
        </div>
      </CardHeader>

      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── Job Roles ────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-500" />
                Job Titles
              </label>
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setUseCustomRoles(false)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                    !useCustomRoles
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                  }`}
                >
                  Preset list
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
                placeholder="Select job titles to search..."
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
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium"
                      >
                        {role}
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomRole(role)}
                          className="hover:text-blue-900 dark:hover:text-blue-100"
                        >
                          <Plus className="w-3 h-3 rotate-45" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter custom job title..."
                    value={currentCustomRole}
                    onChange={(e) => setCurrentCustomRole(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddCustomRole()
                      }
                    }}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddCustomRole}
                    disabled={!currentCustomRole.trim() || isLoading}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Add
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── Location ─────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-500" />
                Location
              </label>
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setUseCustomCity(false)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                    !useCustomCity
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400'
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
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            {!useCustomCity ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {['Australia', 'Melbourne', 'Sydney', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Other'].map(
                  (city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => {
                        if (city === 'Other') {
                          setUseCustomCity(true)
                        } else {
                          setSelectedCity(city)
                        }
                      }}
                      className={`px-3 py-2 text-xs font-medium rounded-xl border transition-all ${
                        selectedCity === city && !useCustomCity
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300 dark:hover:border-blue-600'
                      }`}
                      disabled={isLoading}
                    >
                      {city === 'Australia' ? '🌏 Australia' : city}
                    </button>
                  )
                )}
              </div>
            ) : (
              <Input
                placeholder="e.g. Cairns QLD, Wollongong NSW..."
                value={customCity}
                onChange={(e) => setCustomCity(e.target.value)}
                disabled={isLoading}
                leftIcon={<MapPin className="w-4 h-4 text-slate-400" />}
              />
            )}
          </div>

          {/* ── Sales Classification Notice ───────────────────────────────── */}
          <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                Sales Filter: Applied at Seek level (faster)
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                Classification ID 1209 is baked into the Seek URL — Apify only fetches Sales jobs.
                Previously: scrape 20, keep 11. Now: scrape 20 Sales jobs directly.
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setSalesOnly(true)}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                    salesOnly
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                  }`}
                >
                  ✅ Sales Only
                </button>
                <button
                  type="button"
                  onClick={() => setSalesOnly(false)}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                    !salesOnly
                      ? 'bg-slate-700 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-slate-400'
                  }`}
                >
                  📂 All Classifications
                </button>
              </div>
            </div>
          </div>

          {/* ── Max Results ───────────────────────────────────────────────── */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Max Results per Job Title
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[10, 20, 30, 50].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMaxResultsPerRun(n)}
                  className={`py-2 text-sm font-medium rounded-xl border transition-all ${
                    maxResultsPerRun === n
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300'
                  }`}
                  disabled={isLoading}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* ── Advanced Options (collapsible) ────────────────────────────── */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                Advanced Options
                {(skipPages > 0 || minAgeDays > 0) && (
                  <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full text-xs">
                    Active
                  </span>
                )}
              </div>
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showAdvanced && (
              <div className="p-4 space-y-4 border-t border-slate-200 dark:border-slate-700">
                {/* Skip Pages */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wide">
                    <SkipForward className="w-3.5 h-3.5" />
                    Skip Pages (for older jobs)
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {SKIP_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSkipPages(opt.value)}
                        className={`px-2 py-2 text-xs rounded-lg border transition-all text-left ${
                          skipPages === opt.value
                            ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-400 dark:border-orange-600 text-orange-800 dark:text-orange-300'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-orange-300'
                        }`}
                        disabled={isLoading}
                      >
                        <div className="font-medium">{opt.label}</div>
                        <div className="text-slate-400 dark:text-slate-500">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wide">
                    <Calendar className="w-3.5 h-3.5" />
                    Date Range
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {DATE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setMinAgeDays(opt.value)}
                        className={`py-2 text-xs rounded-lg border transition-all font-medium ${
                          minAgeDays === opt.value
                            ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600 text-blue-800 dark:text-blue-300'
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

          {/* ── Summary Bar ───────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50 text-xs text-blue-700 dark:text-blue-300 flex-wrap">
            <span className="font-semibold">Search:</span>
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded-full">
              {getAllJobTitles().length} title{getAllJobTitles().length !== 1 ? 's' : ''}
            </span>
            <span>in</span>
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded-full">
              {getCityDisplay()}
            </span>
            <span>·</span>
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded-full">
              {maxResultsPerRun} results
            </span>
            {salesOnly && (
              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full">
                Sales only
              </span>
            )}
          </div>

          {/* ── Always-active filters ─────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              '🚫 No recruitment agencies',
              '📝 No "no agency" disclaimers',
              '🏢 No private advertisers',
              '⚖️ No law firms',
            ].map((filter) => (
              <span
                key={filter}
                className="px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg border border-green-200 dark:border-green-800"
              >
                {filter}
              </span>
            ))}
          </div>

          {/* ── Submit ────────────────────────────────────────────────────── */}
          <Button
            type="submit"
            isLoading={isLoading}
            leftIcon={<Play className="w-4 h-4" />}
            className="w-full"
            size="lg"
            disabled={!canSubmit}
          >
            {isLoading
              ? 'Scraping...'
              : `Search ${getAllJobTitles().length} Title${getAllJobTitles().length !== 1 ? 's' : ''} in ${getCityDisplay()}`}
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