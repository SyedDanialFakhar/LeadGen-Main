// src/pages/ScraperPage.tsx
import { useState, useEffect, useMemo, useCallback } from 'react'
import { TopNav } from '@/components/layout/TopNav'
import { ScraperControls } from '@/components/scraper/ScraperControls'
import { ScraperLog } from '@/components/scraper/ScraperLog'
import { ScraperProgressTracker } from '@/components/scraper/ScraperProgressTrack'
import { ScraperResults } from '@/components/scraper/ScraperResults'
import { ScraperEmptyState } from '@/components/scraper/ScraperEmptyState'
import { ScraperHistory } from '@/components/scraper/ScraperHistory'
import { useScraper } from '@/hooks/useScraper'
import { useLeads } from '@/hooks/useLeads'
import { useToast } from '@/hooks/useToast'
import { getScraperHistory, type ScraperHistoryItem } from '@/services/scraperHistoryService'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AlertCircle, History, ChevronDown, XCircle } from 'lucide-react'
import type { LeadStatus, EnrichmentStatus, NewLead } from '@/types'
import type { FilteredJobRecord } from '@/services/scraperHistoryService'

// ── Field sanitisers ────────────────────────────────────────────────────────
const safeNumber = (v: unknown): number | null => {
  if (v === null || v === undefined) return null
  const s = String(v)
  if (['N/A', 'null', 'undefined', ''].includes(s)) return null
  const n = Number(s)
  return isNaN(n) ? null : n
}

const safeBoolean = (v: unknown): boolean | null => {
  if (v === null || v === undefined) return null
  if (typeof v === 'boolean') return v
  const s = String(v).toLowerCase()
  if (s === 'true') return true
  if (s === 'false') return false
  return null
}

const safeString = (v: unknown): string | null => {
  if (v === null || v === undefined) return null
  const s = String(v)
  if (['N/A', 'null', 'undefined', ''].includes(s)) return null
  return s
}

const getDaysBetween = (date: Date, ref: Date = new Date()): number => {
  const d1 = new Date(date); d1.setHours(0, 0, 0, 0)
  const d2 = new Date(ref);  d2.setHours(0, 0, 0, 0)
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
}

const convertFilteredJobToLead = (job: FilteredJobRecord): NewLead => ({
  datePosted: new Date().toISOString(),
  jobAdUrl: job.jobLink || '',
  platform: 'seek',
  city: 'Australia',
  location: null,
  companyName: job.companyName || 'Unknown Company',
  companyLogo: null,
  jobTitle: job.jobTitle || 'Unknown Position',
  contactName: null, contactJobTitle: null,
  contactEmail: null, contactPhone: null, contactLinkedinUrl: null,
  companyEmployeeCount: null, companyLinkedinUrl: null, companyWebsite: null,
  isRecruitmentAgency: job.category === 'recruitment_agency',
  noAgencyDisclaimer: job.category === 'no_agency_disclaimer',
  adDescription: null, reportingTo: null, applicantCount: null,
  opsComments: `Restored from filtered jobs — Reason: ${job.reason} (${job.category}, ${job.confidence}% confidence)`,
  charlieFeedback: null,
  status: 'Not Sent' as LeadStatus,
  enrichmentStatus: 'pending' as EnrichmentStatus,
  emailSent: false, emailSentAt: null, followUpRequired: false,
  rawScrapeData: null,
  extractedEmails: [], extractedPhones: [], extractedContactName: null,
  companyId: null, companyIndustry: null, companySize: null,
  companyRating: null, companyOverview: null,
  jobLink: job.jobLink || null, applyLink: null, salary: null,
  workType: null, workArrangement: null, classification: null,
  subClassification: null, datePostedRaw: null, expiresAt: null,
  state: null, country: 'Australia', isVerified: false,
  matchAssessment: 'High' as const, response: null,
})

// ── Component ────────────────────────────────────────────────────────────────
export function ScraperPage() {
  const {
    isLoading, isLoadingMore, jobs, logs, error,
    currentPage, totalJobs, itemsPerPage, hasMore,
    scraperStep, metrics, startScrape, loadMore,
    clearResults, setCurrentPage,
  } = useScraper()

  const { createLeads } = useLeads()
  const { showToast } = useToast()

  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [history, setHistory] = useState<ScraperHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [filterOlderThan7Days, setFilterOlderThan7Days] = useState(true)

  // Load history on mount and after each scrape
  useEffect(() => { loadHistory() }, [])
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

  // Visible jobs after age filter
  const visibleJobs = useMemo(() => {
    if (!filterOlderThan7Days) return jobs
    return jobs.filter((job) => {
      if (!job.datePostedRaw) return false
      return getDaysBetween(new Date(job.datePostedRaw)) >= 7
    })
  }, [jobs, filterOlderThan7Days])

  // Wrap startScrape to pass filterOlderThan7Days
  const handleStart = useCallback((
    jobTitles: string[], city: string, maxResults: number,
    skipPages: number, minAgeDays: number, salesOnly: boolean,
  ) => {
    startScrape(jobTitles, city, maxResults, skipPages, minAgeDays, salesOnly, filterOlderThan7Days)
  }, [startScrape, filterOlderThan7Days])

  // Selection
  const handleSelectAll = () => {
    if (selectedJobIds.size === visibleJobs.length) setSelectedJobIds(new Set())
    else setSelectedJobIds(new Set(visibleJobs.map((j) => j.id)))
  }

  const handleSelectJob = (jobId: string) => {
    const s = new Set(selectedJobIds)
    if (s.has(jobId)) s.delete(jobId)
    else s.add(jobId)
    setSelectedJobIds(s)
  }

  // Build lead payload
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
    opsComments: null, charlieFeedback: null,
    status: 'Not Sent' as LeadStatus,
    enrichmentStatus: 'pending' as EnrichmentStatus,
    followUpRequired: false, rawScrapeData: null,
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

  // Save handlers
  const handleSaveSelected = async () => {
    const selectedJobs = jobs.filter((j) => selectedJobIds.has(j.id))
    if (selectedJobs.length === 0) { showToast('No jobs selected', 'error'); return }
    setIsSaving(true)
    try {
      await createLeads(selectedJobs.map(buildLeadPayload))
      showToast(`Saved ${selectedJobs.length} lead(s)`, 'success')
      setSelectedJobIds(new Set())
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error')
    } finally { setIsSaving(false) }
  }

  const handleSaveAll = async () => {
    if (visibleJobs.length === 0) {
      showToast('No visible jobs to save', 'warning')
      return
    }
    setIsSaving(true)
    try {
      await createLeads(visibleJobs.map(buildLeadPayload))
      showToast(`Saved ${visibleJobs.length} lead(s)`, 'success')
      setSelectedJobIds(new Set())
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error')
    } finally { setIsSaving(false) }
  }

  const handleRestoreFilteredJobs = async (jobsToRestore: FilteredJobRecord[]) => {
    if (jobsToRestore.length === 0) { showToast('No jobs to restore', 'error'); return }
    setIsSaving(true)
    try {
      await createLeads(jobsToRestore.map(convertFilteredJobToLead))
      showToast(`✅ Restored ${jobsToRestore.length} job(s) to leads`, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to restore', 'error')
    } finally { setIsSaving(false) }
  }

  const showEmptyState = !isLoading && jobs.length === 0 && !error && logs.length === 0

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
      <TopNav
        title="Job Scraper"
        subtitle="Sales leads from Seek — agency/firm filter applied automatically"
      />

      <div className="flex-1 p-6">
        <div className="max-w-5xl mx-auto space-y-5">

          {/* Page header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Job Scraper</h1>
              <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold">
                Seek.com.au
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              leftIcon={<History className="w-4 h-4" />}
              rightIcon={!showHistory && history.length > 0
                ? <span className="ml-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full text-xs">{history.length}</span>
                : undefined
              }
            >
              {showHistory ? 'Hide History' : 'Scrape History'}
            </Button>
          </div>

          {/* History panel */}
          {showHistory && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <ScraperHistory
                history={history}
                isLoading={historyLoading}
                onRestoreJobs={handleRestoreFilteredJobs}
              />
            </div>
          )}

          {/* Controls */}
          <ScraperControls
            onStart={handleStart}
            onLoadMore={loadMore}
            isLoading={isLoading}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            currentResultCount={jobs.length}
            onFilterOlderThan7DaysChange={setFilterOlderThan7Days}
            filterOlderThan7Days={filterOlderThan7Days}
          />

          {/* Progress tracker */}
          {(isLoading || metrics.totalRaw > 0) && (
            <ScraperProgressTracker
              isRunning={isLoading}
              scraperStep={scraperStep}
              metrics={metrics}
              error={error}
            />
          )}

          {/* Logs */}
          <ScraperLog logs={logs} isRunning={isLoading} />

          {/* Error banner */}
          {error && (
            <Card className="border-red-200 dark:border-red-800/60 bg-red-50/50 dark:bg-red-900/10">
              <CardBody>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-red-800 dark:text-red-300">Search Failed</p>
                    <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">{error}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={clearResults}
                      leftIcon={<XCircle className="w-3.5 h-3.5" />}
                      className="mt-3 text-red-600 border-red-300 hover:bg-red-50"
                    >
                      Clear Error
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Results or empty state */}
          {jobs.length > 0 ? (
            <ScraperResults
              jobs={jobs}
              visibleJobs={visibleJobs}
              selectedJobIds={selectedJobIds}
              onSelectJob={handleSelectJob}
              onSelectAll={handleSelectAll}
              allSelected={selectedJobIds.size === visibleJobs.length && visibleJobs.length > 0}
              filterOlderThan7Days={filterOlderThan7Days}
              onToggle7DaysFilter={() => setFilterOlderThan7Days((v) => !v)}
              onSaveAll={handleSaveAll}
              onSaveSelected={handleSaveSelected}
              onClear={clearResults}
              isSaving={isSaving}
              currentPage={currentPage}
              totalJobs={totalJobs}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          ) : showEmptyState ? (
            <ScraperEmptyState />
          ) : null}

        </div>
      </div>
    </div>
  )
}