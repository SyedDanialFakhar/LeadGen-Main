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
  isJobOldEnough,
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

  const processJobs = (rawResults: RawSeekJob[], minAgeDays: number = 0): JobResult[] => {
    const jobsMap = new Map<string, JobResult>()
    let invalidWebsiteCount = 0
    let filteredByAge = 0
    let filteredByAgency = 0
    let filteredByPrivate = 0
    let filteredByPhrases = 0

    for (const job of rawResults) {
      const description = job.content?.unEditedContent || ''
      const companyName = job.advertiser?.name || job.companyProfile?.name || ''
      const advertiserName = job.advertiser?.name || ''
      const jobUrl = job.jobLink || `https://www.seek.com.au/job/${job.id}`

      // Skip duplicates
      if (jobsMap.has(jobUrl)) continue

      // ---- FILTER 1: Recruitment Agency Check ----
      if (isRecruitmentAgency(companyName, advertiserName)) {
        filteredByAgency++
        addLog(`🚫 Filtered out agency: ${companyName || advertiserName}`)
        continue
      }

      // ---- FILTER 2: Private Advertiser Check ----
      if (isPrivateAdvertiser(advertiserName)) {
        filteredByPrivate++
        addLog(`🏢 Filtered out private advertiser: ${companyName || advertiserName}`)
        continue
      }

      // ---- FILTER 3: Unwanted Phrases Check ----
      if (hasUnwantedPhrases(description)) {
        filteredByPhrases++
        addLog(`📝 Filtered out: ${companyName || advertiserName} (contains "no agency" disclaimer)`)
        continue
      }

      // ---- FILTER 4: Age check ----
      if (minAgeDays > 0 && job.listedAt) {
        try {
          const postedDate = new Date(job.listedAt)
          const today = new Date()
          const diffMs = today.getTime() - postedDate.getTime()
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

          // Keep jobs within the requested window
          if (diffDays > minAgeDays) {
            filteredByAge++
            continue
          }
        } catch (e) {
          // If date parse fails, keep the job
        }
      }

      // Extract contact info
      const emails = job.emails || extractEmails(description)
      const phones = job.phoneNumbers || extractPhones(description)
      const contactName = job.recruiterProfile?.name || extractContactName(description)

      // Format date
      let formattedDate = 'Recently posted'
      if (job.listedAt) {
        try {
          const date = new Date(job.listedAt)
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
      let location = 'Location not specified'
      let state = ''
      let country = 'Australia'

      if (job.joblocationInfo?.displayLocation) {
        location = job.joblocationInfo.displayLocation
        const stateMatch = location.match(/(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)/)
        if (stateMatch) state = stateMatch[1]
      } else if (job.joblocationInfo?.location) {
        location = job.joblocationInfo.location
      }

      if (job.joblocationInfo?.country) {
        country = job.joblocationInfo.country
      }

      // Get company details with null checks
      const companyProfile = job.companyProfile || {}

      // Handle invalid website URLs
      let companyWebsite: string | null = null
      if (
        companyProfile.website &&
        companyProfile.website !== 'N/A' &&
        companyProfile.website !== "Failed to construct 'URL': Invalid URL" &&
        !companyProfile.website.includes('Failed to construct')
      ) {
        companyWebsite = companyProfile.website
      }

      if (!companyWebsite) invalidWebsiteCount++

      const companyIndustry =
        companyProfile.industry && companyProfile.industry !== 'N/A' ? companyProfile.industry : null
      const companySize =
        companyProfile.size && companyProfile.size !== 'N/A' ? companyProfile.size : null
      const companyRating =
        companyProfile.rating && typeof companyProfile.rating === 'number' && companyProfile.rating > 0
          ? companyProfile.rating
          : null
      const companyOverview =
        companyProfile.overview && companyProfile.overview !== 'N, /, A'
          ? companyProfile.overview
          : null
      const companyId = companyProfile.id || null
      const companySlug = companyProfile.companyNameSlug || null
      const companyProfileLink = companyProfile.profile || null
      const companyNumberOfReviews =
        companyProfile.numberOfReviews && typeof companyProfile.numberOfReviews === 'number' && companyProfile.numberOfReviews > 0
          ? companyProfile.numberOfReviews
          : null
      const companyPerksAndBenefits = companyProfile.perksAndBenefits || null
      const companyOpenJobs = job.companyOpenJobs || null
      const companyTags = job.companyTags || []

      // Get work details
      const workType = job.workTypes || null
      const workArrangement = job.workArrangements || null

      // Get classification
      const classification = job.classificationInfo?.classification || ''
      const subClassification = job.classificationInfo?.subClassification || ''

      // Get applicant count
      const numApplicants = job.numApplicants || null

      // Get expiry date
      let expiresAt: string | null = null
      if (job.expiresAtUtc) {
        try {
          const expiryDate = new Date(job.expiresAtUtc)
          if (!isNaN(expiryDate.getTime())) {
            expiresAt = expiryDate.toLocaleDateString('en-AU')
          }
        } catch (e) {}
      }

      jobsMap.set(jobUrl, {
        id: `${job.id}`,
        companyId,
        companyName,
        companyWebsite,
        companyIndustry,
        companySize,
        companyRating,
        companyOverview,
        companySlug,
        companyProfileLink,
        companyNumberOfReviews,
        companyPerksAndBenefits,
        companyOpenJobs,
        companyTags,
        jobTitle: job.title || 'Unknown Position',
        jobLink: jobUrl,
        applyLink: job.applyLink || '',
        salary: job.salary || null,
        datePosted: formattedDate,
        datePostedRaw: job.listedAt || '',
        expiresAt,
        city: location,
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
        isVerified: job.isVerified || false,
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
    if (filteredByAge > 0) {
      addLog(`📅 ${filteredByAge} jobs removed by age post-filter`)
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

        if (skipPages > 0 && minAgeDays === 0) {
          addLog(`⏩ Skip mode: skipping first ${skipPages} pages (~${skipPages * 20} newest jobs)`)
          addLog(`📌 This fetches older jobs — estimated age: ${getEstimatedAge(skipPages)}`)
        } else if (minAgeDays > 0 && skipPages === 0) {
          addLog(`📅 Date filter: fetching jobs posted in the last ${minAgeDays} days`)
          addLog(`💡 Seek's server-side dateRange filter is active — saves API credits!`)
        } else {
          addLog(`📄 No filters — fetching newest jobs from page 1`)
        }
      } else {
        addLog(`🔄 Loading more results (offset: ${offset})...`)
      }

      try {
        let historyId = currentHistoryId
        if (!isLoadMore) {
          historyId = await createScraperHistory(jobTitles.join(', '), city)
          setCurrentHistoryId(historyId)
        }

        // Run all searches in PARALLEL for speed
        const searchPromises = jobTitles.map(async (jobTitle) => {
          const config: ScrapeConfig = {
            platform: 'seek',
            city: city as City,
            roleQuery: jobTitle,
            minAgeDays: minAgeDays,
            maxResults: maxResults,
            offset: skipPages,
          }

          addLog(`  🔍 Searching: "${jobTitle}" in ${city === 'Australia' ? 'All Australia' : city}`)

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

        const processedJobs = processJobs(allRawJobs, minAgeDays)

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

// Helper: estimate job age from skip pages
function getEstimatedAge(skipPages: number): string {
  if (skipPages <= 5) return '~3-5 days old'
  if (skipPages <= 10) return '~7-10 days old'
  if (skipPages <= 15) return '~10-14 days old'
  if (skipPages <= 20) return '~14-21 days old'
  return '~21-30 days old'
}