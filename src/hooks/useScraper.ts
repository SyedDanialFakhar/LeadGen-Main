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
  const [lastSearchParams, setLastSearchParams] = useState<{
    jobTitles: string[]
    city: string
    maxResults: number
    skipPages: number
    minAgeDays: number
    salesOnly: boolean
  } | null>(null)

  const addLog = useCallback((message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }, [])

  // ─── Core job processing with enhanced filtering ─────────────────────────

  const processJobs = (
    rawResults: RawSeekJob[],
    _minAgeDays: number = 0,
    filterSalesOnly: boolean = true
  ): { passed: JobResult[]; filteredRecords: FilteredJobRecord[] } => {
    const jobsMap = new Map<string, JobResult>()
    const filteredRecords: FilteredJobRecord[] = []

    // Per-category counters for logging
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

      let companyWebsite: string | null = null
      if (job.companyProfile?.website) companyWebsite = job.companyProfile.website

      // ── Run composite filter ──────────────────────────────────────────────
      const { shouldFilter, verdict } = runAllFilters({
        companyName,
        advertiserName,
        jobTitle,
        description,
        website: companyWebsite,
        classification,
        isPrivate: job.advertiser?.isPrivate,
        filterSalesOnly,
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

      // ── Must have a company website (existing hard requirement) ───────────
      if (!companyWebsite) {
        console.log(`  ❌ [missing_website] ${companyName}: No company website`)
        inc('missing_website')
        filteredRecords.push({
          companyName,
          jobTitle,
          reason: 'No company website found in listing',
          category: 'missing_website',
          confidence: 100,
          jobLink,
        })
        continue
      }

      // ── Must have a company name ──────────────────────────────────────────
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

      // ── PASSED — build JobResult ──────────────────────────────────────────
      console.log(`  ✅ PASSED: ${companyName}`)

      const companyIndustry = job.companyProfile?.industry || null
      const companySize = job.companyProfile?.size || null
      const companyRating = job.companyProfile?.rating || null
      const companyOverview = job.companyProfile?.overview || null
      const companyId = job.advertiser?.id || job.companyProfile?.id || null
      const isVerified = job.advertiser?.isVerified || job.isVerified || false
      const companyLogo = job.advertiser?.logo || null

      const jobLocationInfo = job.joblocationInfo
      const fullLocation = jobLocationInfo?.displayLocation || job.location || 'Location not specified'
      const state = jobLocationInfo?.location?.match(/(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)/)?.[1] || ''
      const country = jobLocationInfo?.country || 'Australia'
      const city = jobLocationInfo?.suburb || jobLocationInfo?.area || fullLocation.split(',')[0] || ''

      const emails = job.emails || []
      const phones = job.phoneNumbers || []
      const contactName = extractContactName(description)

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
        } catch {}
      }

      const salary = job.salary || null
      const workType = job.workTypes?.[0] || null
      const workArrangement = job.workArrangements?.[0] || null
      let numApplicants = null
      if (job.numApplicants && job.numApplicants !== 'N/A') {
        numApplicants = job.numApplicants
      }
      const applyLink = job.applyLink || jobLink

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
        companySlug: job.companyProfile?.companyNameSlug || null,
        companyProfileLink: job.companyProfile
          ? `https://www.seek.com.au/companies/${job.companyProfile.companyNameSlug}`
          : null,
        companyNumberOfReviews: job.companyProfile?.numberOfReviews || null,
        companyPerksAndBenefits: job.companyProfile?.perksAndBenefits || null,
        companyOpenJobs: job.companyOpenJobs || null,
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

    // ── Summary log ─────────────────────────────────────────────────────────
    console.log(`\n📊 Filter Results:`)
    console.log(`  ✅ Passed: ${jobsMap.size}`)
    Object.entries(counts).forEach(([cat, n]) => console.log(`  🚫 ${cat}: ${n}`))

    if (counts['non_sales']) addLog(`📂 Filtered ${counts['non_sales']} non-Sales jobs`)
    if (counts['recruitment_agency'] || counts['recruitment_website']) {
      addLog(`🚫 Filtered ${(counts['recruitment_agency'] || 0) + (counts['recruitment_website'] || 0)} recruitment agencies`)
    }
    if (counts['no_agency_disclaimer']) addLog(`📝 Filtered ${counts['no_agency_disclaimer']} jobs blocking agencies`)
    if (counts['hr_consulting']) addLog(`👥 Filtered ${counts['hr_consulting']} HR consulting companies`)
    if (counts['law_firm']) addLog(`⚖️ Filtered ${counts['law_firm']} law/legal firms`)
    if (counts['private_advertiser']) addLog(`🏢 Filtered ${counts['private_advertiser']} private advertisers`)
    if (counts['missing_website']) addLog(`⚠️ Filtered ${counts['missing_website']} jobs with no website`)

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
      if (!isLoadMore) {
        setIsLoading(true)
        setJobs([])
        setLogs([])
        setError(null)
        setCurrentOffset(0)
        setHasMore(false)
      } else {
        setIsLoadingMore(true)
      }

      if (!isLoadMore) {
        addLog(`🚀 Starting scrape for ${jobTitles.length} job title(s): "${jobTitles.join('", "')}"`)
        addLog(`📍 Location: ${city === 'Australia' ? 'All Australia' : city}`)
        addLog(`📊 Requesting up to ${maxResults} results per job title`)
        addLog(`📂 Sales Only: ${salesOnlyFilter ? 'ON' : 'OFF'}`)
        if (skipPages > 0) addLog(`⏩ Skip mode: skipping first ${skipPages} pages`)
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
            addLog(`  ⏳ Waiting for Apify run: ${apifyRunId.substring(0, 8)}...`)
            const status = await waitForRun(apifyRunId)
            if (status === 'failed') {
              addLog(`  ❌ Run failed for "${jobTitle}"`)
              return []
            }
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
        addLog(`📦 Total raw: ${allRawJobs.length} — filtering...`)

        const { passed: processedJobs, filteredRecords } = processJobs(
          allRawJobs,
          minAgeDays,
          salesOnlyFilter
        )

        if (!isLoadMore) {
          setJobs(processedJobs)
          setHasMore(processedJobs.length >= maxResults * jobTitles.length)
          setCurrentOffset(offset + maxResults)
          setLastSearchParams({ jobTitles, city, maxResults, skipPages, minAgeDays, salesOnly: salesOnlyFilter })

          if (historyId) {
            await updateScraperHistory(historyId, {
              status: 'completed',
              jobs_found: allRawJobs.length,
              jobs_passed: processedJobs.length,
              jobs_filtered: allRawJobs.length - processedJobs.length,
              completed_at: new Date().toISOString(),
              filtered_jobs: filteredRecords,   // ← store detailed records
            })
          }

          addLog(
            `✨ Done! ${processedJobs.length} valid jobs from ${allRawJobs.length} raw (${filteredRecords.length} filtered)`
          )
        } else {
          const existingUrls = new Set(jobs.map(j => j.jobLink))
          const newJobs = processedJobs.filter(j => !existingUrls.has(j.jobLink))
          setJobs(prev => [...prev, ...newJobs])
          setHasMore(processedJobs.length >= maxResults * jobTitles.length)
          setCurrentOffset(offset + maxResults)
          addLog(`✨ Loaded ${newJobs.length} more (Total: ${jobs.length + newJobs.length})`)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)
        addLog(`❌ Error: ${message}`)
      } finally {
        if (!isLoadMore) setIsLoading(false)
        else setIsLoadingMore(false)
      }
    },
    [addLog, currentHistoryId, jobs]
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
  }, [])

  const toggleSalesOnly = useCallback((value: boolean) => { setSalesOnly(value) }, [])

  return {
    isLoading, isLoadingMore, jobs, logs, error,
    currentPage, totalJobs: jobs.length, itemsPerPage: 20,
    hasMore, salesOnly,
    startScrape, loadMore, clearResults, setCurrentPage, toggleSalesOnly,
  }
}