// src/services/apify.ts
/**
 * APIFY SERVICE
 * ─────────────────────────────────────────
 * Fix 1: Skip pages now uses Apify's native `offset` parameter instead of
 *        appending `page=N` to the searchUrl, which Apify's actor ignored.
 *        Apify actor supports `offset` directly as an input field.
 *        offset = skipPages * resultsPerPage (default page size = 20)
 *
 * Fix 2: Sales classification still correctly applied via searchUrl
 *        classification=1201 param.
 *
 * Fix 3: sortBy is passed as a proper actor input field (not only in URL)
 *        to ensure Apify respects it.
 */

import type { RawSeekJob, ScrapeConfig } from '@/types'
import { getApifyToken } from './settingsService'

const APIFY_BASE = '/api/apify/v2'
const SEEK_ACTOR_ID = 'websift~seek-job-scraper'

const SEEK_SALES_CLASSIFICATION_ID = '1201'

/**
 * Build the Seek search URL — NO page param here (handled via offset input)
 */
function buildSeekSearchUrl(config: ScrapeConfig): string {
  const params = new URLSearchParams()

  if (config.roleQuery) {
    params.append('keywords', config.roleQuery)
  }

  if (config.city && config.city !== 'Australia') {
    params.append('where', config.city)
  }

  // Sales classification filter
  if (config.salesOnly !== false) {
    params.append('classification', SEEK_SALES_CLASSIFICATION_ID)
  }

  // Sort mode in URL
  if (config.minAgeDays && config.minAgeDays > 0) {
    params.append('sortmode', 'ListedDate')
  } else {
    params.append('sortmode', 'ListedDate') // Always use ListedDate so page offset works correctly
  }

  // Date range filter
  const minAgeDays = config.minAgeDays || 0
  if (minAgeDays > 0) {
    let dateRange = 31
    if (minAgeDays <= 1) dateRange = 1
    else if (minAgeDays <= 3) dateRange = 3
    else if (minAgeDays <= 7) dateRange = 7
    else if (minAgeDays <= 14) dateRange = 14
    else if (minAgeDays <= 30) dateRange = 31
    else dateRange = 365

    params.append('daterange', String(dateRange))
    console.log(`📅 Date filter: last ${dateRange} days`)
  }

  // ⚠️ DO NOT add page= here — use offset input param instead
  const finalUrl = `https://www.seek.com.au/jobs?${params.toString()}`
  console.log(`🔗 Seek URL: ${finalUrl}`)
  return finalUrl
}

/**
 * Run Seek scraper with correct offset-based pagination
 */
export async function runSeekScraper(config: ScrapeConfig): Promise<string> {
  const token = await getApifyToken()
  if (!token) {
    throw new Error('Apify token not configured. Please add it in Settings.')
  }

  const searchUrl = buildSeekSearchUrl(config)
  const maxResults = config.maxResults || 20

  // ⭐ FIX: Calculate offset from skipPages
  // Seek shows ~20 jobs per page, so skip 5 pages = offset 100
  const skipPages = config.offset || 0
  const offsetCount = skipPages * 20 // 20 jobs per Seek page

  const input: Record<string, unknown> = {
    // Primary search URL (with classification filter)
    searchUrl: searchUrl,

    // Max results to fetch
    maxResults: maxResults,

    // ⭐ FIX: Use native offset param — this is how you skip pages in Apify actor
    // offset tells the actor to start from result N instead of result 0
    ...(offsetCount > 0 ? { offset: offsetCount } : {}),

    // Sales sub-classification flags
    'sales': true,
    'sales-account-relationship-management': true,
    'sales-management': true,
    'new-business-development': true,
    'sales-representatives-consultants': true,
    'sales-coordinators': true,
    'sales-analysis-reporting': true,
    'sales-other': true,

    // Work types
    workTypes: ['fulltime', 'parttime', 'contract'],

    // Sort — use ListedDate when skipping pages (most predictable)
    sortBy: 'ListedDate',

    // Proxy
    proxyConfiguration: {
      useApifyProxy: true
    }
  }

  console.log('═══════════════════════════════════════')
  console.log('📦 Apify Input:')
  console.log(`   • URL: ${searchUrl}`)
  console.log(`   • maxResults: ${maxResults}`)
  console.log(`   • offset: ${offsetCount} (skip ${skipPages} pages × 20 jobs)`)
  console.log(`   • sortBy: ListedDate`)
  console.log('═══════════════════════════════════════')

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
      } catch { /* use default */ }
      throw new Error(errorMessage)
    }

    const result = await response.json()
    const runId = result.data.id
    console.log(`✅ Apify run started: ${runId}`)
    return runId

  } catch (error) {
    console.error('❌ Failed to start Apify run:', error)
    throw error
  }
}

/**
 * Poll run status
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
 * Fetch run results from dataset
 */
export async function fetchRunResults(runId: string, limit?: number): Promise<RawSeekJob[]> {
  const token = await getApifyToken()
  if (!token) throw new Error('Apify token not configured')

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

  const actualLimit = limit || 50
  const response = await fetch(
    `${APIFY_BASE}/datasets/${datasetId}/items?limit=${actualLimit}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch run results: ${response.status}`)
  }

  const data = await response.json()
  console.log(`✅ Fetched ${data.length} jobs from Apify`)

  if (data.length > actualLimit) {
    return data.slice(0, actualLimit)
  }

  return data
}

/**
 * Wait for run to complete with timeout
 */
export async function waitForRun(
  runId: string,
  onProgress?: (status: string) => void,
  timeoutMs = 180000
): Promise<'succeeded' | 'failed'> {
  const start = Date.now()
  let pollCount = 0
  const pollInterval = 3000

  while (Date.now() - start < timeoutMs) {
    pollCount++
    const status = await pollRunStatus(runId)
    onProgress?.(status)

    const elapsed = Math.floor((Date.now() - start) / 1000)

    if (pollCount % 5 === 0) {
      console.log(`🔄 Poll ${pollCount}: ${status} (${elapsed}s elapsed)`)
    }

    if (status === 'succeeded') {
      console.log(`✅ Run completed in ${elapsed}s`)
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