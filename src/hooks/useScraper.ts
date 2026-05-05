// src/hooks/useScraper.ts
import { useState, useCallback } from 'react'
import { runSeekScraper, waitForRun, fetchRunResults } from '@/services/apify'
import {
  extractEmails,
  extractPhones,
  extractContactName,
  runAllFilters,
  type FilteredJobRecord,
} from '@/utils/contactExtractor'
import { createScraperHistory, updateScraperHistory } from '@/services/scraperHistoryService'
import type { JobResult, RawSeekJob, ScrapeConfig, City } from '@/types'

export type ScraperStep =
  | 'idle'
  | 'building_query'
  | 'running_apify'
  | 'waiting_apify'
  | 'fetching_results'
  | 'filtering'
  | 'done'
  | 'error'

export interface ScraperMetrics {
  totalRaw: number
  validLeads: number
  filteredOut: number
  stepStartedAt: number | null
  elapsedSeconds: number
}

// ─── Sanitize "N/A" strings that Apify returns ────────────────────────────────
function sanitize(value: string | null | undefined): string | null {
  if (!value) return null
  if (value === 'N/A' || value === 'n/a' || value.trim() === '') return null
  return value
}

function sanitizeNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null
  if (value === 'N/A' || value === 'n/a') return null
  const n = typeof value === 'string' ? parseFloat(value) : value
  return isNaN(n) ? null : n
}

// ─── Days between helper ──────────────────────────────────────────────────────
function getDaysBetween(date: Date, referenceDate: Date = new Date()): number {
  const d1 = new Date(date)
  d1.setHours(0, 0, 0, 0)
  const d2 = new Date(referenceDate)
  d2.setHours(0, 0, 0, 0)
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
}

// ─── Validate extracted contact name ──────────────────────────────────────────
const NON_NAME_BLACKLIST = new Set([
  'the', 'your', 'our', 'their', 'for', 'and', 'with', 'from', 'about',
  'this', 'that', 'which', 'what', 'where', 'when', 'how', 'any', 'all',
  'customer', 'feedback', 'territory', 'role', 'team', 'company', 'position',
  'application', 'opportunity', 'business', 'sales', 'manager', 'director',
  'please', 'directly', 'further', 'information', 'queries', 'questions',
  'account', 'service', 'support', 'inquiries', 'enquiries',
  'key', 'new', 'next', 'full', 'high', 'top', 'best', 'great', 'good',
  'more', 'other', 'some', 'many', 'most', 'such', 'each', 'both',
  'national', 'regional', 'local', 'global', 'senior', 'junior',
  'human', 'people', 'talent', 'culture', 'resources', 'services',
  'life', 'time', 'year', 'day', 'work', 'home', 'office',
  'navigating', 'experiencing', 'seeking', 'looking', 'hiring',
  'families', 'individuals', 'clients', 'candidates', 'applicants',
])

function isValidContactName(name: string | null): string | null {
  if (!name) return null
  const words = name.trim().split(/\s+/)
  if (words.length < 2 || words.length > 3) return null
  if (!words.every((w) => /^[A-Z]/.test(w))) return null
  const lowerWords = words.map((w) => w.toLowerCase())
  if (lowerWords.some((w) => NON_NAME_BLACKLIST.has(w))) return null
  if (!words.every((w) => /^[A-Za-z\-']{2,}$/.test(w))) return null
  return name
}

export function useScraper() {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [jobs, setJobs] = useState<JobResult[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [currentOffset, setCurrentOffset] = useState(0)
  const [salesOnly, setSalesOnly] = useState(true)
  const [scraperStep, setScraperStep] = useState<ScraperStep>('idle')
  const [metrics, setMetrics] = useState<ScraperMetrics>({
    totalRaw: 0,
    validLeads: 0,
    filteredOut: 0,
    stepStartedAt: null,
    elapsedSeconds: 0,
  })
  const [lastSearchParams, setLastSearchParams] = useState<{
    jobTitles: string[]
    city: string
    maxResults: number
    skipPages: number
    minAgeDays: number
    salesOnly: boolean
    filterOlderThan7Days: boolean
  } | null>(null)

  const addLog = useCallback((message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }, [])

  const updateMetrics = useCallback((updates: Partial<ScraperMetrics>) => {
    setMetrics((prev) => ({ ...prev, ...updates }))
  }, [])

  // ─── Core job processing ──────────────────────────────────────────────────
  const processJobs = (
    rawResults: RawSeekJob[],
    _minAgeDays: number = 0,
    filterSalesOnly: boolean = true
  ): { passed: JobResult[]; filteredRecords: FilteredJobRecord[] } => {
    const jobsMap = new Map<string, JobResult>()
    const filteredRecords: FilteredJobRecord[] = []

    const counts: Record<string, number> = {}
    const inc = (cat: string) => { counts[cat] = (counts[cat] || 0) + 1 }

    for (const job of rawResults) {
      const companyName = job.advertiser?.name || job.companyName || 'Unknown Company'
      const advertiserName = job.advertiser?.name || ''
      const jobTitle = job.title || 'Unknown Position'
      const classification = job.classificationInfo?.classification || job.classification || ''
      const subClassification = job.classificationInfo?.subClassification || job.subClassification || ''
      const description = job.content?.unEditedContent || job.content?.jobHook || ''
      const jobLink = job.jobLink || job.url || `https://www.seek.com.au/job/${job.id}`

      const companyWebsite = sanitize(job.companyProfile?.website || job.companyWebsite || null)
      const companyIndustry = sanitize(job.companyProfile?.industry || null)
      const companySize = sanitize(job.companyProfile?.size || null)
      const companyRating = sanitizeNumber(job.companyProfile?.rating)
      const companyOverview = sanitize(job.companyProfile?.overview || null)
      const companyId = sanitize(job.advertiser?.id || job.companyProfile?.id || null)
      const isVerified = job.advertiser?.isVerified || job.isVerified || false
      const companyLogo = sanitize(job.advertiser?.logo || null)

      const { shouldFilter, verdict } = runAllFilters({
        companyName,
        advertiserName,
        jobTitle,
        description,
        website: companyWebsite,
        classification,
        isPrivate: job.advertiser?.isPrivate,
        filterSalesOnly: false,
        recruiterProfile: job.recruiterProfile ?? null,
        recruiterSpecialisations: job.recruiterSpecialisations ?? null,
      })

      if (shouldFilter) {
        inc(verdict.category)
        filteredRecords.push({
          companyName,
          jobTitle,
          reason: verdict.reason,
          category: verdict.category,
          confidence: verdict.confidence,
          jobLink,
        })
        continue
      }

      if (!companyName || companyName === 'Unknown Company') {
        inc('no_company_name')
        filteredRecords.push({
          companyName: jobTitle,
          jobTitle,
          reason: 'No company name available',
          category: 'no_company_name',
          confidence: 100,
          jobLink,
        })
        continue
      }

      const jobLocationInfo = job.joblocationInfo
      const fullLocation = jobLocationInfo?.displayLocation || job.location || 'Location not specified'
      const stateMatch = fullLocation.match(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/)
      const state = stateMatch?.[1] || ''
      const country = jobLocationInfo?.country || 'Australia'
      const city =
        jobLocationInfo?.suburb ||
        (jobLocationInfo?.displayLocation
          ? jobLocationInfo.displayLocation.split(' ').slice(0, -1).join(' ')
          : null) ||
        jobLocationInfo?.area ||
        fullLocation.split(',')[0] ||
        ''

      const apifyEmailsRaw = (job.emails || []).filter((e) => e && e !== 'N/A')
      const apifyEmailsFiltered =
        apifyEmailsRaw.length > 0 ? extractEmails(apifyEmailsRaw.join(' ')) : []
      const descEmails = extractEmails(description)
      const emails = [...new Set([...apifyEmailsFiltered, ...descEmails])]

      const apifyPhones = (job.phoneNumbers || []).filter((p) => p && p !== 'N/A')
      const descPhones = extractPhones(description)
      const phones = [...new Set([...apifyPhones, ...descPhones])]

      const rawContactName = extractContactName(description)
      const contactName = isValidContactName(rawContactName)

      let formattedDate = 'Recently posted'
      const datePostedRaw = job.listedAt || ''
      if (datePostedRaw) {
        try {
          const date = new Date(datePostedRaw)
          if (!isNaN(date.getTime())) {
            formattedDate = date.toLocaleDateString('en-AU', {
              day: '2-digit', month: '2-digit', year: 'numeric',
            })
          }
        } catch { /* keep default */ }
      }

      const salary = sanitize(job.salary || null)

      let workType: string | null = null
      if (Array.isArray(job.workTypes)) workType = sanitize(job.workTypes[0])
      else if (typeof job.workTypes === 'string') workType = sanitize(job.workTypes)

      let workArrangement: string | null = null
      if (Array.isArray(job.workArrangements)) workArrangement = sanitize(job.workArrangements[0])
      else if (typeof job.workArrangements === 'string') workArrangement = sanitize(job.workArrangements)

      let numApplicants: string | null = null
      if (job.numApplicants && job.numApplicants !== 'N/A') numApplicants = job.numApplicants

      const applyLink = job.applyLink || jobLink
      const companySlug = sanitize(job.companyProfile?.companyNameSlug || null)
      const companyProfileLink = companySlug
        ? `https://www.seek.com.au/companies/${companySlug}` : null
      const companyNumberOfReviews = sanitizeNumber(job.companyProfile?.numberOfReviews)
      const companyPerksAndBenefits = sanitize(job.companyProfile?.perksAndBenefits || null)

      jobsMap.set(jobLink, {
        id: job.id || `${Date.now()}`,
        companyId, companyName, companyWebsite, companyLogo, companyIndustry,
        companySize, companyRating, companyOverview, companySlug, companyProfileLink,
        companyNumberOfReviews, companyPerksAndBenefits,
        companyOpenJobs: sanitize(job.companyOpenJobs || null),
        companyTags: job.companyTags || [],
        jobTitle, jobLink, applyLink, salary,
        datePosted: formattedDate, datePostedRaw,
        expiresAt: job.expiresAtUtc || null,
        city, location: fullLocation, state, country,
        workType, workArrangement, numApplicants,
        classification, subClassification,
        emails, phones, contactName,
        description: description.substring(0, 1000),
        isVerified, platform: 'seek',
      })
    }

    if (counts['recruiter_profile'])
      addLog(`👤 Filtered ${counts['recruiter_profile']} recruiter-posted jobs`)
    if (counts['recruitment_agency'] || counts['recruitment_website'])
      addLog(`🚫 Filtered ${(counts['recruitment_agency'] || 0) + (counts['recruitment_website'] || 0)} recruitment agencies`)
    if (counts['no_agency_disclaimer'])
      addLog(`📝 Filtered ${counts['no_agency_disclaimer']} jobs with "no agencies" disclaimer`)
    if (counts['hr_consulting'])
      addLog(`👥 Filtered ${counts['hr_consulting']} HR consulting companies`)
    if (counts['law_firm'])
      addLog(`⚖️ Filtered ${counts['law_firm']} law/legal firms`)
    if (counts['private_advertiser'])
      addLog(`🏢 Filtered ${counts['private_advertiser']} private advertisers`)

    return { passed: Array.from(jobsMap.values()), filteredRecords }
  }

  // ─── Search ───────────────────────────────────────────────────────────────
  const performSearch = useCallback(
    async (
      jobTitles: string[],
      city: string,
      maxResults: number,
      skipPages: number = 0,
      minAgeDays: number = 0,
      salesOnlyFilter: boolean = true,
      offset: number = 0,
      isLoadMore: boolean = false,
      filterOlderThan7Days: boolean = false,
    ) => {
      const startedAt = Date.now()

      if (!isLoadMore) {
        setIsLoading(true)
        setJobs([])
        setLogs([])
        setError(null)
        setCurrentOffset(0)
        setHasMore(false)
        setScraperStep('building_query')
        setMetrics({ totalRaw: 0, validLeads: 0, filteredOut: 0, stepStartedAt: Date.now(), elapsedSeconds: 0 })
      } else {
        setIsLoadingMore(true)
      }

      if (!isLoadMore) {
        addLog(`🚀 Starting scrape for ${jobTitles.length} job title(s): "${jobTitles.join('", "')}"`)
        addLog(`📍 Location: ${city === 'Australia' ? 'All Australia' : city}`)
        addLog(`📊 Requesting up to ${maxResults} results per job title`)
        addLog(`🎯 Sales classification filter: Applied at Seek URL level`)
        if (filterOlderThan7Days) addLog(`🕐 Age filter: Tracking jobs < 7 days old for history`)
        if (skipPages > 0) addLog(`⏩ Skip mode: offset=${skipPages * 20} jobs`)
        if (minAgeDays > 0) addLog(`📅 Date filter: last ${minAgeDays} days`)
      } else {
        addLog(`🔄 Loading more results...`)
      }

      try {
        let historyId = currentHistoryId
        if (!isLoadMore) {
          historyId = await createScraperHistory(jobTitles.join(', '), city)
          setCurrentHistoryId(historyId)
        }

        setScraperStep('running_apify')
        addLog(`🌐 Launching Apify scraper...`)

        const searchPromises = jobTitles.map(async (jobTitle) => {
          const config: ScrapeConfig = {
            platform: 'seek',
            city: city as City,
            roleQuery: jobTitle,
            minAgeDays,
            maxResults,
            offset: skipPages,
            salesOnly: salesOnlyFilter,
          }
          addLog(`  🔍 Searching: "${jobTitle}"`)
          try {
            const apifyRunId = await runSeekScraper(config)
            setScraperStep('waiting_apify')
            addLog(`  ⏳ Apify run started: ${apifyRunId.substring(0, 8)}...`)

            const status = await waitForRun(apifyRunId, (s) => {
              if (s === 'running') {
                const elapsed = Math.round((Date.now() - startedAt) / 1000)
                updateMetrics({ elapsedSeconds: elapsed })
              }
            })

            if (status === 'failed') {
              addLog(`  ❌ Run failed for "${jobTitle}"`)
              return []
            }

            setScraperStep('fetching_results')
            addLog(`  📥 Fetching results...`)
            let rawResults = await fetchRunResults(apifyRunId, maxResults)
            if (rawResults.length > maxResults) rawResults = rawResults.slice(0, maxResults)
            addLog(`  ✅ Got ${rawResults.length} raw results for "${jobTitle}"`)
            return rawResults
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error'
            addLog(`  ❌ Error for "${jobTitle}": ${msg}`)
            return []
          }
        })

        const results = await Promise.all(searchPromises)
        const allRawJobs = results.flat()

        updateMetrics({ totalRaw: allRawJobs.length })
        addLog(`📦 Total raw jobs: ${allRawJobs.length} — running filters...`)

        setScraperStep('filtering')

        const { passed: processedJobs, filteredRecords } = processJobs(
          allRawJobs, minAgeDays, salesOnlyFilter
        )

        // ─── Track age-filtered jobs in history ──────────────────────────
        // If 7+ days filter is on, jobs that are too fresh get logged with
        // reason "too_new" so they appear in scraper history.
        let historyFilteredRecords: FilteredJobRecord[] = [...filteredRecords]
        if (filterOlderThan7Days) {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          let ageFilteredCount = 0
          for (const job of processedJobs) {
            if (!job.datePostedRaw) continue
            const daysOld = getDaysBetween(new Date(job.datePostedRaw), today)
            if (daysOld < 7) {
              const ageLabel =
                daysOld === 0 ? 'today'
                : daysOld === 1 ? 'yesterday'
                : `${daysOld} day${daysOld !== 1 ? 's' : ''} ago`
              historyFilteredRecords.push({
                companyName: job.companyName,
                jobTitle: job.jobTitle,
                reason: `Posted ${ageLabel} — hidden by "7+ days only" display filter`,
                category: 'too_new',
                confidence: 100,
                jobLink: job.jobLink ?? undefined,
              })
              ageFilteredCount++
            }
          }
          if (ageFilteredCount > 0) {
            addLog(`🕐 ${ageFilteredCount} fresh job${ageFilteredCount !== 1 ? 's' : ''} hidden by 7+ days filter (logged to history)`)
          }
        }

        const elapsed = Math.round((Date.now() - startedAt) / 1000)
        updateMetrics({
          totalRaw: allRawJobs.length,
          validLeads: processedJobs.length,
          filteredOut: filteredRecords.length,
          elapsedSeconds: elapsed,
        })

        if (!isLoadMore) {
          setJobs(processedJobs)
          setHasMore(processedJobs.length >= maxResults * jobTitles.length)
          setCurrentOffset(offset + maxResults)
          setLastSearchParams({
            jobTitles, city, maxResults, skipPages, minAgeDays,
            salesOnly: salesOnlyFilter, filterOlderThan7Days,
          })

          if (historyId) {
            await updateScraperHistory(historyId, {
              status: 'completed',
              jobs_found: allRawJobs.length,
              jobs_passed: processedJobs.length,
              jobs_filtered: historyFilteredRecords.length,
              completed_at: new Date().toISOString(),
              filtered_jobs: historyFilteredRecords,
            })
          }

          addLog(`✨ Done in ${elapsed}s! ${processedJobs.length} valid leads from ${allRawJobs.length} jobs (${filteredRecords.length} filtered out)`)
          setScraperStep('done')
        } else {
          const existingUrls = new Set(jobs.map((j) => j.jobLink))
          const newJobs = processedJobs.filter((j) => !existingUrls.has(j.jobLink))
          setJobs((prev) => [...prev, ...newJobs])
          setHasMore(processedJobs.length >= maxResults * jobTitles.length)
          setCurrentOffset(offset + maxResults)
          addLog(`✨ Loaded ${newJobs.length} more (Total: ${jobs.length + newJobs.length})`)
          setScraperStep('done')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)
        addLog(`❌ Error: ${message}`)
        setScraperStep('error')

        if (currentHistoryId) {
          try {
            await updateScraperHistory(currentHistoryId, {
              status: 'failed',
              error_message: message,
              completed_at: new Date().toISOString(),
            })
          } catch { /* ignore */ }
        }
      } finally {
        if (!isLoadMore) setIsLoading(false)
        else setIsLoadingMore(false)
      }
    },
    [addLog, updateMetrics, currentHistoryId, jobs]
  )

  const startScrape = useCallback(
    async (
      jobTitles: string[],
      city: string,
      maxResults: number,
      skipPages: number = 0,
      minAgeDays: number = 0,
      salesOnlyFilter: boolean = true,
      filterOlderThan7Days: boolean = false,
    ) => {
      await performSearch(
        jobTitles, city, maxResults, skipPages, minAgeDays,
        salesOnlyFilter, 0, false, filterOlderThan7Days,
      )
    },
    [performSearch]
  )

  const loadMore = useCallback(async () => {
    if (lastSearchParams && hasMore && !isLoading && !isLoadingMore) {
      await performSearch(
        lastSearchParams.jobTitles,
        lastSearchParams.city,
        lastSearchParams.maxResults,
        lastSearchParams.skipPages,
        lastSearchParams.minAgeDays,
        lastSearchParams.salesOnly,
        currentOffset,
        true,
        lastSearchParams.filterOlderThan7Days,
      )
    }
  }, [lastSearchParams, hasMore, isLoading, isLoadingMore, currentOffset, performSearch])

  const clearResults = useCallback(() => {
    setJobs([])
    setLogs([])
    setError(null)
    setCurrentPage(1)
    setCurrentHistoryId(null)
    setHasMore(false)
    setCurrentOffset(0)
    setLastSearchParams(null)
    setScraperStep('idle')
    setMetrics({ totalRaw: 0, validLeads: 0, filteredOut: 0, stepStartedAt: null, elapsedSeconds: 0 })
  }, [])

  const toggleSalesOnly = useCallback((value: boolean) => { setSalesOnly(value) }, [])

  return {
    isLoading,
    isLoadingMore,
    jobs,
    logs,
    error,
    currentPage,
    totalJobs: jobs.length,
    itemsPerPage: 20,
    hasMore,
    salesOnly,
    scraperStep,
    metrics,
    startScrape,
    loadMore,
    clearResults,
    setCurrentPage,
    toggleSalesOnly,
  }
}