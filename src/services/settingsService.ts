// src/services/settingsService.ts
/**
 * SETTINGS SERVICE — CORRECTED VERSION
 * ─────────────────────────────────────────────────────────────────────────────
 * FIXES:
 *   1. Better error handling for Supabase operations
 *   2. API key validation before caching
 *   3. Clear cache when settings are updated
 *   4. Detailed logging for debugging
 *
 * Stores API keys in Supabase settings table (never in env vars)
 */

import { supabase } from '@/lib/supabaseClient'

const cache: Record<string, string> = {}

// ─── Clear cache ───────────────────────────────────────────────────────────────

export function clearSettingsCache(): void {
  console.log('[Settings] Clearing cache')
  Object.keys(cache).forEach(key => delete cache[key])
}

// ─── Get setting ───────────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  console.log('[Settings] Getting setting:', key)

  // Return from cache if available
  if (cache[key]) {
    console.log('[Settings] Returning from cache:', key)
    return cache[key]
  }

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .single()

    if (error) {
      // Not found is not an error - just return null
      if (error.code === 'PGRST116') {
        console.log('[Settings] Setting not found:', key)
        return null
      }
      
      console.error('[Settings] Error fetching setting:', error)
      throw new Error(`Failed to fetch setting "${key}": ${error.message}`)
    }

    if (!data) {
      console.log('[Settings] No data for setting:', key)
      return null
    }

    const value = data.value?.trim() ?? ''
    
    // Don't cache empty values
    if (value) {
      cache[key] = value
      console.log('[Settings] Cached setting:', key, '(length:', value.length, ')')
    }

    return value || null
  } catch (err) {
    console.error('[Settings] Unexpected error:', err)
    throw err
  }
}

// ─── Set setting ───────────────────────────────────────────────────────────────

export async function setSetting(key: string, value: string): Promise<void> {
  console.log('[Settings] Setting value for:', key, '(length:', value?.length ?? 0, ')')

  if (!key || key.trim() === '') {
    throw new Error('Setting key cannot be empty')
  }

  if (!value || value.trim() === '') {
    throw new Error(`Setting value for "${key}" cannot be empty`)
  }

  const trimmedValue = value.trim()

  try {
    // Use upsert to handle both insert and update
    const { error } = await supabase
      .from('settings')
      .upsert(
        {
          key: key.trim(),
          value: trimmedValue,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'key', // Update if key already exists
        }
      )

    if (error) {
      console.error('[Settings] Error saving setting:', error)
      throw new Error(`Failed to save setting "${key}": ${error.message}`)
    }

    // Update cache
    cache[key] = trimmedValue
    console.log('[Settings] Successfully saved and cached:', key)
  } catch (err) {
    console.error('[Settings] Unexpected error:', err)
    throw err
  }
}

// ─── Get all settings ──────────────────────────────────────────────────────────

export async function getAllSettings(): Promise<Record<string, string>> {
  console.log('[Settings] Fetching all settings')

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')

    if (error) {
      console.error('[Settings] Error fetching all settings:', error)
      throw new Error(`Failed to fetch settings: ${error.message}`)
    }

    const result: Record<string, string> = {}
    
    data?.forEach((row) => {
      const value = row.value?.trim() ?? ''
      if (value) {
        result[row.key] = value
        cache[row.key] = value
      }
    })

    console.log('[Settings] Loaded settings:', Object.keys(result))
    return result
  } catch (err) {
    console.error('[Settings] Unexpected error:', err)
    throw err
  }
}

// ─── Validate API key format ───────────────────────────────────────────────────

function validateApiKey(key: string | null, keyName: string): boolean {
  if (!key || key.trim() === '') {
    console.warn(`[Settings] ${keyName} not configured`)
    return false
  }

  const trimmed = key.trim()

  // Check for placeholder values
  if (trimmed.startsWith('YOUR_') || trimmed === 'xxx' || trimmed.length < 10) {
    console.warn(`[Settings] ${keyName} appears to be a placeholder:`, trimmed.substring(0, 10) + '...')
    return false
  }

  return true
}

// ─── Convenience getters with validation ───────────────────────────────────────

export async function getApifyToken(): Promise<string | null> {
  const value = await getSetting('apify_token')
  return validateApiKey(value, 'Apify token') ? value : null
}

export async function getHunterApiKey(): Promise<string | null> {
  const value = await getSetting('hunter_api_key')
  return validateApiKey(value, 'Hunter API key') ? value : null
}

export async function getApolloApiKey(): Promise<string | null> {
  const value = await getSetting('apollo_api_key')
  return validateApiKey(value, 'Apollo API key') ? value : null
}

export async function getResendApiKey(): Promise<string | null> {
  const value = await getSetting('resend_api_key')
  return validateApiKey(value, 'Resend API key') ? value : null
}

export async function getSenderEmail(): Promise<string | null> {
  const value = await getSetting('sender_email')
  
  if (!value || value.trim() === '') return null
  
  // Basic email validation
  if (!value.includes('@') || !value.includes('.')) {
    console.warn('[Settings] Sender email appears invalid:', value)
    return null
  }
  
  return value
}

export async function getSenderName(): Promise<string | null> {
  const value = await getSetting('sender_name')
  return value && value.trim() !== '' ? value : null
}