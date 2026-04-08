// src/hooks/useScraper.ts
import { useState, useCallback } from 'react'
import { runSeekScraper, waitForRun, fetchRunResults } from '@/services/apify'
import {
  extractEmails,
  extractPhones,
  extractContactName,
  isRecruitmentAgency,
  hasUnwantedPhrases,
  isPrivateAdvertiser,
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
  const [lastSearchParams, setLastSearchParams] = useState<{
    jobTitles: string[]
    city: string
    maxResults: number
    skipPages: number
    minAgeDays: number
  } | null>(null)

  const addLog = useCallback((message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }, [])

  // ParseForge field mapping
  const processJobs = (rawResults: RawSeekJob[], minAgeDays: number = 0): JobResult[] => {
    const jobsMap = new Map<string, JobResult>()
    let invalidWebsiteCount = 0
    let filteredByAgency = 0
    let filteredByPrivate = 0
    let filteredByPhrases = 0

    for (const job of rawResults) {
      // ParseForge uses different field names
      const description = job.jobContent || job.jobAbstract || ''
      const companyName = job.companyName || ''
      const advertiserName = job.companyName || ''
      const jobUrl = job.url || job.shareLink || `https://www.seek.com.au/job/${job.jobId}`
      const listedAt = job.listingDate || job.scrapedAt || ''
      
      // Extract emails and phones from description
      const emails = extractEmails(description)
      const phones = job.phoneNumber ? [job.phoneNumber] : extractPhones(description)
      const contactName = extractContactName(description)
      
      // Check for unwanted phrases in description
      if (hasUnwantedPhrases(description)) {
        filteredByPhrases++
        continue
      }
      
      // Check for recruitment agency
      if (isRecruitmentAgency(companyName, advertiserName)) {
        filteredByAgency++
        continue
      }
      
      // Check for private advertiser (if company name contains private)
      if (isPrivateAdvertiser(advertiserName)) {
        filteredByPrivate++
        continue
      }

      // Format date
      let formattedDate = 'Recently posted'
      if (listedAt) {
        try {
          const date = new Date(listedAt)
          if (!isNaN(date.getTime())) {
            formattedDate = date.toLocaleDateString('en-AU', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })
          }
        } catch (e) {}
      }

      // Get location details
      let location = job.location || 'Location not specified'
      let state = ''
      let country = 'Australia'
      
      const stateMatch = location.match(/(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)/)
      if (stateMatch) state = stateMatch[1]

      // Get company website from companyProfileUrl
      let companyWebsite: string | null = null
      if (job.companyProfileUrl && job.companyProfileUrl !== 'N/A') {
        companyWebsite = job.companyProfileUrl
      }
      if (!companyWebsite) invalidWebsiteCount++

      // Get salary
      const salary = job.salaryLabel || null
      
      // Get work details
      const workType = job.workType || null
      const workArrangement = job.workArrangement || null
      
      // Get classification
      const classification = job.classification || ''
      const subClassification = job.subClassification || ''
      
      // Get isVerified (inverse of isExpired)
      const isVerified = !job.isExpired
      
      // Get applicant count (not available in parseforge, set to null)
      const numApplicants = null
      
      // Get company size (not available in parseforge)
      const companySize = null
      const companyIndustry = null
      const companyRating = null
      const companyOverview = null
      const companyId = job.advertiserId || null

      jobsMap.set(jobUrl, {
        id: job.jobId || `${Date.now()}`,
        companyId,
        companyName,
        companyWebsite,
        companyIndustry,
        companySize,
        companyRating,
        companyOverview,
        companySlug: null,
        companyProfileLink: job.companyProfileUrl || null,
        companyNumberOfReviews: null,
        companyPerksAndBenefits: null,
        companyOpenJobs: null,
        companyTags: [],
        jobTitle: job.title || 'Unknown Position',
        jobLink: jobUrl,
        applyLink: jobUrl,
        salary: salary,
        datePosted: formattedDate,
        datePostedRaw: listedAt,
        expiresAt: null,
        city: location,
        state: state,
        country: country,
        workType: workType,
        workArrangement: workArrangement,
        numApplicants: numApplicants,
        classification: classification,
        subClassification: subClassification,
        emails: emails,
        phones: phones,
        contactName: contactName,
        description: description.substring(0, 1000),
        isVerified: isVerified,
        platform: 'seek',
      })
    }

    // Log filter statistics
    if (filteredByAgency > 0) {
      addLog(`🚫 Filtered out ${filteredByAgency} recruitment agencies`)
    }
    if (filteredByPrivate > 0) {
      addLog(`🏢 Filtered out ${filteredByPrivate} private advertisers`)
    }
    if (filteredByPhrases > 0) {
      addLog(`📝 Filtered out ${filteredByPhrases} jobs with unwanted phrases`)
    }
    if (invalidWebsiteCount > 0) {
      console.log(`⚠️ ${invalidWebsiteCount} jobs had invalid or missing company websites`)
    }

    return Array.from(jobsMap.values())
  }

  const performSearch = useCallback(
    async (
      jobTitles: string[],
      city: string,
      maxResults: number,
      skipPages: number = 0,
      minAgeDays: number = 0,
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

        if (skipPages > 0) {
          addLog(`⏩ Skip mode: skipping first ${skipPages} pages (~${skipPages * 20} newest jobs)`)
          addLog(`📌 Starting from page ${skipPages + 1} to get older jobs`)
        }
        if (minAgeDays > 0) {
          addLog(`📅 Date filter: fetching jobs posted in the last ${minAgeDays} days`)
          addLog(`💡 Seek's server-side date filter is active — saves API credits!`)
        }
        if (skipPages === 0 && minAgeDays === 0) {
          addLog(`📄 No filters — fetching newest jobs from page 1`)
        }
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
            if (rawResults.length > maxResults) {
              rawResults = rawResults.slice(0, maxResults)
            }
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

        addLog(`📦 Total raw results: ${allRawJobs.length} — now processing & filtering...`)

        const processedJobs = processJobs(allRawJobs)

        if (!isLoadMore) {
          setJobs(processedJobs)
          setHasMore(processedJobs.length >= maxResults * jobTitles.length)
          setCurrentOffset(offset + maxResults)
          setLastSearchParams({ jobTitles, city, maxResults, skipPages, minAgeDays })

          if (historyId) {
            await updateScraperHistory(historyId, {
              status: 'completed',
              jobs_found: allRawJobs.length,
              jobs_passed: processedJobs.length,
              jobs_filtered: allRawJobs.length - processedJobs.length,
              completed_at: new Date().toISOString(),
            })
          }

          addLog(
            `✨ Done! ${processedJobs.length} valid jobs from ${allRawJobs.length} raw results (${allRawJobs.length - processedJobs.length} filtered)`
          )
        } else {
          const existingUrls = new Set(jobs.map(j => j.jobLink))
          const newJobs = processedJobs.filter(j => !existingUrls.has(j.jobLink))
          setJobs(prev => [...prev, ...newJobs])
          setHasMore(processedJobs.length >= maxResults * jobTitles.length)
          setCurrentOffset(offset + maxResults)
          addLog(`✨ Loaded ${newJobs.length} more jobs (Total: ${jobs.length + newJobs.length})`)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)
        addLog(`❌ Error: ${message}`)
      } finally {
        if (!isLoadMore) {
          setIsLoading(false)
        } else {
          setIsLoadingMore(false)
        }
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
      minAgeDays: number = 0
    ) => {
      await performSearch(jobTitles, city, maxResults, skipPages, minAgeDays, 0, false)
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
    startScrape,
    loadMore,
    clearResults,
    setCurrentPage,
  }
}