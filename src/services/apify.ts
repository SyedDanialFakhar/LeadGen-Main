// src/services/apify.ts
import type { RawSeekJob, ScrapeConfig } from '@/types'
import { getApifyToken } from './settingsService'

const APIFY_BASE = '/api/apify/v2'
// CHANGED: Using parseforge/seek-scraper which properly supports dateRange
const SEEK_ACTOR_ID = 'parseforge~seek-scraper'

/**
 * Builds a SEEK search URL with proper dateRange filtering
 * This actor respects the dateRange parameter correctly
 */
function buildSeekSearchUrl(config: ScrapeConfig): string {
  const params = new URLSearchParams({
    keywords: config.roleQuery,
    sortMode: 'KeywordRelevance',
  })

  // Add location if not 'Australia'
  if (config.city && config.city !== 'Australia') {
    params.append('where', config.city)
  }

  const minAgeDays = config.minAgeDays || 0

  // dateRange works with parseforge/seek-scraper!
  if (minAgeDays > 0) {
    // Valid dateRange values: 1, 3, 7, 14, 30
    let dateRange = 7
    if (minAgeDays <= 1) dateRange = 1
    else if (minAgeDays <= 3) dateRange = 3
    else if (minAgeDays <= 7) dateRange = 7
    else if (minAgeDays <= 14) dateRange = 14
    else dateRange = 30
    
    params.append('dateRange', String(dateRange))
    console.log(`📅 Date range mode: fetching jobs from last ${dateRange} days`)
  }

  const finalUrl = `https://www.seek.com.au/jobs?${params.toString()}`
  console.log('✅ Final Seek URL:', finalUrl)

  return finalUrl
}

export async function runSeekScraper(config: ScrapeConfig): Promise<string> {
  const token = await getApifyToken()
  if (!token) throw new Error('Apify token not configured. Please add it in Settings.')

  const searchUrl = buildSeekSearchUrl(config)

  // Different input format for parseforge/seek-scraper
  const input = {
    startUrl: searchUrl,
    maxItems: config.maxResults || 20,
    includeDetails: true,  // Get full job details including description for filtering
  }

  console.log('📦 Apify input:', JSON.stringify(input, null, 2))

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
    console.error('Apify API error:', errorText)

    let errorMessage = `Apify run failed: ${response.status}`
    try {
      const errorJson = JSON.parse(errorText)
      if (errorJson.error?.message) {
        errorMessage = `Apify error: ${errorJson.error.message}`
      }
    } catch (e) {
      errorMessage = `Apify run failed: ${response.status}`
    }

    throw new Error(errorMessage)
  }

  const result = await response.json()
  return result.data.id
}

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

  const actualLimit = limit || 20
  const response = await fetch(
    `${APIFY_BASE}/datasets/${datasetId}/items?limit=${actualLimit}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch run results: ${response.status}`)
  }

  const data = await response.json()

  if (data.length > actualLimit) {
    console.log(`⚠️ API returned ${data.length}, limiting to ${actualLimit}`)
    return data.slice(0, actualLimit)
  }

  return data
}

export async function waitForRun(
  runId: string,
  onProgress?: (status: string) => void,
  timeoutMs = 120000
): Promise<'succeeded' | 'failed'> {
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    const status = await pollRunStatus(runId)
    onProgress?.(status)

    if (status === 'succeeded') return 'succeeded'
    if (status === 'failed') return 'failed'

    await new Promise((res) => setTimeout(res, 3000))
  }

  throw new Error('Apify run timed out after 2 minutes')
}