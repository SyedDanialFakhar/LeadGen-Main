// src/components/scraper/ScraperControls.tsx
import { useState } from 'react'
import { Play, Settings2, Search, Plus, MapPin } from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { CITIES, JOB_ROLES } from '@/utils/constants'

interface ScraperControlsProps {
  onStart: (jobTitles: string[], city: string, maxResults: number) => void
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
  currentResultCount = 0
}: ScraperControlsProps) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([JOB_ROLES[0]])
  const [customRoles, setCustomRoles] = useState<string[]>([])
  const [currentCustomRole, setCurrentCustomRole] = useState('')
  const [useCustomRoles, setUseCustomRoles] = useState(false)
  const [selectedCity, setSelectedCity] = useState('Australia')
  const [customCity, setCustomCity] = useState('')
  const [useCustomCity, setUseCustomCity] = useState(false)
  const [maxResultsPerRun, setMaxResultsPerRun] = useState(20)

  const handleAddCustomRole = () => {
    if (currentCustomRole.trim() && !customRoles.includes(currentCustomRole.trim())) {
      setCustomRoles([...customRoles, currentCustomRole.trim()])
      setCurrentCustomRole('')
    }
  }

  const handleRemoveCustomRole = (role: string) => {
    setCustomRoles(customRoles.filter(r => r !== role))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const jobTitles = useCustomRoles ? customRoles : selectedRoles
    const city = useCustomCity ? customCity : selectedCity
    if (jobTitles.length > 0 && city.trim()) {
      onStart(jobTitles, city.trim(), maxResultsPerRun)
    }
  }

  const getAllJobTitles = () => {
    if (useCustomRoles) {
      return customRoles
    }
    return selectedRoles
  }

  const getCityDisplay = () => {
    if (useCustomCity) {
      return customCity || 'Not set'
    }
    return selectedCity === 'Australia' ? 'All Australia' : selectedCity
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-slate-500" />
          <h3 className="font-semibold text-slate-900 dark:text-white">
            Scraper Configuration
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Search for jobs across ANY Australian city - Results limited to save API credits
        </p>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Job Role Selection Mode */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={!useCustomRoles}
                  onChange={() => setUseCustomRoles(false)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Select from list</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={useCustomRoles}
                  onChange={() => setUseCustomRoles(true)}
                  className="rounded border-slate-300"
                />
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
                    {customRoles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-sm"
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
                  <p className="text-xs text-yellow-600 dark:text-yellow-500">
                    ⚠️ No custom job titles added. Please add at least one.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Location Selection - Now supports ANY city */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={!useCustomCity}
                  onChange={() => setUseCustomCity(false)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Select from list</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={useCustomCity}
                  onChange={() => setUseCustomCity(true)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Enter custom city</span>
              </label>
            </div>

            {!useCustomCity ? (
              <Select
                label="City / Location"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                options={CITIES.map(c => ({ 
                  value: c, 
                  label: c === 'Australia' ? 'All Australia' : c 
                }))}
                disabled={isLoading}
                helperText="Select a city or 'All Australia'"
              />
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Custom City
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={customCity}
                      onChange={(e) => setCustomCity(e.target.value)}
                      placeholder="e.g., Gold Coast, Newcastle, Wollongong, Geelong"
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  💡 Enter any Australian city (e.g., Gold Coast, Newcastle, Wollongong, Geelong, Cairns, etc.)
                </p>
              </div>
            )}
          </div>

          {/* Max Results per Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Results per Search
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={maxResultsPerRun === 20}
                  onChange={() => setMaxResultsPerRun(20)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">20 results (Lowest cost)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={maxResultsPerRun === 50}
                  onChange={() => setMaxResultsPerRun(50)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">50 results (Medium cost)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={maxResultsPerRun === 100}
                  onChange={() => setMaxResultsPerRun(100)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">100 results (Highest cost)</span>
              </label>
            </div>
            <p className="text-xs text-slate-500">
              💡 Lower results = lower Apify credit usage
            </p>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-xs">
            <p className="font-medium text-blue-800 dark:text-blue-300 mb-2">🔍 Search Summary:</p>
            <p>📌 Job Titles: {getAllJobTitles().length} selected</p>
            <p>📍 Location: {getCityDisplay()}</p>
            <p>📊 Max Results: {maxResultsPerRun} per search</p>
          </div>

          {/* Filters Info */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-xs">
            <p className="font-medium text-green-800 dark:text-green-300 mb-1">✅ Active Filters:</p>
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
            disabled={isLoading || getAllJobTitles().length === 0 || (useCustomCity && !customCity.trim())}
          >
            {isLoading ? 'Scraping...' : `Search ${getAllJobTitles().length} Job Title${getAllJobTitles().length !== 1 ? 's' : ''} in ${getCityDisplay()}`}
          </Button>

          {/* Load More Button */}
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

          <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
            <p>🌏 Supports ANY Australian city - Just type it in!</p>
            <p>📊 Limited to {maxResultsPerRun} results per search to save API credits</p>
            <p>💡 Click "Load More" to fetch additional results</p>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}