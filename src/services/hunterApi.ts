// src/services/hunterApi.ts
// Hunter.io email finder — 25 free searches/month

import type { HunterEmailResult, HunterVerifyResult } from '@/types'
import { getHunterApiKey } from './settingsService'

const HUNTER_BASE = 'https://api.hunter.io/v2'

export async function findEmail(
  firstName: string,
  lastName: string,
  domain: string
): Promise<HunterEmailResult | null> {
  const apiKey = await getHunterApiKey()
  if (!apiKey) throw new Error('Hunter API key not configured. Please add it in Settings.')

  const params = new URLSearchParams({
    first_name: firstName,
    last_name: lastName,
    domain,
    api_key: apiKey,
  })

  const response = await fetch(`${HUNTER_BASE}/email-finder?${params}`)

  if (!response.ok) {
    if (response.status === 429) throw new Error('Hunter rate limit reached')
    throw new Error(`Hunter API error: ${response.statusText}`)
  }

  const data = await response.json()

  if (!data.data?.email) return null

  return {
    email: data.data.email,
    score: data.data.score,
    domain: data.data.domain,
    firstName: data.data.first_name,
    lastName: data.data.last_name,
    position: data.data.position ?? '',
    linkedin: data.data.linkedin ?? null,
    sources: data.data.sources ?? [],
  }
}

export async function verifyEmail(
  email: string
): Promise<HunterVerifyResult | null> {
  const apiKey = await getHunterApiKey()
  if (!apiKey) throw new Error('Hunter API key not configured')

  const params = new URLSearchParams({ email, api_key: apiKey })
  const response = await fetch(`${HUNTER_BASE}/email-verifier?${params}`)

  if (!response.ok) return null

  const data = await response.json()
  return data.data ?? null
}

export async function getHunterCredits(): Promise<{
  used: number
  total: number
}> {
  const apiKey = await getHunterApiKey()
  if (!apiKey) return { used: 0, total: 25 }

  const params = new URLSearchParams({ api_key: apiKey })
  const response = await fetch(`${HUNTER_BASE}/account?${params}`)

  if (!response.ok) return { used: 0, total: 25 }

  const data = await response.json()
  const requests = data.data?.requests?.searches

  return {
    used: requests?.used ?? 0,
    total: requests?.available ?? 25,
  }
}