// src/services/apify.ts
/**
 * APIFY SERVICE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * HOW JOB ORDERING WORKS ON SEEK
 * ────────────────────────────────
 * Seek always returns jobs newest-first (sortmode=ListedDate, descending).
 * There is no "oldest-first" option in their public API or URL params.
 *
 * When you request 550 jobs and the Sales category has 600+ active listings,
 * you get positions 1–550 (newest). If most were posted in the last 7 days,
 * the 7+ days filter will hide almost everything.
 *
 * THE FIX: Two strategies combined
 * ──────────────────────────────────
 * 1. daterange=31  — Ask Seek for jobs from the LAST 31 DAYS only.
 *    This still returns newest-first, but caps the freshness ceiling and
 *    ensures older jobs (8–31 days) are in the result pool.
 *
 * 2. AUTO OFFSET   — Skip the first N pages (newest ones) so the returned
 *    batch starts deeper in the listing, where 7+ day old jobs live.
 *    Applied in useScraper when filterOlderThan7Days=true and no manual
 *    skipPages is set (auto = 10 pages = 200 jobs skipped).
 *
 * SALES CLASSIFICATION CONFIRMATION
 * ───────────────────────────────────
 * ✅ classification=1201 is always appended to the Seek search URL.
 * ✅ The actor input also enables every Sales sub-classification flag.
 * All results are from the Seek "Sales" category — nothing changed here.
 */

import type { RawSeekJob, ScrapeConfig } from '@/types'
import { getApifyToken } from './settingsService'

const APIFY_BASE = '/api/apify/v2'
const SEEK_ACTOR_ID = 'websift~seek-job-scraper'
const SEEK_SALES_CLASSIFICATION_ID = '1201'

// ─── How many jobs Seek shows per page (used for offset math) ────────────────
const SEEK_JOBS_PER_PAGE = 20

/**
 * Build the Seek search URL.
 *
 * Key changes vs original:
 * - When filterOlderThan7Days is true AND minAgeDays is 0, we add daterange=31
 *   so the result pool covers the last 31 days (not just the last few days).
 *   The client-side 7-day filter then trims the fresh end.
 */
function buildSeekSearchUrl(config: ScrapeConfig): string {
  const params = new URLSearchParams()

  if (config.roleQuery) {
    params.append('keywords', config.roleQuery)
  }

  if (config.city && config.city !== 'Australia') {
    params.append('where', config.city)
  }

  // ✅ Sales classification — always applied (confirmed working)
  if (config.salesOnly !== false) {
    params.append('classification', SEEK_SALES_CLASSIFICATION_ID)
  }

  // Always sort by ListedDate so offset skipping is predictable
  params.append('sortmode', 'ListedDate')

  // ─── Date range logic ─────────────────────────────────────────────────────
  const minAgeDays = config.minAgeDays || 0

  if (minAgeDays > 0) {
    // User explicitly set a date range — respect it
    let dateRange = 31
    if (minAgeDays <= 1)       dateRange = 1
    else if (minAgeDays <= 3)  dateRange = 3
    else if (minAgeDays <= 7)  dateRange = 7
    else if (minAgeDays <= 14) dateRange = 14
    else if (minAgeDays <= 30) dateRange = 31
    else                       dateRange = 365
    params.append('daterange', String(dateRange))
    console.log(`📅 User date filter: last ${dateRange} days`)

  } else if (config.filterOlderThan7Days) {
    // ⭐ AUTO: No manual date filter set, but user wants 7+ day old jobs.
    // Use a 31-day window so both fresh (to be filtered out client-side)
    // AND older (7–31 days, which is what we want) jobs are in the pool.
    params.append('daterange', '31')
    console.log(`📅 Auto date filter: last 31 days (filterOlderThan7Days=true)`)
  }
  // else: no daterange = Seek returns all time, newest first

  const finalUrl = `https://www.seek.com.au/jobs?${params.toString()}`
  console.log(`🔗 Seek URL: ${finalUrl}`)
  return finalUrl
}

/**
 * Run the Seek scraper actor on Apify.
 *
 * offset logic:
 *   config.offset is the raw skipPages value from the UI (0 = no skip).
 *   The actual byte-offset passed to Apify is skipPages × SEEK_JOBS_PER_PAGE.
 *
 * When filterOlderThan7Days is true the caller (useScraper) already bumped
 * config.offset to AUTO_SKIP_PAGES if the user hadn't set one manually,
 * so we don't need extra logic here.
 */
export async function runSeekScraper(config: ScrapeConfig): Promise<string> {
  const token = await getApifyToken()
  if (!token) {
    throw new Error('Apify token not configured. Please add it in Settings.')
  }

  const searchUrl = buildSeekSearchUrl(config)
  const maxResults = config.maxResults || 20

  // Convert skip-pages count → item offset
  const skipPages   = config.offset || 0
  const offsetCount = skipPages * SEEK_JOBS_PER_PAGE

  const input: Record<string, unknown> = {
    searchUrl,
    maxResults,

    // Skip N items (pages × 20) to reach older listings
    ...(offsetCount > 0 ? { offset: offsetCount } : {}),

    // ✅ Sales sub-classification flags (confirmed — all results are Sales)
    'sales': true,
    'sales-account-relationship-management': true,
    'sales-management': true,
    'new-business-development': true,
    'sales-representatives-consultants': true,
    'sales-coordinators': true,
    'sales-analysis-reporting': true,
    'sales-other': true,

    workTypes: ['fulltime', 'parttime', 'contract'],
    sortBy: 'ListedDate',
    proxyConfiguration: { useApifyProxy: true },
  }

  console.log('═══════════════════════════════════════════════════════')
  console.log('📦 Apify Input:')
  console.log(`   • URL:        ${searchUrl}`)
  console.log(`   • maxResults: ${maxResults}`)
  console.log(`   • offset:     ${offsetCount} (skip ${skipPages} pages × ${SEEK_JOBS_PER_PAGE} jobs)`)
  console.log(`   • sortBy:     ListedDate`)
  console.log(`   • 7+days:     ${config.filterOlderThan7Days ? 'YES (daterange=31 applied)' : 'NO'}`)
  console.log('═══════════════════════════════════════════════════════')

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
        if (errorJson.error?.message) errorMessage = `Apify error: ${errorJson.error.message}`
      } catch { /* use default */ }
      throw new Error(errorMessage)
    }

    const result = await response.json()
    const runId  = result.data.id
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

  if (!response.ok) throw new Error(`Failed to poll run status: ${response.status}`)

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

  if (!runResponse.ok) throw new Error(`Failed to get run details: ${runResponse.status}`)

  const runData    = await runResponse.json()
  const datasetId  = runData.data.defaultDatasetId

  if (!datasetId) throw new Error('No dataset found for this run')

  const actualLimit = limit || 50
  const response    = await fetch(
    `${APIFY_BASE}/datasets/${datasetId}/items?limit=${actualLimit}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )

  if (!response.ok) throw new Error(`Failed to fetch run results: ${response.status}`)

  const data = await response.json()
  console.log(`✅ Fetched ${data.length} jobs from Apify`)

  return data.length > actualLimit ? data.slice(0, actualLimit) : data
}

/**
 * Wait for run to complete with timeout
 */
export async function waitForRun(
  runId: string,
  onProgress?: (status: string) => void,
  timeoutMs = 180000
): Promise<'succeeded' | 'failed'> {
  const start        = Date.now()
  let   pollCount    = 0
  const pollInterval = 3000

  while (Date.now() - start < timeoutMs) {
    pollCount++
    const status  = await pollRunStatus(runId)
    onProgress?.(status)
    const elapsed = Math.floor((Date.now() - start) / 1000)

    if (pollCount % 5 === 0) {
      console.log(`🔄 Poll ${pollCount}: ${status} (${elapsed}s elapsed)`)
    }

    if (status === 'succeeded') { console.log(`✅ Run completed in ${elapsed}s`); return 'succeeded' }
    if (status === 'failed')    { console.log(`❌ Run failed after ${elapsed}s`);  return 'failed'    }

    await new Promise((res) => setTimeout(res, pollInterval))
  }

  throw new Error(`Run timed out after ${Math.floor(timeoutMs / 1000)}s`)
}