// src/pages/ScraperPage.tsx
import { useState, useEffect } from 'react'
import { TopNav } from '@/components/layout/TopNav'
import { PageHeader } from '@/components/layout/PageHeader'
import { ScraperControls } from '@/components/scraper/ScraperControls'
import { ScraperLog } from '@/components/scraper/ScraperLog'
import { JobTable } from '@/components/scraper/JobTable'
import { ScraperHistory } from '@/components/scraper/ScraperHistory'
import { useScraper } from '@/hooks/useScraper'
import { useLeads } from '@/hooks/useLeads'
import { useToast } from '@/hooks/useToast'
import { getScraperHistory, ScraperHistoryItem } from '@/services/scraperHistoryService'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AlertCircle, Search, History, ChevronDown, ChevronUp, Save, CheckSquare, Square } from 'lucide-react'
import type { LeadStatus, EnrichmentStatus } from '@/types'

// Helper for numeric fields (integer, numeric)
const safeNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const strValue = String(value)
  if (strValue === 'N/A') return null
  if (strValue === 'null') return null
  if (strValue === 'undefined') return null
  if (strValue === '') return null
  const num = Number(strValue)
  return isNaN(num) ? null : num
}

// Helper for boolean fields
const safeBoolean = (value: unknown): boolean | null => {
  if (value === null || value === undefined) return null
  if (value === 'N/A') return null
  if (value === 'null') return null
  if (value === 'undefined') return null
  if (typeof value === 'boolean') return value
  const strValue = String(value).toLowerCase()
  if (strValue === 'true') return true
  if (strValue === 'false') return false
  return null
}

// Helper for text fields
const safeString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null
  if (value === 'N/A') return null
  if (value === 'null') return null
  if (value === 'undefined') return null
  const strValue = String(value)
  if (strValue === '') return null
  return strValue
}

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
    startScrape,
    loadMore,
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
      setSelectedJobIds(new Set(jobs.map(job => job.id)))
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

  const handleSaveSelected = async () => {
    const selectedJobs = jobs.filter(job => selectedJobIds.has(job.id))
    if (selectedJobs.length === 0) {
      showToast('No jobs selected', 'error')
      return
    }
    
    setIsSaving(true)
    try {
      const newLeads = selectedJobs.map(job => ({
        datePosted: job.datePostedRaw || new Date().toISOString(),
        jobAdUrl: job.jobLink,
        platform: 'seek' as const,
        city: safeString(job.city),
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
      }))
      
      await createLeads(newLeads)
      showToast(`Saved ${selectedJobs.length} lead(s) to database`, 'success')
      setSelectedJobIds(new Set())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save leads'
      showToast(errorMessage, 'error')
      console.error(err)
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
      const newLeads = jobs.map(job => ({
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
      }))

      await createLeads(newLeads)
      showToast(`Saved all ${jobs.length} lead(s) to database`, 'success')
      setSelectedJobIds(new Set())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save leads'
      showToast(errorMessage, 'error')
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
      <TopNav
        title="Job Scraper"
        subtitle="Search any city in Australia - Use Skip Pages to find older jobs"
        actions={
          jobs.length > 0 ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                leftIcon={selectedJobIds.size === jobs.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              >
                {selectedJobIds.size === jobs.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveSelected}
                isLoading={isSaving}
                disabled={selectedJobIds.size === 0}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Save Selected ({selectedJobIds.size})
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAll}
                isLoading={isSaving}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Save All ({jobs.length})
              </Button>
            </div>
          ) : null
        }
      />
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Job Scraper
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Search for job titles in ANY Australian city - Use "Skip Pages" to find older jobs
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowHistory(!showHistory)}
              leftIcon={showHistory ? <ChevronUp className="w-4 h-4" /> : <History className="w-4 h-4" />}
              className="shadow-sm"
            >
              {showHistory ? 'Hide Scrape History' : 'View Scrape History'}
              {!showHistory && history.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full text-xs">
                  {history.length}
                </span>
              )}
            </Button>
          </div>

          {showHistory && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <ScraperHistory history={history} isLoading={historyLoading} />
            </div>
          )}

          <ScraperControls 
            onStart={startScrape}
            onLoadMore={loadMore}
            isLoading={isLoading}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            currentResultCount={jobs.length}
          />

          <ScraperLog logs={logs} isRunning={isLoading} />

          {error && (
            <Card>
              <CardBody>
                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">
                      Error Occurred
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                      {error}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {jobs.length > 0 && (
            <Card>
              <CardBody>
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
          )}

          {!isLoading && jobs.length === 0 && !error && logs.length === 0 && (
            <Card>
              <CardBody>
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Ready to Search
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Select job titles, choose ANY Australian city, and click search.
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2">
                    💡 <span className="font-medium">Pro tip:</span> Use "Skip Pages" to get older jobs! 
                    Each page has ~20 jobs. Skip 10 pages = go to page 11.
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
                    🌏 Supports all Australian cities - Melbourne, Sydney, Brisbane, Perth, Adelaide,
                    Gold Coast, Newcastle, Wollongong, Geelong, Cairns, and more!
                  </p>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}