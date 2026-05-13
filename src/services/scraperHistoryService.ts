// src/services/scraperHistoryService.ts
import { supabase } from '@/lib/supabaseClient'

export interface FilteredJobRecord {
  companyName: string
  jobTitle: string
  reason: string
  category: string
  confidence: number
  jobLink?: string
}

export interface ScraperHistoryItem {
  id: string
  created_at: string
  job_title: string
  city: string
  status: 'running' | 'completed' | 'failed'
  jobs_found: number
  jobs_passed: number
  jobs_filtered: number
  started_at: string
  completed_at: string | null
  error_message: string | null
  apify_run_id: string | null
  filtered_jobs: FilteredJobRecord[] | null  // NEW: detailed filter records
}

export async function createScraperHistory(
  jobTitle: string,
  city: string,
  apifyRunId?: string
): Promise<string> {
  const { data, error } = await supabase
    .from('scraper_history')
    .insert({
      job_title: jobTitle,
      city: city,
      status: 'running',
      started_at: new Date().toISOString(),
      apify_run_id: apifyRunId || null,
      filtered_jobs: null,
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

export async function updateScraperHistory(
  id: string,
  updates: {
    status?: 'running' | 'completed' | 'failed'
    jobs_found?: number
    jobs_passed?: number
    jobs_filtered?: number
    completed_at?: string
    error_message?: string
    filtered_jobs?: FilteredJobRecord[]
  }
): Promise<void> {
  const { error } = await supabase
    .from('scraper_history')
    .update(updates)
    .eq('id', id)

  if (error) throw error
}

export async function getScraperHistory(limit: number = 20): Promise<ScraperHistoryItem[]> {
  const { data, error } = await supabase
    .from('scraper_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}