// src/pages/ScraperPage.tsx
import { useState, useEffect } from 'react'
import { TopNav } from '@/components/layout/TopNav'
import { ScraperControls } from '@/components/scraper/ScraperControls'
import { ScraperLog } from '@/components/scraper/ScraperLog'
import { ScraperProgressTracker } from '@/components/scraper/ScraperProgressTrack'
import { JobTable } from '@/components/scraper/JobTable'
import { ScraperHistory } from '@/components/scraper/ScraperHistory'
import { useScraper } from '@/hooks/useScraper'
import { useLeads } from '@/hooks/useLeads'
import { useToast } from '@/hooks/useToast'
import { getScraperHistory, ScraperHistoryItem } from '@/services/scraperHistoryService'
import { createLeads } from '@/services/leadsService'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  AlertCircle,
  Search,
  History,
  ChevronDown,
  ChevronUp,
  Save,
  CheckSquare,
  Square,
  XCircle,
  Sparkles,
  LayoutGrid,
} from 'lucide-react'
import type { LeadStatus, EnrichmentStatus, NewLead } from '@/types'
import type { FilteredJobRecord } from '@/services/scraperHistoryService'

// ── Field sanitisers ───────────────────────────────────────────────────────

const safeNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const str = String(value)
  if (['N/A', 'null', 'undefined', ''].includes(str)) return null
  const n = Number(str)
  return isNaN(n) ? null : n
}

const safeBoolean = (value: unknown): boolean | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'boolean') return value
  const str = String(value).toLowerCase()
  if (str === 'true') return true
  if (str === 'false') return false
  return null
}

const safeString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null
  const str = String(value)
  if (['N/A', 'null', 'undefined', ''].includes(str)) return null
  return str
}

// Convert filtered job to NewLead format
// Convert filtered job to NewLead format
const convertFilteredJobToLead = (job: FilteredJobRecord): NewLead => {
  // Validate required fields
  if (!job.jobLink) {
    console.warn('Job missing jobLink:', job)
  }
  
  return {
    datePosted: new Date().toISOString(),
    jobAdUrl: job.jobLink || '',  // Required field with fallback
    platform: 'seek',
    city: 'Australia',
    location: null,
    companyName: job.companyName || 'Unknown Company',
    companyLogo: null,
    jobTitle: job.jobTitle || 'Unknown Position',
    contactName: null,
    contactJobTitle: null,
    contactEmail: null,
    contactPhone: null,
    contactLinkedinUrl: null,
    companyEmployeeCount: null,
    companyLinkedinUrl: null,
    companyWebsite: null,
    isRecruitmentAgency: job.category === 'recruitment_agency',
    noAgencyDisclaimer: job.category === 'no_agency_disclaimer',
    adDescription: null,
    reportingTo: null,
    applicantCount: null,
    opsComments: `Restored from filtered jobs - Original reason: ${job.reason || 'Unknown'} (${job.category || 'Unknown'}, ${job.confidence || 0}% confidence)`,
    charlieFeedback: null,
    status: 'Not Sent' as LeadStatus,
    enrichmentStatus: 'pending' as EnrichmentStatus,
    emailSent: false,
    emailSentAt: null,
    followUpRequired: false,
    rawScrapeData: null,
    extractedEmails: [],
    extractedPhones: [],
    extractedContactName: null,
    companyId: null,
    companyIndustry: null,
    companySize: null,
    companyRating: null,
    companyOverview: null,
    jobLink: job.jobLink || null,
    applyLink: null,
    salary: null,
    workType: null,
    workArrangement: null,
    classification: null,
    subClassification: null,
    datePostedRaw: null,
    expiresAt: null,
    state: null,
    country: 'Australia',
    isVerified: false,
    matchAssessment: 'High' as const,
    response: null,
  }
}
// ── Component ─────────────────────────────────────────────────────────────

export function ScraperPage() {
  const {
    isLoading,
    isLoadingMore,
    jobs,
    logs,
    error,
    currentPage,
    totalJobs,
    itemsPerPage,
    hasMore,
    scraperStep,
    metrics,
    startScrape,
    loadMore,
    clearResults,
    setCurrentPage,
  } = useScraper()

  const { createLeads } = useLeads()
  const { showToast } = useToast()
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [history, setHistory] = useState<ScraperHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    loadHistory()
  }, [])

  useEffect(() => {
    if (!isLoading && jobs.length > 0) {
      loadHistory()
      setSelectedJobIds(new Set(jobs.map((j) => j.id)))
    }
  }, [isLoading, jobs.length])

  const loadHistory = async () => {
    try {
      setHistoryLoading(true)
      const data = await getScraperHistory(20)
      setHistory(data)
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleSelectAll = () => {
    if (selectedJobIds.size === jobs.length) {
      setSelectedJobIds(new Set())
    } else {
      setSelectedJobIds(new Set(jobs.map((job) => job.id)))
    }
  }

  const handleSelectJob = (jobId: string) => {
    const newSet = new Set(selectedJobIds)
    if (newSet.has(jobId)) {
      newSet.delete(jobId)
    } else {
      newSet.add(jobId)
    }
    setSelectedJobIds(newSet)
  }

  const buildLeadPayload = (job: (typeof jobs)[0]) => ({
    datePosted: job.datePostedRaw || new Date().toISOString(),
    jobAdUrl: job.jobLink,
    platform: 'seek' as const,
    city: safeString(job.city),
    location: safeString(job.location),
    companyName: safeString(job.companyName) || 'Unknown Company',
    companyLogo: job.companyLogo || null,
    jobTitle: safeString(job.jobTitle) || 'Unknown Position',
    contactName: safeString(job.contactName),
    contactJobTitle: null,
    contactEmail: job.emails?.[0] || null,
    contactPhone: job.phones?.[0] || null,
    contactLinkedinUrl: null,
    companyEmployeeCount: safeString(job.companySize),
    companyLinkedinUrl: null,
    companyWebsite: safeString(job.companyWebsite),
    isRecruitmentAgency: false,
    noAgencyDisclaimer: false,
    adDescription: safeString(job.description),
    reportingTo: null,
    applicantCount: safeNumber(job.numApplicants),
    opsComments: null,
    charlieFeedback: null,
    status: 'Not Sent' as LeadStatus,
    enrichmentStatus: 'pending' as EnrichmentStatus,
    followUpRequired: false,
    rawScrapeData: null,
    extractedEmails: job.emails,
    extractedPhones: job.phones,
    extractedContactName: safeString(job.contactName),
    companyId: safeString(job.companyId),
    companyIndustry: safeString(job.companyIndustry),
    companySize: safeString(job.companySize),
    companyRating: safeNumber(job.companyRating),
    companyOverview: safeString(job.companyOverview),
    jobLink: safeString(job.jobLink),
    applyLink: safeString(job.applyLink),
    salary: safeString(job.salary),
    workType: safeString(job.workType),
    workArrangement: safeString(job.workArrangement),
    classification: safeString(job.classification),
    subClassification: safeString(job.subClassification),
    datePostedRaw: safeString(job.datePostedRaw),
    expiresAt: safeString(job.expiresAt),
    state: safeString(job.state),
    country: safeString(job.country),
    isVerified: safeBoolean(job.isVerified) ?? false,
    matchAssessment: 'High' as const,
  })

  // ─── Restore filtered jobs from history ─────────────────────────────────
  const handleRestoreFilteredJobs = async (jobsToRestore: FilteredJobRecord[]) => {
    if (jobsToRestore.length === 0) {
      showToast('No jobs to restore', 'error')
      return
    }

    setIsSaving(true)
    try {
      const newLeads = jobsToRestore.map(convertFilteredJobToLead)
      await createLeads(newLeads)
      showToast(`✅ Restored ${jobsToRestore.length} job(s) to leads`, 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to restore jobs'
      showToast(message, 'error')
      console.error('Restore error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveSelected = async () => {
    const selectedJobs = jobs.filter((job) => selectedJobIds.has(job.id))
    if (selectedJobs.length === 0) {
      showToast('No jobs selected', 'error')
      return
    }
    setIsSaving(true)
    try {
      await createLeads(selectedJobs.map(buildLeadPayload))
      showToast(`Saved ${selectedJobs.length} lead(s) to database`, 'success')
      setSelectedJobIds(new Set())
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save leads', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveAll = async () => {
    if (jobs.length === 0) {
      showToast('No jobs to save', 'error')
      return
    }
    setIsSaving(true)
    try {
      await createLeads(jobs.map(buildLeadPayload))
      showToast(`Saved all ${jobs.length} lead(s) to database`, 'success')
      setSelectedJobIds(new Set())
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save leads', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const showEmptyState = !isLoading && jobs.length === 0 && !error && logs.length === 0

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
      <TopNav
        title="Job Scraper"
        subtitle="Sales leads from Seek — agency/firm filter applied automatically"
        actions={
          jobs.length > 0 ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                leftIcon={
                  selectedJobIds.size === jobs.length ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )
                }
              >
                {selectedJobIds.size === jobs.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveSelected}
                isLoading={isSaving}
                disabled={selectedJobIds.size === 0 || isSaving}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Save Selected ({selectedJobIds.size})
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAll}
                isLoading={isSaving}
                disabled={isSaving}
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                Save All ({jobs.length})
              </Button>
            </div>
          ) : null
        }
      />

      <div className="flex-1 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* ── Header ────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Job Scraper
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium">
                  Seek
                </span>
              </h1>
              {/* <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Sales classification filter applied at source — get 15–18 valid leads instead of 3–5
              </p> */}
            </div>
            <Button
              variant="outline"
              onClick={() => setShowHistory(!showHistory)}
              leftIcon={
                showHistory ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <History className="w-4 h-4" />
                )
              }
              className="shrink-0"
            >
              {showHistory ? 'Hide History' : 'Scrape History'}
              {!showHistory && history.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full text-xs">
                  {history.length}
                </span>
              )}
            </Button>
          </div>

          {/* ── History Panel (collapsible) ───────────────────────────────── */}
          {showHistory && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <ScraperHistory 
                history={history} 
                isLoading={historyLoading} 
                onRestoreJobs={handleRestoreFilteredJobs}
              />
            </div>
          )}

          {/* ── Main Content - Single Column ──────────────────────────────── */}
          <div className="space-y-6">
            {/* Controls Card */}
            <ScraperControls
              onStart={startScrape}
              onLoadMore={loadMore}
              isLoading={isLoading}
              isLoadingMore={isLoadingMore}
              hasMore={hasMore}
              currentResultCount={jobs.length}
            />

            {/* Progress Tracker (only shows when scraping) */}
            {(isLoading || metrics.totalRaw > 0) && (
              <ScraperProgressTracker
                isRunning={isLoading}
                scraperStep={scraperStep}
                metrics={metrics}
                error={error}
              />
            )}

            {/* Logs (initially collapsed) */}
            <ScraperLog logs={logs} isRunning={isLoading} />

            {/* Error Banner */}
            {error && (
              <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10">
                <CardBody>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                        Search Failed
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={clearResults}
                          leftIcon={<XCircle className="w-3.5 h-3.5" />}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          Clear Error
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Results Table */}
            {jobs.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Results
                    </h2>
                    <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-semibold">
                      {jobs.length} valid leads
                    </span>
                    {selectedJobIds.size > 0 && selectedJobIds.size < jobs.length && (
                      <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm">
                        {selectedJobIds.size} selected
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={clearResults}
                      leftIcon={<XCircle className="w-3.5 h-3.5" />}
                    >
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveAll}
                      isLoading={isSaving}
                      disabled={isSaving}
                      leftIcon={<Save className="w-3.5 h-3.5" />}
                    >
                      Save All ({jobs.length})
                    </Button>
                  </div>
                </div>

                <Card>
                  <CardBody className="p-0">
                    <JobTable
                      jobs={jobs}
                      currentPage={currentPage}
                      totalJobs={totalJobs}
                      itemsPerPage={itemsPerPage}
                      onPageChange={setCurrentPage}
                      selectedJobIds={selectedJobIds}
                      onSelectJob={handleSelectJob}
                      onSelectAll={handleSelectAll}
                      allSelected={selectedJobIds.size === jobs.length}
                    />
                  </CardBody>
                </Card>
              </div>
            )}

            {/* Empty State */}
            {showEmptyState && (
              <Card className="border-dashed border-2 border-slate-200 dark:border-slate-700">
                <CardBody>
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                      <Search className="w-10 h-10 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-3">
                      Ready to find Sales leads
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                      Configure your search — job titles, city, and date range — then click{' '}
                      <strong>Search</strong>. The Sales classification filter is already applied at
                      the Seek level for maximum accuracy and speed.
                    </p>
                    <div className="flex items-center justify-center gap-6 mt-8 text-xs text-slate-400 dark:text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        Sales filter at source
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        ~20s target time
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-violet-400" />
                        15–18 leads expected
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}