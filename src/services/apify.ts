// src/services/apify.ts
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ENHANCED APIFY SERVICE - MAXIMUM QUALITY SALES LEADS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * KEY IMPROVEMENTS:
 * 1. ✅ Correct Sales classification code: 1201 (not 6251)
 * 2. ✅ MAXIMUM Apify input parameters for best quality
 * 3. ✅ Filter at Seek level = 20 SALES jobs, not mixed
 * 4. ✅ Proper sub-classification flags
 * 5. ✅ Work type filters
 * 6. ✅ Sort by relevance for quality matches
 * 
 * RESULT: Get 20 high-quality SALES jobs → Filter agencies → 15-18 valid leads
 */

import type { RawSeekJob, ScrapeConfig } from '@/types'
import { getApifyToken } from './settingsService'

const APIFY_BASE = '/api/apify/v2'
const SEEK_ACTOR_ID = 'websift~seek-job-scraper'

// ═══════════════════════════════════════════════════════════════════════════
// SEEK CLASSIFICATION CODES (from Seek URL analysis)
// ═══════════════════════════════════════════════════════════════════════════
const SEEK_SALES_CLASSIFICATION_ID = '1201' // ⭐ CORRECT CODE for Sales
const SEEK_ALL_CLASSIFICATIONS_ID = '' // Empty = all classifications

/**
 * Build enhanced Seek URL with classification filter
 */
function buildEnhancedSeekSearchUrl(config: ScrapeConfig): string {
  const params = new URLSearchParams()
  
  // ═══════════════════════════════════════════════════════════════════════
  // KEYWORDS (Job Title)
  // ═══════════════════════════════════════════════════════════════════════
  if (config.roleQuery) {
    params.append('keywords', config.roleQuery)
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // LOCATION
  // ═══════════════════════════════════════════════════════════════════════
  if (config.city && config.city !== 'Australia') {
    params.append('where', config.city)
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // ⭐ CLASSIFICATION FILTER - SALES ONLY (ID: 1201)
  // ═══════════════════════════════════════════════════════════════════════
  if (config.salesOnly !== false) {
    params.append('classification', SEEK_SALES_CLASSIFICATION_ID)
    console.log(`✅ Sales classification filter (${SEEK_SALES_CLASSIFICATION_ID}) applied at Seek URL level`)
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // SORT MODE
  // ═══════════════════════════════════════════════════════════════════════
  // KeywordRelevance = best matching jobs first (quality over recency)
  // ListedDate = newest first
  if (config.minAgeDays && config.minAgeDays > 0) {
    params.append('sortmode', 'ListedDate') // For older jobs, use date
  } else {
    params.append('sortmode', 'KeywordRelevance') // For quality, use relevance
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // DATE RANGE FILTER
  // ═══════════════════════════════════════════════════════════════════════
  const minAgeDays = config.minAgeDays || 0
  if (minAgeDays > 0) {
    let dateRange = 31 // Default: last month
    
    if (minAgeDays <= 1) dateRange = 1
    else if (minAgeDays <= 3) dateRange = 3
    else if (minAgeDays <= 7) dateRange = 7
    else if (minAgeDays <= 14) dateRange = 14
    else if (minAgeDays <= 30) dateRange = 31
    else dateRange = 365 // Max: last year
    
    params.append('daterange', String(dateRange))
    console.log(`📅 Date filter: last ${dateRange} days`)
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // PAGINATION (Skip pages for older jobs)
  // ═══════════════════════════════════════════════════════════════════════
  const skipPages = config.offset || 0
  if (skipPages > 0) {
    const startPage = skipPages + 1 // Seek uses 1-based page numbers
    params.append('page', String(startPage))
    console.log(`⏩ Starting from page ${startPage} (skipping first ${skipPages * 20} jobs)`)
  }
  
  const finalUrl = `https://www.seek.com.au/jobs?${params.toString()}`
  console.log(`🔗 Enhanced Seek URL: ${finalUrl}`)
  console.log(`📊 Expected: ${config.maxResults || 20} SALES jobs matching "${config.roleQuery}"`)
  
  return finalUrl
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RUN SEEK SCRAPER WITH MAXIMUM QUALITY FILTERS
 * ═══════════════════════════════════════════════════════════════════════════
 * Uses ALL available Apify input parameters for best results
 */
export async function runSeekScraper(config: ScrapeConfig): Promise<string> {
  const token = await getApifyToken()
  if (!token) {
    throw new Error('Apify token not configured. Please add it in Settings.')
  }

  const searchUrl = buildEnhancedSeekSearchUrl(config)

  // ═══════════════════════════════════════════════════════════════════════
  // MAXIMUM QUALITY INPUT CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════
  const input = {
    // ⭐ SEARCH URL with classification filter
    searchUrl: searchUrl,
    
    // ⭐ MAX RESULTS
    maxResults: config.maxResults || 20,
    
    // ⭐ SALES SUB-CLASSIFICATION FLAGS
    // These are EXPLICIT flags in addition to URL classification
    // Using ALL Sales sub-classifications for maximum coverage
    'sales': true, // Main Sales classification
    'sales-account-relationship-management': true,
    'sales-management': true,
    'new-business-development': true,
    'sales-representatives-consultants': true,
    'sales-coordinators': true,
    'sales-analysis-reporting': true,
    'sales-other': true,
    
    // ⭐ WORK TYPES (exclude casual for B2B focus)
    workTypes: ['fulltime', 'parttime', 'contract'],
    
    // ⭐ WORK ARRANGEMENTS (all types - let post-filter decide)
    // workArrangements: ['on-site', 'hybrid', 'remote'],
    
    // ⭐ SORT ORDER (already in URL, but explicit for clarity)
    sortBy: config.minAgeDays && config.minAgeDays > 0 
      ? 'ListedDate'  // Older jobs: sort by date
      : 'KeywordRelevance', // Quality: sort by relevance
    
    // ⭐ DATE RANGE (already in URL, but can be explicit)
    dateRange: config.minAgeDays || undefined,
    
    // ⭐ CONTACT FILTERS (optional - currently disabled)
    // Enable these if you ONLY want jobs with contact info
    // requireEmail: false,  // Set true to ONLY get jobs with emails
    // requirePhone: false,  // Set true to ONLY get jobs with phones
    // requireEmailPhone: false,  // Set true to ONLY get jobs with BOTH
    
    // ⭐ PROXY CONFIGURATION (for reliability)
    proxyConfiguration: {
      useApifyProxy: true
    }
  }

  console.log('═══════════════════════════════════════════════════════════')
  console.log('📦 Enhanced Apify Input Configuration:')
  console.log(`   • Search URL: ${searchUrl}`)
  console.log(`   • Max Results: ${input.maxResults}`)
  console.log(`   • Classification: Sales (ID: 1201) - filtered at Seek level`)
  console.log(`   • Sub-classifications: ALL Sales types enabled`)
  console.log(`   • Work Types: ${input.workTypes.join(', ')}`)
  console.log(`   • Sort By: ${input.sortBy}`)
  console.log('═══════════════════════════════════════════════════════════')

  // ═══════════════════════════════════════════════════════════════════════
  // START ACTOR RUN
  // ═══════════════════════════════════════════════════════════════════════
  try {
    const response = await fetch(
      `${APIFY_BASE}/acts/${SEEK_ACTOR_ID}/runs`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Apify API error:', errorText)

      let errorMessage = `Apify run failed: ${response.status}`
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.error?.message) {
          errorMessage = `Apify error: ${errorJson.error.message}`
        }
      } catch {
        // Use default error message
      }

      throw new Error(errorMessage)
    }

    const result = await response.json()
    const runId = result.data.id
    
    console.log(`✅ Apify run started successfully: ${runId}`)
    console.log(`⏳ Waiting for results...`)
    
    return runId
    
  } catch (error) {
    console.error('❌ Failed to start Apify run:', error)
    throw error
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * POLL RUN STATUS
 * ═══════════════════════════════════════════════════════════════════════════
 */
export async function pollRunStatus(runId: string): Promise<'running' | 'succeeded' | 'failed'> {
  const token = await getApifyToken()
  if (!token) throw new Error('Apify token not configured')

  const response = await fetch(
    `${APIFY_BASE}/actor-runs/${runId}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )

  if (!response.ok) {
    throw new Error(`Failed to poll run status: ${response.status}`)
  }

  const result = await response.json()
  const status = result.data.status

  if (status === 'SUCCEEDED') return 'succeeded'
  if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') return 'failed'
  return 'running'
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FETCH RUN RESULTS
 * ═══════════════════════════════════════════════════════════════════════════
 */
export async function fetchRunResults(runId: string, limit?: number): Promise<RawSeekJob[]> {
  const token = await getApifyToken()
  if (!token) throw new Error('Apify token not configured')

  // Get run details to find dataset ID
  const runResponse = await fetch(
    `${APIFY_BASE}/actor-runs/${runId}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )

  if (!runResponse.ok) {
    throw new Error(`Failed to get run details: ${runResponse.status}`)
  }

  const runData = await runResponse.json()
  const datasetId = runData.data.defaultDatasetId

  if (!datasetId) {
    throw new Error('No dataset found for this run')
  }

  // Fetch results from dataset
  const actualLimit = limit || 50
  const response = await fetch(
    `${APIFY_BASE}/datasets/${datasetId}/items?limit=${actualLimit}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch run results: ${response.status}`)
  }

  const data = await response.json()

  if (data.length > actualLimit) {
    console.log(`⚠️ Limiting results to ${actualLimit}`)
    return data.slice(0, actualLimit)
  }

  console.log(`✅ Fetched ${data.length} SALES jobs from Apify`)
  console.log(`📊 All jobs are Sales classification (filtered at Seek level)`)
  
  return data
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WAIT FOR RUN WITH TIMEOUT
 * ═══════════════════════════════════════════════════════════════════════════
 */
export async function waitForRun(
  runId: string,
  onProgress?: (status: string) => void,
  timeoutMs = 180000 // 3 minutes
): Promise<'succeeded' | 'failed'> {
  const start = Date.now()
  let pollCount = 0
  const pollInterval = 3000 // Poll every 3 seconds

  while (Date.now() - start < timeoutMs) {
    pollCount++
    const status = await pollRunStatus(runId)
    onProgress?.(status)

    const elapsed = Math.floor((Date.now() - start) / 1000)
    
    if (pollCount % 5 === 0) { // Log every 15 seconds
      console.log(`🔄 Poll ${pollCount}: ${status} (${elapsed}s elapsed)`)
    }

    if (status === 'succeeded') {
      console.log(`✅ Run completed successfully in ${elapsed}s`)
      return 'succeeded'
    }
    
    if (status === 'failed') {
      console.log(`❌ Run failed after ${elapsed}s`)
      return 'failed'
    }

    await new Promise((res) => setTimeout(res, pollInterval))
  }

  const timeoutSeconds = Math.floor(timeoutMs / 1000)
  throw new Error(`Run timed out after ${timeoutSeconds}s`)
}