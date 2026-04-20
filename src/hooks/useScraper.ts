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

// ─── Helper: sanitize "N/A" strings that Apify returns ───────────────────────
// Apify returns literal "N/A" strings instead of null for missing data.
// This helper converts them to null so our UI shows "—" instead of "N/A".
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

// ─── Helper: validate extracted contact name ──────────────────────────────────
// The extractContactName regex sometimes pulls in sentence fragments.
// We validate: must be 2 words, each capitalised, no more than 4 words total,
// and must not contain common non-name words.
const NON_NAME_WORDS = [
  'the', 'your', 'our', 'their', 'for', 'and', 'with', 'from', 'about',
  'customer', 'feedback', 'territory', 'role', 'team', 'company', 'position',
  'application', 'opportunity', 'business', 'sales', 'manager', 'director',
  'please', 'directly', 'further', 'information', 'queries', 'questions',
]

function isValidContactName(name: string | null): string | null {
  if (!name) return null
  const words = name.trim().split(/\s+/)
  // Must be 2-4 words
  if (words.length < 2 || words.length > 4) return null
  // Each word must start with a capital letter
  if (!words.every(w => /^[A-Z]/.test(w))) return null
  // Must not contain any non-name words (case-insensitive)
  const lowerName = name.toLowerCase()
  if (NON_NAME_WORDS.some(w => lowerName.includes(w))) return null
  // Each word should be letters only (allow hyphens for hyphenated names)
  if (!words.every(w => /^[A-Za-z-']+$/.test(w))) return null
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
    const inc = (cat: string) => {
      counts[cat] = (counts[cat] || 0) + 1
    }

    for (const job of rawResults) {
      const companyName = job.advertiser?.name || job.companyName || 'Unknown Company'
      const advertiserName = job.advertiser?.name || ''
      const jobTitle = job.title || 'Unknown Position'
      const classification = job.classificationInfo?.classification || job.classification || ''
      const subClassification =
        job.classificationInfo?.subClassification || job.subClassification || ''
      const description = job.content?.unEditedContent || job.content?.jobHook || ''
      const jobLink = job.jobLink || job.url || `https://www.seek.com.au/job/${job.id}`

      // ── FIX: sanitize "N/A" from Apify companyProfile ────────────────────
      let companyWebsite: string | null = null
      const rawWebsite = job.companyProfile?.website || job.companyWebsite || null
      companyWebsite = sanitize(rawWebsite)
      // Also sanitize profile fields that Apify sets to "N/A"
      const companyIndustry = sanitize(job.companyProfile?.industry || null)
      const companySize = sanitize(job.companyProfile?.size || null)
      const rawRating = job.companyProfile?.rating
      const companyRating = sanitizeNumber(rawRating)
      const companyOverview = sanitize(job.companyProfile?.overview || null)
      const companyId = sanitize(job.advertiser?.id || job.companyProfile?.id || null)
      const isVerified = job.advertiser?.isVerified || job.isVerified || false
      // sanitize logo URL
      const rawLogo = job.advertiser?.logo || null
      const companyLogo = sanitize(rawLogo)

      const { shouldFilter, verdict } = runAllFilters({
        companyName,
        advertiserName,
        jobTitle,
        description,
        website: companyWebsite,
        classification,
        isPrivate: job.advertiser?.isPrivate,
        filterSalesOnly: false,
      })

      if (shouldFilter) {
        console.log(`  ❌ [${verdict.category}] ${companyName}: ${verdict.reason}`)
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

      // ── Company website required ──────────────────────────────────────────
      // if (!companyWebsite) {
      //   console.log(`  ❌ [missing_website] ${companyName}: No company website`)
      //   inc('missing_website')
      //   filteredRecords.push({
      //     companyName,
      //     jobTitle,
      //     reason: 'No company website found in listing',
      //     category: 'missing_website',
      //     confidence: 100,
      //     jobLink,
      //   })
      //   continue
      // }

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

      // ── PASSED ────────────────────────────────────────────────────────────
      console.log(`  ✅ PASSED: ${companyName}`)

      const jobLocationInfo = job.joblocationInfo
      const fullLocation =
        jobLocationInfo?.displayLocation || job.location || 'Location not specified'

      // Extract state from location string
      const stateMatch = fullLocation.match(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/)
      const state = stateMatch?.[1] || ''
      const country = jobLocationInfo?.country || 'Australia'

      // City: prefer suburb > displayLocation city part > area
      const city =
        jobLocationInfo?.suburb ||
        (jobLocationInfo?.displayLocation
          ? jobLocationInfo.displayLocation.split(' ').slice(0, -1).join(' ') // remove state suffix
          : null) ||
        jobLocationInfo?.area ||
        fullLocation.split(',')[0] ||
        ''

      // ── FIX: Emails and phones come from Apify directly (already extracted)
      // Also extract from description as fallback
      const apifyEmails = (job.emails || []).filter(e => e && e !== 'N/A')
      const apifyPhones = (job.phoneNumbers || []).filter(p => p && p !== 'N/A')
      const descEmails = extractEmails(description)
      const descPhones = extractPhones(description)

      // Merge and deduplicate — Apify extracted first (more reliable)
      const emails = [...new Set([...apifyEmails, ...descEmails])]
      const phones = [...new Set([...apifyPhones, ...descPhones])]

      // ── FIX: Validate contact name — only keep if it looks like a real person
      const rawContactName = extractContactName(description)
      const contactName = isValidContactName(rawContactName)

      let formattedDate = 'Recently posted'
      const datePostedRaw = job.listedAt || ''
      if (datePostedRaw) {
        try {
          const date = new Date(datePostedRaw)
          if (!isNaN(date.getTime())) {
            formattedDate = date.toLocaleDateString('en-AU', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })
          }
        } catch {}
      }

      const salary = sanitize(job.salary || null)

      // ── FIX: workTypes is sometimes a string, sometimes an array
      // Apify returns "Full time" or ["Full time"] depending on version
      let workType: string | null = null
      if (Array.isArray(job.workTypes)) {
        workType = sanitize(job.workTypes[0])
      } else if (typeof job.workTypes === 'string') {
        workType = sanitize(job.workTypes)
      }

      let workArrangement: string | null = null
      if (Array.isArray(job.workArrangements)) {
        workArrangement = sanitize(job.workArrangements[0])
      } else if (typeof job.workArrangements === 'string') {
        workArrangement = sanitize(job.workArrangements)
      }

      let numApplicants: string | null = null
      if (job.numApplicants && job.numApplicants !== 'N/A') {
        numApplicants = job.numApplicants
      }
      const applyLink = job.applyLink || jobLink

      // Sanitize company profile fields
      const companySlug = sanitize(job.companyProfile?.companyNameSlug || null)
      const companyProfileLink = companySlug
        ? `https://www.seek.com.au/companies/${companySlug}`
        : null
      const companyNumberOfReviews = sanitizeNumber(job.companyProfile?.numberOfReviews)
      const companyPerksAndBenefits = sanitize(job.companyProfile?.perksAndBenefits || null)

      jobsMap.set(jobLink, {
        id: job.id || `${Date.now()}`,
        companyId,
        companyName,
        companyWebsite,
        companyLogo,
        companyIndustry,
        companySize,
        companyRating,
        companyOverview,
        companySlug,
        companyProfileLink,
        companyNumberOfReviews,
        companyPerksAndBenefits,
        companyOpenJobs: sanitize(job.companyOpenJobs || null),
        companyTags: job.companyTags || [],
        jobTitle,
        jobLink,
        applyLink,
        salary,
        datePosted: formattedDate,
        datePostedRaw,
        expiresAt: job.expiresAtUtc || null,
        city,
        location: fullLocation,
        state,
        country,
        workType,
        workArrangement,
        numApplicants,
        classification,
        subClassification,
        emails,
        phones,
        contactName,
        description: description.substring(0, 1000),
        isVerified,
        platform: 'seek',
      })
    }

    console.log(`\n📊 Filter Results:`)
    console.log(`  ✅ Passed: ${jobsMap.size}`)
    Object.entries(counts).forEach(([cat, n]) => console.log(`  🚫 ${cat}: ${n}`))

    if (counts['recruitment_agency'] || counts['recruitment_website']) {
      addLog(
        `🚫 Filtered ${(counts['recruitment_agency'] || 0) + (counts['recruitment_website'] || 0)} recruitment agencies`
      )
    }
    if (counts['no_agency_disclaimer'])
      addLog(`📝 Filtered ${counts['no_agency_disclaimer']} jobs blocking agencies`)
    if (counts['hr_consulting'])
      addLog(`👥 Filtered ${counts['hr_consulting']} HR consulting companies`)
    if (counts['law_firm']) addLog(`⚖️ Filtered ${counts['law_firm']} law/legal firms`)
    if (counts['private_advertiser'])
      addLog(`🏢 Filtered ${counts['private_advertiser']} private advertisers`)
    if (counts['missing_website'])
      addLog(`⚠️ Filtered ${counts['missing_website']} jobs with no website`)

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
      isLoadMore: boolean = false
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
        if (skipPages > 0) addLog(`⏩ Skip mode: skipping first ${skipPages * 20} jobs (offset=${skipPages * 20})`)
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
        addLog(`🌐 Launching Apify scraper with Sales classification filter...`)

        const searchPromises = jobTitles.map(async (jobTitle) => {
          const config: ScrapeConfig = {
            platform: 'seek',
            city: city as City,
            roleQuery: jobTitle,
            minAgeDays: minAgeDays,
            maxResults: maxResults,
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
            addLog(`  ✅ Got ${rawResults.length} raw Sales results for "${jobTitle}"`)
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
        addLog(`📦 Total raw Sales jobs: ${allRawJobs.length} — applying agency/firm filters...`)

        setScraperStep('filtering')

        const { passed: processedJobs, filteredRecords } = processJobs(
          allRawJobs,
          minAgeDays,
          salesOnlyFilter
        )

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
            jobTitles,
            city,
            maxResults,
            skipPages,
            minAgeDays,
            salesOnly: salesOnlyFilter,
          })

          if (historyId) {
            await updateScraperHistory(historyId, {
              status: 'completed',
              jobs_found: allRawJobs.length,
              jobs_passed: processedJobs.length,
              jobs_filtered: allRawJobs.length - processedJobs.length,
              completed_at: new Date().toISOString(),
              filtered_jobs: filteredRecords,
            })
          }

          addLog(
            `✨ Done in ${elapsed}s! ${processedJobs.length} valid leads from ${allRawJobs.length} Sales jobs (${filteredRecords.length} agencies/firms filtered)`
          )
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
          } catch {}
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
      salesOnlyFilter: boolean = true
    ) => {
      await performSearch(jobTitles, city, maxResults, skipPages, minAgeDays, salesOnlyFilter, 0, false)
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
        true
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

  const toggleSalesOnly = useCallback((value: boolean) => {
    setSalesOnly(value)
  }, [])

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