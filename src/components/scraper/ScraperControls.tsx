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

  // Skip pages options
  const [skipPages, setSkipPages] = useState(0)
  const [skip0Enabled, setSkip0Enabled] = useState(true)
  const [skip5Enabled, setSkip5Enabled] = useState(false)
  const [skip10Enabled, setSkip10Enabled] = useState(false)
  const [skip15Enabled, setSkip15Enabled] = useState(false)
  const [skip20Enabled, setSkip20Enabled] = useState(false)
  const [skip30Enabled, setSkip30Enabled] = useState(false)

  // Date range options
  const [minAgeDays, setMinAgeDays] = useState(0)
  const [ageAllEnabled, setAgeAllEnabled] = useState(true)
  const [age7Enabled, setAge7Enabled] = useState(false)
  const [age14Enabled, setAge14Enabled] = useState(false)
  const [age21Enabled, setAge21Enabled] = useState(false)
  const [age30Enabled, setAge30Enabled] = useState(false)

  const handleSkipChange = (pages: number) => {
    setSkip0Enabled(pages === 0)
    setSkip5Enabled(pages === 5)
    setSkip10Enabled(pages === 10)
    setSkip15Enabled(pages === 15)
    setSkip20Enabled(pages === 20)
    setSkip30Enabled(pages === 30)
    setSkipPages(pages)
  }

  const handleAgeChange = (days: number) => {
    setAgeAllEnabled(days === 0)
    setAge7Enabled(days === 7)
    setAge14Enabled(days === 14)
    setAge21Enabled(days === 21)
    setAge30Enabled(days === 30)
    setMinAgeDays(days)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const jobTitles = useCustomRoles ? customRoles : selectedRoles
    const city = useCustomCity ? customCity : selectedCity
    if (jobTitles.length === 0 || !city.trim()) return

    onStart(jobTitles, city.trim(), maxResultsPerRun, skipPages, minAgeDays)
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

  const getSkipPagesDisplay = () => {
    if (skipPages === 0) return 'None (newest first)'
    if (skipPages === 5) return `Skip 5 pages (~100 newest jobs)`
    if (skipPages === 10) return `Skip 10 pages (~200 newest jobs)`
    if (skipPages === 15) return `Skip 15 pages (~300 newest jobs)`
    if (skipPages === 20) return `Skip 20 pages (~400 newest jobs)`
    if (skipPages === 30) return `Skip 30 pages (~600 newest jobs)`
    return 'None'
  }

  const getAgeFilterDisplay = () => {
    if (minAgeDays === 7) return 'Last 7 days'
    if (minAgeDays === 14) return 'Last 14 days'
    if (minAgeDays === 21) return 'Last 21 days'
    if (minAgeDays === 30) return 'Last 30 days'
    return 'All jobs (no date filter)'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-slate-500" />
          <h3 className="font-semibold text-slate-900 dark:text-white">Scraper Configuration</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Search for jobs across ANY Australian city — filters are applied server-side to save credits
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

          {/* Skip Pages Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Skip Recent Jobs (Get Older Jobs)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="skipPages"
                  checked={skip0Enabled}
                  onChange={() => handleSkipChange(0)}
                />
                <span className="text-sm">None (newest first)</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="skipPages"
                  checked={skip5Enabled}
                  onChange={() => handleSkipChange(5)}
                />
                <span className="text-sm">Skip 5 pages</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="skipPages"
                  checked={skip10Enabled}
                  onChange={() => handleSkipChange(10)}
                />
                <span className="text-sm">Skip 10 pages</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="skipPages"
                  checked={skip15Enabled}
                  onChange={() => handleSkipChange(15)}
                />
                <span className="text-sm">Skip 15 pages</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="skipPages"
                  checked={skip20Enabled}
                  onChange={() => handleSkipChange(20)}
                />
                <span className="text-sm">Skip 20 pages</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="skipPages"
                  checked={skip30Enabled}
                  onChange={() => handleSkipChange(30)}
                />
                <span className="text-sm">Skip 30 pages</span>
              </label>
            </div>
            <p className="text-xs text-orange-600 dark:text-orange-400">{getSkipPagesDisplay()}</p>
          </div>

          {/* Date Range Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Date Range Filter
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="ageFilter"
                  checked={ageAllEnabled}
                  onChange={() => handleAgeChange(0)}
                />
                <span className="text-sm">All jobs</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="ageFilter"
                  checked={age7Enabled}
                  onChange={() => handleAgeChange(7)}
                />
                <span className="text-sm">Last 7 days</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="ageFilter"
                  checked={age14Enabled}
                  onChange={() => handleAgeChange(14)}
                />
                <span className="text-sm">Last 14 days</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="ageFilter"
                  checked={age21Enabled}
                  onChange={() => handleAgeChange(21)}
                />
                <span className="text-sm">Last 21 days</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="ageFilter"
                  checked={age30Enabled}
                  onChange={() => handleAgeChange(30)}
                />
                <span className="text-sm">Last 30 days</span>
              </label>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400">{getAgeFilterDisplay()}</p>
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong>How filters work with parseforge/seek-scraper:</strong>
              <br />• <strong>Skip pages</strong> — Starts from page X, skipping newer jobs
              <br />• <strong>Date range</strong> — Limits to jobs from last X days
              <br />• Both filters are applied server-side by Seek BEFORE scraping
              <br />• You only pay for jobs that match your criteria — no wasted credits!
            </div>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-xs space-y-1">
            <p className="font-medium text-blue-800 dark:text-blue-300 mb-1">🔍 Search Summary</p>
            <p>📌 Job Titles: {getAllJobTitles().length} selected</p>
            <p>📍 Location: {getCityDisplay()}</p>
            <p>📊 Max Results: {maxResultsPerRun} per job title</p>
            <p>⏩ {getSkipPagesDisplay()}</p>
            <p>📅 {getAgeFilterDisplay()}</p>
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
            <p>⏩ Skip pages to get older jobs</p>
            <p>📅 Date range limits to last 7/14/21/30 days</p>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}