// src/services/hunterApi.ts
/**
 * HUNTER.IO API SERVICE — CORRECTED VERSION
 * ─────────────────────────────────────────────────────────────────────────────
 * FIXES:
 *   1. Better domain validation before making requests
 *   2. Improved error messages
 *   3. Proper null handling
 *   4. Better logging for debugging
 *
 * Free tier: 25 searches/month
 * API docs: hunter.io/api-documentation/v2
 */

import type { HunterEmailResult, HunterVerifyResult } from '@/types'
import { getHunterApiKey } from './settingsService'

const HUNTER_BASE = 'https://api.hunter.io/v2'

// ─── Domain validator ──────────────────────────────────────────────────────────

function isValidDomain(domain: string): boolean {
  if (!domain || domain.trim() === '') return false
  
  // Clean domain
  const clean = domain
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
    .trim()
  
  // Check basic format
  if (clean.length < 4) return false
  if (!clean.includes('.')) return false
  if (clean.startsWith('.') || clean.endsWith('.')) return false
  
  return true
}

function cleanDomain(domain: string): string {
  return domain
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
    .trim()
}

// ─── Find email by person name and domain ──────────────────────────────────────

export async function findEmail(
  firstName: string,
  lastName: string,
  domain: string
): Promise<HunterEmailResult | null> {
  console.log('[Hunter] Finding email for:', { firstName, lastName, domain })

  // Validate inputs
  if (!firstName?.trim() || !lastName?.trim()) {
    console.warn('[Hunter] Invalid name provided')
    return null
  }

  if (!isValidDomain(domain)) {
    console.warn('[Hunter] Invalid domain provided:', domain)
    return null
  }

  const cleanedDomain = cleanDomain(domain)
  console.log('[Hunter] Using cleaned domain:', cleanedDomain)

  // Get API key
  const apiKey = await getHunterApiKey()
  
  if (!apiKey || apiKey.trim() === '') {
    throw new Error(
      'Hunter.io API key not configured.\n\n' +
      'Please add your Hunter API key in the Settings page.\n' +
      'Get your key from: hunter.io/api'
    )
  }

  // Build request
  const params = new URLSearchParams({
    first_name: firstName.trim(),
    last_name: lastName.trim(),
    domain: cleanedDomain,
    api_key: apiKey.trim(),
  })

  const url = `${HUNTER_BASE}/email-finder?${params}`
  console.log('[Hunter] Request URL:', url.replace(apiKey, 'HIDDEN'))

  try {
    const response = await fetch(url)

    console.log('[Hunter] Response status:', response.status)

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(
          'Hunter.io rate limit reached.\n\n' +
          'You have used all 25 free searches for this month.\n' +
          'Resets at the start of next month.'
        )
      }
      
      if (response.status === 401) {
        throw new Error(
          'Hunter.io API key invalid.\n\n' +
          'Please check your API key in Settings.\n' +
          'Get a new key from: hunter.io/api'
        )
      }

      throw new Error(`Hunter.io API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('[Hunter] Response data:', {
      hasEmail: !!data.data?.email,
      score: data.data?.score,
    })

    // No email found
    if (!data.data?.email) {
      console.log('[Hunter] No email found for this person/domain combination')
      return null
    }

    return {
      email: data.data.email,
      score: data.data.score ?? 0,
      domain: data.data.domain ?? cleanedDomain,
      firstName: data.data.first_name ?? firstName,
      lastName: data.data.last_name ?? lastName,
      position: data.data.position ?? '',
      linkedin: data.data.linkedin ?? null,
      sources: data.data.sources ?? [],
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('Hunter')) {
      throw err // Re-throw our custom errors
    }
    
    console.error('[Hunter] Unexpected error:', err)
    throw new Error(`Hunter.io request failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

// ─── Verify email address ──────────────────────────────────────────────────────

export async function verifyEmail(email: string): Promise<HunterVerifyResult | null> {
  console.log('[Hunter] Verifying email:', email)

  if (!email?.trim() || !email.includes('@')) {
    console.warn('[Hunter] Invalid email provided')
    return null
  }

  const apiKey = await getHunterApiKey()
  
  if (!apiKey || apiKey.trim() === '') {
    console.warn('[Hunter] API key not configured, skipping verification')
    return null
  }

  const params = new URLSearchParams({
    email: email.trim(),
    api_key: apiKey.trim(),
  })

  try {
    const response = await fetch(`${HUNTER_BASE}/email-verifier?${params}`)

    if (!response.ok) {
      console.warn('[Hunter] Email verification failed:', response.status)
      return null
    }

    const data = await response.json()
    console.log('[Hunter] Verification result:', data.data?.status)
    
    return data.data ?? null
  } catch (err) {
    console.error('[Hunter] Verification error:', err)
    return null
  }
}

// ─── Get account credits/usage ─────────────────────────────────────────────────

export async function getHunterCredits(): Promise<{
  used: number
  total: number
}> {
  console.log('[Hunter] Fetching account credits')

  const apiKey = await getHunterApiKey()
  
  if (!apiKey || apiKey.trim() === '') {
    console.warn('[Hunter] API key not configured, returning default limits')
    return { used: 0, total: 25 }
  }

  const params = new URLSearchParams({
    api_key: apiKey.trim(),
  })

  try {
    const response = await fetch(`${HUNTER_BASE}/account?${params}`)

    if (!response.ok) {
      console.warn('[Hunter] Failed to fetch credits:', response.status)
      return { used: 0, total: 25 }
    }

    const data = await response.json()
    const requests = data.data?.requests?.searches

    const result = {
      used: requests?.used ?? 0,
      total: requests?.available ?? 25,
    }

    console.log('[Hunter] Credits:', result)
    return result
  } catch (err) {
    console.error('[Hunter] Error fetching credits:', err)
    return { used: 0, total: 25 }
  }
}