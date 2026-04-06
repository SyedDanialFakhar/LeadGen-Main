// src/services/settingsService.ts
// Fetches API keys from Supabase settings table at runtime
// Keys are NEVER stored in env vars (would expose client-side)

import { supabase } from '@/lib/supabaseClient'

const cache: Record<string, string> = {}

export async function getSetting(key: string): Promise<string | null> {
  // Return from cache if already fetched
  if (cache[key]) return cache[key]

  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .single()

  if (error || !data) return null

  cache[key] = data.value
  return data.value
}

export async function setSetting(key: string, value: string): Promise<void> {
  // Use upsert with onConflict parameter to handle duplicates
  const { error } = await supabase
    .from('settings')
    .upsert(
      { 
        key, 
        value, 
        updated_at: new Date().toISOString() 
      },
      { 
        onConflict: 'key' // This tells Supabase to update if key exists
      }
    )

  if (error) {
    console.error('Error saving setting:', error)
    throw new Error(`Failed to save setting: ${error.message}`)
  }

  // Update cache
  cache[key] = value
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')

  if (error) throw new Error(`Failed to fetch settings: ${error.message}`)

  const result: Record<string, string> = {}
  data?.forEach((row) => {
    result[row.key] = row.value
    cache[row.key] = row.value
  })

  return result
}

// Convenience getters for each API key
export const getApifyToken = () => getSetting('apify_token')
export const getHunterApiKey = () => getSetting('hunter_api_key')
export const getApolloApiKey = () => getSetting('apollo_api_key')
export const getResendApiKey = () => getSetting('resend_api_key')
export const getSenderEmail = () => getSetting('sender_email')
export const getSenderName = () => getSetting('sender_name')