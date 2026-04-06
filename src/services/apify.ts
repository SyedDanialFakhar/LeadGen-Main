// src/services/apify.ts
// Triggers Seek job scraping via Apify REST API

import type { RawSeekJob, ScrapeConfig } from '@/types'
import { getApifyToken } from './settingsService'

const APIFY_BASE = 'https://api.apify.com/v2'
const SEEK_ACTOR_ID = 'websift~seek-job-scraper'

interface ApifyRunResponse {
  data: {
    id: string
    status: string
  }
}

export async function runSeekScraper(config: ScrapeConfig): Promise<string> {
  const token = await getApifyToken()
  if (!token) throw new Error('Apify token not configured. Please add it in Settings.')

  // Build input with correct parameter names and values
  const input: any = {
    searchTerm: config.roleQuery,
    maxResults: 100,
    sortBy: 'ListedDate', // Changed from 'date' to 'ListedDate' (must be exactly this)
  }
  
  // Only add location if it's not 'Australia' (meaning search all of Australia)
  if (config.city && config.city !== 'Australia') {
    input.location = config.city
  }
  
  // Add date range if specified (must be a number)
  if (config.minAgeDays && config.minAgeDays > 0 && config.minAgeDays <= 30) {
    input.dateRange = config.minAgeDays
  }
  
  // Add includeOneInTitle for better matching - this must be an array
  input.includeOneInTitle = [config.roleQuery]

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

  const result: ApifyRunResponse = await response.json()
  return result.data.id
}

export async function pollRunStatus(
  runId: string
): Promise<'running' | 'succeeded' | 'failed'> {
  const token = await getApifyToken()
  if (!token) throw new Error('Apify token not configured')

  const response = await fetch(
    `${APIFY_BASE}/actor-runs/${runId}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
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

export async function fetchRunResults(runId: string): Promise<RawSeekJob[]> {
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

  const response = await fetch(
    `${APIFY_BASE}/datasets/${datasetId}/items?limit=1000`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch run results: ${response.status}`)
  }

  const data = await response.json()
  
  console.log(`Fetched ${data.length} items from dataset`)
  if (data.length > 0) {
    console.log('Sample item keys:', Object.keys(data[0]))
  }
  
  return data
}

export async function waitForRun(
  runId: string,
  onProgress?: (status: string) => void,
  timeoutMs = 120000
): Promise<'succeeded' | 'failed'> {
  const start = Date.now()
  let lastStatus = ''

  while (Date.now() - start < timeoutMs) {
    try {
      const status = await pollRunStatus(runId)
      
      if (status !== lastStatus) {
        onProgress?.(status)
        lastStatus = status
      }

      if (status === 'succeeded') return 'succeeded'
      if (status === 'failed') return 'failed'

      await new Promise((res) => setTimeout(res, 3000))
    } catch (err) {
      console.error('Error polling status:', err)
      await new Promise((res) => setTimeout(res, 3000))
    }
  }

  throw new Error('Apify run timed out after 2 minutes')
}