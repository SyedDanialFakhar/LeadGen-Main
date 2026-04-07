// src/hooks/useScraper.ts
import { useState, useCallback } from 'react'
import { MIN_AD_AGE_DAYS } from '@/utils/constants'
import { runSeekScraper, waitForRun, fetchRunResults } from '@/services/apify'
import { 
  extractEmails, 
  extractPhones, 
  extractContactName,
  isRecruitmentAgency,
  hasUnwantedPhrases,
  isPrivateAdvertiser
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
    jobTitles: string[], 
    city: string, 
    maxResults: number 
  } | null>(null)

  const addLog = useCallback((message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }, [])

  const processJobs = (rawResults: RawSeekJob[]): JobResult[] => {
    const jobsMap = new Map<string, JobResult>()
    
    for (const job of rawResults) {
      const description = job.content?.unEditedContent || ''
      const companyName = job.advertiser?.name || job.companyProfile?.name || ''
      
      // Apply filters
      if (isRecruitmentAgency(companyName, job.advertiser?.name)) continue
      if (hasUnwantedPhrases(description)) continue
      if (isPrivateAdvertiser(job.advertiser?.name)) continue
      
      const jobUrl = job.jobLink || `https://www.seek.com.au/job/${job.id}`
      
      // Skip duplicates
      if (jobsMap.has(jobUrl)) continue
      
      // Extract contact info
      const emails = job.emails || extractEmails(description)
      const phones = job.phoneNumbers || extractPhones(description)
      
      let contactName = null
      if (job.recruiterProfile?.name && job.recruiterProfile.name !== 'N/A') {
        contactName = job.recruiterProfile.name
      } else {
        contactName = extractContactName(description)
      }
      
      // Format date
      let formattedDate = 'Recently posted'
      if (job.listedAt) {
        try {
          const date = new Date(job.listedAt)
          if (!isNaN(date.getTime())) {
            formattedDate = date.toLocaleDateString('en-AU', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
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
      
      // Get company details
      const companyId = job.companyProfile?.id || ''
      const companyWebsite = job.companyProfile?.website || ''
      const companyIndustry = job.companyProfile?.industry || ''
      const companySize = job.companyProfile?.size || ''
      const companyRating = job.companyProfile?.rating || 0
      const companyOverview = job.companyProfile?.overview || ''
      
      // Get work details
      const workType = job.workTypes || null
      const workArrangement = job.workArrangements || null
      
      // Get classification
      const classification = job.classificationInfo?.classification || ''
      const subClassification = job.classificationInfo?.subClassification || ''
      
      // Get applicant count
      const numApplicants = job.numApplicants || null
      
      // Get expiry date
      let expiresAt = null
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
        companyId: companyId,
        companyName: companyName,
        companyWebsite: companyWebsite,
        companyIndustry: companyIndustry,
        companySize: companySize,
        companyRating: companyRating,
        companyOverview: companyOverview.substring(0, 500),
        jobTitle: job.title || 'Unknown Position',
        jobLink: jobUrl,
        applyLink: job.applyLink || '',
        salary: job.salary || null,
        datePosted: formattedDate,
        datePostedRaw: job.listedAt || '',
        expiresAt: expiresAt,
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
        isVerified: job.isVerified || false,
        platform: 'seek',
      })
    }
    
    return Array.from(jobsMap.values())
  }

  const performSearch = useCallback(async (
    jobTitles: string[], 
    city: string, 
    maxResults: number,
    offset: number = 0,
    isLoadMore: boolean = false
  ) => {
    if (!isLoadMore) {
      setIsLoading(true)
    } else {
      setIsLoadingMore(true)
    }
    
    if (!isLoadMore) {
      setJobs([])
      setLogs([])
      setError(null)
      setCurrentOffset(0)
      setHasMore(false)
    }
    
    const jobTitlesList = jobTitles.join('", "')
    if (!isLoadMore) {
      addLog(`🚀 Starting scrape for ${jobTitles.length} job titles: "${jobTitlesList}"`)
      addLog(`📍 Location: ${city === 'Australia' ? 'All Australia' : city}`)
      addLog(`📊 Requesting ${maxResults} results per search`)
    } else {
      addLog(`🔄 Loading more results (offset: ${offset})...`)
    }
    
    try {
      let historyId = currentHistoryId
      if (!isLoadMore) {
        historyId = await createScraperHistory(jobTitles.join(', '), city)
        setCurrentHistoryId(historyId)
      }
      
      // Run ALL searches in PARALLEL
      const searchPromises = jobTitles.map(async (jobTitle) => {
        const config: ScrapeConfig = {
          platform: 'seek',
          city: city as City,
          roleQuery: jobTitle,
          minAgeDays: MIN_AD_AGE_DAYS,
          maxResults: maxResults,
          offset: offset,
        }
        
        try {
          const apifyRunId = await runSeekScraper(config)
          const status = await waitForRun(apifyRunId)
          if (status === 'failed') return []
          let rawResults = await fetchRunResults(apifyRunId)
          // Ensure we don't exceed maxResults
          if (rawResults.length > maxResults) {
            rawResults = rawResults.slice(0, maxResults)
          }
          return rawResults
        } catch (err) {
          addLog(`  ❌ Error for "${jobTitle}"`)
          return []
        }
      })
      
      const results = await Promise.all(searchPromises)
      const allRawJobs = results.flat()
      
      const processedJobs = processJobs(allRawJobs)
      
      if (!isLoadMore) {
        setJobs(processedJobs)
        setHasMore(processedJobs.length === maxResults * jobTitles.length)
        setCurrentOffset(offset + maxResults)
        setLastSearchParams({ jobTitles, city, maxResults })
        
        if (historyId) {
          await updateScraperHistory(historyId, {
            status: 'completed',
            jobs_found: allRawJobs.length,
            jobs_passed: processedJobs.length,
            jobs_filtered: allRawJobs.length - processedJobs.length,
            completed_at: new Date().toISOString(),
          })
        }
        
        addLog(`✨ Complete! Found ${processedJobs.length} valid jobs`)
      } else {
        const existingUrls = new Set(jobs.map(j => j.jobLink))
        const newJobs = processedJobs.filter(j => !existingUrls.has(j.jobLink))
        setJobs(prev => [...prev, ...newJobs])
        setHasMore(processedJobs.length === maxResults * jobTitles.length)
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
  }, [addLog, currentHistoryId, jobs])

  const startScrape = useCallback(async (jobTitles: string[], city: string, maxResults: number) => {
    await performSearch(jobTitles, city, maxResults, 0, false)
  }, [performSearch])

  const loadMore = useCallback(async () => {
    if (lastSearchParams && hasMore && !isLoading && !isLoadingMore) {
      await performSearch(
        lastSearchParams.jobTitles, 
        lastSearchParams.city, 
        lastSearchParams.maxResults, 
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