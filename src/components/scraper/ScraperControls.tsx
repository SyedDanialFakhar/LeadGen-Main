// src/components/scraper/ScraperControls.tsx
import { useState } from 'react'
import { Play, Settings2, Search, Plus, MapPin, AlertCircle, Info } from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { CITIES, JOB_ROLES } from '@/utils/constants'

interface ScraperControlsProps {
  onStart: (jobTitles: string[], city: string, maxResults: number, skipPages: number, minAgeDays: number) => void
  onLoadMore?: () => void
  isLoading: boolean
  isLoadingMore?: boolean
  hasMore?: boolean
  currentResultCount?: number
}

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

  /**
   * SEARCH MODE — mutually exclusive:
   *   'newest'    → page 1, no filters (default)
   *   'dateRange' → Seek server-side dateRange filter (last N days) — EFFICIENT, saves credits
   *   'skipPages' → jump to page N to get older jobs
   *
   * Skip Pages + Date Range CANNOT be used together:
   *   - skipPages jumps to older pages (no date filter)
   *   - dateRange filters by recency on page 1
   */
  const [searchMode, setSearchMode] = useState<'newest' | 'dateRange' | 'skipPages'>('newest')
  const [skipPages, setSkipPages] = useState(5)
  const [minAgeDays, setMinAgeDays] = useState(7)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const jobTitles = useCustomRoles ? customRoles : selectedRoles
    const city = useCustomCity ? customCity : selectedCity
    if (jobTitles.length === 0 || !city.trim()) return

    const effectiveSkipPages = searchMode === 'skipPages' ? skipPages : 0
    const effectiveMinAgeDays = searchMode === 'dateRange' ? minAgeDays : 0

    onStart(jobTitles, city.trim(), maxResultsPerRun, effectiveSkipPages, effectiveMinAgeDays)
  }

  const handleAddCustomRole = () => {
    if (currentCustomRole.trim() && !customRoles.includes(currentCustomRole.trim())) {
      setCustomRoles([...customRoles, currentCustomRole.trim()])
      setCurrentCustomRole('')
    }
  }

  const handleRemoveCustomRole = (role: string) => {
    setCustomRoles(customRoles.filter(r => r !== role))
  }

  const getAllJobTitles = () => (useCustomRoles ? customRoles : selectedRoles)

  const getCityDisplay = () => {
    if (useCustomCity) return customCity || 'Not set'
    return selectedCity === 'Australia' ? 'All Australia' : selectedCity
  }

  const getSummarySearchMode = () => {
    if (searchMode === 'dateRange') return `Last ${minAgeDays} days (Seek server-side filter) 💡 Credit-efficient`
    if (searchMode === 'skipPages') return `Skip ${skipPages} pages → older jobs (~${getEstimatedAge(skipPages)})`
    return 'Newest jobs first (page 1)'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-slate-500" />
          <h3 className="font-semibold text-slate-900 dark:text-white">Scraper Configuration</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Search for jobs across ANY Australian city — filters control which jobs you get
        </p>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Job Role Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={!useCustomRoles} onChange={() => setUseCustomRoles(false)} />
                <span className="text-sm text-slate-700 dark:text-slate-300">Select from list</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={useCustomRoles} onChange={() => setUseCustomRoles(true)} />
                <span className="text-sm text-slate-700 dark:text-slate-300">Custom titles</span>
              </label>
            </div>

            {!useCustomRoles ? (
              <MultiSelect
                label="Job Titles (Select multiple)"
                options={JOB_ROLES}
                selected={selectedRoles}
                onChange={setSelectedRoles}
                placeholder="Select job titles to search for..."
                disabled={isLoading}
                helperText={`${selectedRoles.length} job title(s) selected`}
              />
            ) : (
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Custom Job Titles
                </label>
                {customRoles.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    {customRoles.map(role => (
                      <span
                        key={role}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-sm"
                      >
                        {role}
                        <button type="button" onClick={() => handleRemoveCustomRole(role)} className="hover:text-blue-900">
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
                    onChange={e => setCurrentCustomRole(e.target.value)}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCustomRole}
                    disabled={!currentCustomRole.trim() || isLoading}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Add
                  </Button>
                </div>
                {customRoles.length === 0 && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Add at least one custom job title
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Location Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={!useCustomCity} onChange={() => setUseCustomCity(false)} />
                <span className="text-sm text-slate-700 dark:text-slate-300">Select from list</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={useCustomCity} onChange={() => setUseCustomCity(true)} />
                <span className="text-sm text-slate-700 dark:text-slate-300">Enter custom city</span>
              </label>
            </div>

            {!useCustomCity ? (
              <Select
                label="City / Location"
                value={selectedCity}
                onChange={e => setSelectedCity(e.target.value)}
                options={CITIES.map(c => ({ value: c, label: c === 'Australia' ? 'All Australia' : c }))}
                disabled={isLoading}
                helperText="Select a city or 'All Australia'"
              />
            ) : (
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={customCity}
                  onChange={e => setCustomCity(e.target.value)}
                  placeholder="e.g., Gold Coast, Newcastle, Wollongong"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>
            )}
          </div>

          {/* Results per Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Results per Job Title
            </label>
            <div className="flex flex-wrap gap-4">
              {[20, 50, 100].map(n => (
                <label key={n} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={maxResultsPerRun === n}
                    onChange={() => setMaxResultsPerRun(n)}
                  />
                  <span className="text-sm">
                    {n} results {n === 20 ? '(Lowest cost)' : n === 50 ? '(Medium)' : '(Highest cost)'}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-500">💡 Lower results = lower Apify credit usage</p>
          </div>

          {/* ----------------------------------------------------------------
              SEARCH MODE — replaces the old "Skip Pages" + "Date Filter"
              which could previously be set simultaneously (causing conflicts).
          ---------------------------------------------------------------- */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Search Mode
            </label>

            {/* Info box */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>How these work:</strong>
                <br />• <strong>Newest first</strong> — page 1, no filters, fastest.
                <br />• <strong>Date range</strong> — Seek filters server-side before scraping. Most credit-efficient for recent jobs.
                <br />• <strong>Skip pages</strong> — jumps past N pages of new jobs to reach older listings. More pages skipped = older jobs.
                <br />⚠️ Skip Pages and Date Range cannot be combined — pick one.
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">

              {/* Option 1: Newest */}
              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="searchMode"
                  checked={searchMode === 'newest'}
                  onChange={() => setSearchMode('newest')}
                />
                <div>
                  <span className="text-sm font-medium">📄 Newest jobs first</span>
                  <p className="text-xs text-slate-500 mt-0.5">Get today's freshest listings — no filters applied</p>
                </div>
              </label>

              {/* Option 2: Date Range */}
              <div className={`rounded-lg border ${searchMode === 'dateRange' ? 'border-blue-400 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-slate-200 dark:border-slate-700'}`}>
                <label className="flex items-center gap-3 p-3 cursor-pointer">
                  <input
                    type="radio"
                    name="searchMode"
                    checked={searchMode === 'dateRange'}
                    onChange={() => setSearchMode('dateRange')}
                  />
                  <div>
                    <span className="text-sm font-medium">📅 Date range filter</span>
                    <span className="ml-2 text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-full">
                      💡 Credit-efficient
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Seek filters server-side — only fetches jobs from the last N days, so Apify doesn't scrape unnecessary pages
                    </p>
                  </div>
                </label>
                {searchMode === 'dateRange' && (
                  <div className="px-4 pb-3">
                    <div className="flex flex-wrap gap-2">
                      {[1, 3, 7, 14, 30].map(days => (
                        <label key={days} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="dateRangeDays"
                            checked={minAgeDays === days}
                            onChange={() => setMinAgeDays(days)}
                          />
                          <span className="text-sm">Last {days} day{days > 1 ? 's' : ''}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                      ✅ Will only return jobs posted in the last {minAgeDays} day{minAgeDays > 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>

              {/* Option 3: Skip Pages */}
              <div className={`rounded-lg border ${searchMode === 'skipPages' ? 'border-orange-400 dark:border-orange-500 bg-orange-50/50 dark:bg-orange-900/10' : 'border-slate-200 dark:border-slate-700'}`}>
                <label className="flex items-center gap-3 p-3 cursor-pointer">
                  <input
                    type="radio"
                    name="searchMode"
                    checked={searchMode === 'skipPages'}
                    onChange={() => setSearchMode('skipPages')}
                  />
                  <div>
                    <span className="text-sm font-medium">⏩ Skip pages (get older jobs)</span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Jumps past the N newest pages — useful for finding jobs competitors haven't called yet
                    </p>
                  </div>
                </label>
                {searchMode === 'skipPages' && (
                  <div className="px-4 pb-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {[5, 10, 15, 20, 30].map(pages => (
                        <label
                          key={pages}
                          className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-sm"
                        >
                          <input
                            type="radio"
                            name="skipPagesCount"
                            checked={skipPages === pages}
                            onChange={() => setSkipPages(pages)}
                          />
                          <span>
                            Skip {pages} pages
                            <br />
                            <span className="text-xs text-slate-500">{getEstimatedAge(pages)}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                      ⏩ Will start from page {skipPages + 1} — skipping ~{skipPages * 20} newest jobs
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-xs space-y-1">
            <p className="font-medium text-blue-800 dark:text-blue-300 mb-1">🔍 Search Summary</p>
            <p>📌 Job Titles: {getAllJobTitles().length} selected</p>
            <p>📍 Location: {getCityDisplay()}</p>
            <p>📊 Max Results: {maxResultsPerRun} per job title</p>
            <p>🎯 Mode: {getSummarySearchMode()}</p>
            <p className="text-blue-700 dark:text-blue-400 mt-1">
              💡 Total API calls: {getAllJobTitles().length} (one per job title, run in parallel)
            </p>
          </div>

          {/* Always-active filters */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-xs">
            <p className="font-medium text-green-800 dark:text-green-300 mb-1">✅ Always Active Filters</p>
            <p>• 🚫 No recruitment agencies</p>
            <p>• 📝 No "no agency" disclaimers</p>
            <p>• 🏢 No "Private Advertiser" listings</p>
          </div>

          <Button
            type="submit"
            onClick={handleSubmit}
            isLoading={isLoading}
            leftIcon={<Play className="w-4 h-4" />}
            className="w-full"
            size="lg"
            disabled={
              isLoading ||
              getAllJobTitles().length === 0 ||
              (useCustomCity && !customCity.trim())
            }
          >
            {isLoading
              ? 'Scraping...'
              : `Search ${getAllJobTitles().length} Job Title${getAllJobTitles().length !== 1 ? 's' : ''} in ${getCityDisplay()}`}
          </Button>

          {onLoadMore && hasMore && !isLoading && (
            <Button
              type="button"
              onClick={onLoadMore}
              isLoading={isLoadingMore}
              variant="outline"
              className="w-full"
            >
              {isLoadingMore ? 'Loading More...' : `Load More Results (${currentResultCount} shown so far)`}
            </Button>
          )}

          <div className="text-xs text-slate-500 dark:text-slate-400 text-center space-y-1">
            <p>🌏 Supports ANY Australian city</p>
            <p>📊 Limited to {maxResultsPerRun} results per job title to save API credits</p>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}

// Helper
function getEstimatedAge(skipPages: number): string {
  if (skipPages <= 5) return '~3-5 days'
  if (skipPages <= 10) return '~7-10 days'
  if (skipPages <= 15) return '~10-14 days'
  if (skipPages <= 20) return '~14-21 days'
  return '~21-30 days'
}