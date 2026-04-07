// src/services/apify.ts
import type { RawSeekJob, ScrapeConfig } from '@/types'
import { getApifyToken } from './settingsService'

const APIFY_BASE = 'https://api.apify.com/v2'
const SEEK_ACTOR_ID = 'websift~seek-job-scraper'

export async function runSeekScraper(config: ScrapeConfig): Promise<string> {
  const token = await getApifyToken()
  if (!token) throw new Error('Apify token not configured. Please add it in Settings.')

  const input: any = {
    searchTerm: config.roleQuery,
    maxResults: config.maxResults || 20, // This should limit results
    sortBy: 'ListedDate',
  }
  
  // Add offset for pagination
  if (config.offset && config.offset > 0) {
    input.offset = config.offset
  }
  
  // Only add location if not 'Australia'
  if (config.city && config.city !== 'Australia') {
    input.location = config.city
  }
  
  // Add date range if needed
  if (config.minAgeDays && config.minAgeDays > 0) {
    input.dateRange = config.minAgeDays
  }

  console.log('Apify input:', JSON.stringify(input, null, 2))

  const response = await fetch(
    `${APIFY_BASE}/acts/${SEEK_ACTOR_ID}/runs`,
    {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(input),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Apify API error:', errorText)
    throw new Error(`Apify run failed: ${response.status} - ${errorText}`)
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

  // Limit the number of results returned
  const limitParam = limit ? `&limit=${limit}` : ''
  
  const response = await fetch(
    `${APIFY_BASE}/datasets/${datasetId}/items?format=json&limit=1000${limitParam}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch run results: ${response.status}`)
  }

  const data = await response.json()
  
  // If we have a limit, trim the results
  if (limit && data.length > limit) {
    return data.slice(0, limit)
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