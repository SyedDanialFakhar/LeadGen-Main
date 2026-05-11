/**
 * LINKEDIN COMPANY SEARCH SERVICE
 * ══════════════════════════════════════════════════════════════════════════════
 * Uses Apify actor: flood/linkedin-company-search-scraper
 *
 * PURPOSE: Given a company name + city, find the official LinkedIn company page.
 * Returns the LinkedIn URL, employee count (LinkedIn-verified), and other metadata.
 *
 * REQUIRES:
 *   1. Apify token    — already in Settings
 *   2. LinkedIn li_at — session cookie from linkedin.com (add to Settings)
 *
 * HOW TO GET li_at:
 *   1. Log into linkedin.com in Chrome
 *   2. Open DevTools → Application → Cookies → https://www.linkedin.com
 *   3. Copy the value of "li_at"
 *   4. Paste into Settings → LinkedIn Auth Token
 */

import { getApifyToken } from './settingsService'

const APIFY_BASE = '/api/apify-proxy'
const LI_ACTOR   = 'flood~linkedin-company-search-scraper'

// ─── LinkedIn token storage ────────────────────────────────────────────────────
// Stored in localStorage (same pattern as other keys in the app)

const LI_TOKEN_KEY = 'leadsync_li_at_token'

export function getLinkedInAuthToken(): string | null {
  return localStorage.getItem(LI_TOKEN_KEY)
}

export function saveLinkedInAuthToken(token: string): void {
  localStorage.setItem(LI_TOKEN_KEY, token.trim())
}

export function clearLinkedInAuthToken(): void {
  localStorage.removeItem(LI_TOKEN_KEY)
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface LinkedInCompanyMatch {
  linkedinUrl: string
  name: string
  employeeCount: number | null
  employeeCountRange: { start: number; end: number } | null
  industry: string | null
  description: string | null
  websiteUrl: string | null
  tagline: string | null
  phone: string | null
  matchScore: number
  logo: string | null
}

// ─── Name scoring ──────────────────────────────────────────────────────────────

function cleanForCompare(name: string): string {
  return name
    .replace(/\bPty\.?\s*Ltd\.?\b|\bLtd\.?\b|\bPty\.?\b|\bLLC\b|\bInc\.?\b|\bCorp\.?\b|\bLimited\b|\bGroup\b|\bHoldings\b|\bOperations\b/gi, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function scoreNameMatch(resultName: string, targetName: string): number {
  const rn = cleanForCompare(resultName)
  const tn = cleanForCompare(targetName)

  if (rn === tn) return 100
  if (rn.includes(tn) || tn.includes(rn)) return 85

  const targetWords = tn.split(/\s+/).filter(w => w.length > 2)
  if (!targetWords.length) return 0

  const matched = targetWords.filter(w => rn.includes(w))
  const ratio   = matched.length / targetWords.length

  if (ratio >= 0.9) return 75
  if (ratio >= 0.7) return 60
  if (ratio >= 0.5) return 40
  if (ratio >= 0.3) return 20
  return 0
}

// ─── Main search function ──────────────────────────────────────────────────────

export async function searchLinkedInCompany(
  companyName: string,
  city: string,
): Promise<LinkedInCompanyMatch | null> {
  const apifyToken = await getApifyToken()
  if (!apifyToken) {
    throw new Error('Apify token not configured. Please add it in Settings.')
  }

  const liToken = getLinkedInAuthToken()
  if (!liToken) {
    throw new Error(
      'LinkedIn auth token not configured.\n' +
      'To get it:\n' +
      '1. Log into linkedin.com in Chrome\n' +
      '2. DevTools → Application → Cookies → linkedin.com\n' +
      '3. Copy the "li_at" cookie value\n' +
      '4. Paste into Settings → LinkedIn Auth Token',
    )
  }

  // Build location array — always include Australia as fallback
  const locationArr: string[] = []
  if (city && city !== 'Australia' && city.length > 1) {
    locationArr.push(city)
  }
  locationArr.push('Australia')

  const input = {
    authToken:           liToken,
    keywords:            companyName,
    location:            locationArr,
    limit:               10,
    proxyConfiguration:  { useApifyProxy: true },
  }

  console.log(`[LISearch] Searching for "${companyName}" in ${locationArr.join(', ')}`)

  // ── Start Apify run ────────────────────────────────────────────────────────
  const startRes = await fetch(APIFY_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      path: `/acts/${LI_ACTOR}/runs`,
      method: 'POST',
      body: input,
    }),
  })

  if (!startRes.ok) {
    const errText = await startRes.text()
    let errMsg = `Apify LinkedIn scraper failed (HTTP ${startRes.status})`
    try {
      const errJson = JSON.parse(errText)
      if (errJson.error?.message) errMsg = `LinkedIn scraper: ${errJson.error.message}`
    } catch {}
    throw new Error(errMsg)
  }

  const { data: startData } = await startRes.json()
  const runId = startData.id
  console.log(`[LISearch] Run started: ${runId}`)

  // ── Poll for completion (max 2 min) ────────────────────────────────────────
  const startTime  = Date.now()
  const timeoutMs  = 120_000
  const pollInterval = 3_000
  let finalStatus  = 'RUNNING'

  while (Date.now() - startTime < timeoutMs) {
    await new Promise(r => setTimeout(r, pollInterval))

    const statusRes = await fetch(APIFY_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: `/actor-runs/${runId}`,
          method: 'GET',
        }),
      })

    if (!statusRes.ok) continue

    const { data } = await statusRes.json()
    finalStatus = data.status

    console.log(`[LISearch] Poll: ${finalStatus} (${Math.floor((Date.now() - startTime) / 1000)}s)`)

    if (finalStatus === 'SUCCEEDED') break
    if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(finalStatus)) {
      throw new Error(`LinkedIn scraper run ${finalStatus.toLowerCase()} for "${companyName}"`)
    }
  }

  if (finalStatus !== 'SUCCEEDED') {
    throw new Error(`LinkedIn scraper timed out for "${companyName}"`)
  }

  // ── Fetch dataset results ──────────────────────────────────────────────────
  const runRes = await fetch(APIFY_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      path: `/actor-runs/${runId}`,
      method: 'GET',
    }),
  })
  const { data: runData } = await runRes.json()
  const datasetId = runData.defaultDatasetId

  if (!datasetId) {
    console.log('[LISearch] No dataset found')
    return null
  }

  const itemsRes = await fetch(APIFY_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      path: `/datasets/${datasetId}/items?limit=10`,
      method: 'GET',
    }),
  })

  if (!itemsRes.ok) return null

  const items: any[] = await itemsRes.json()
  console.log(`[LISearch] Got ${items.length} results for "${companyName}"`)

  if (!items.length) return null

  // ── Score and rank results ─────────────────────────────────────────────────
  const scored: LinkedInCompanyMatch[] = items
    .filter((item: any) => item.url && item.url.includes('linkedin.com/company/'))
    .map((item: any) => ({
      linkedinUrl:        item.url,
      name:               item.name || '',
      employeeCount:      item.employeeCount ?? null,
      employeeCountRange: item.employeeCountRange ?? null,
      industry:           item.industriesV2?.[0] ?? item.industries?.[0] ?? null,
      description:        item.description ?? null,
      websiteUrl:         item.websiteUrl ?? null,
      tagline:            item.tagline ?? null,
      phone:              item.phone ?? null,
      logo:               item.logo ?? null,
      matchScore:         scoreNameMatch(item.name || '', companyName),
    }))
    .filter(c => c.matchScore >= 20)
    .sort((a, b) => b.matchScore - a.matchScore)

  if (!scored.length) {
    console.log(`[LISearch] No good match found for "${companyName}"`)
    return null
  }

  const best = scored[0]
  console.log(`[LISearch] Best match: "${best.name}" (score=${best.matchScore}) → ${best.linkedinUrl}`)
  return best
}

// ─── Bulk search (processes one at a time with throttle) ───────────────────────

export interface BulkLinkedInSearchInput {
  leadId: string
  companyName: string
  city: string
}

export interface BulkLinkedInSearchResult {
  leadId: string
  companyName: string
  match: LinkedInCompanyMatch | null
  error: string | null
}

export async function bulkSearchLinkedInCompanies(
  companies: BulkLinkedInSearchInput[],
  onProgress: (leadId: string, status: 'running' | 'done' | 'error', result?: LinkedInCompanyMatch | null, error?: string) => void,
  signal?: AbortSignal,
): Promise<BulkLinkedInSearchResult[]> {
  const results: BulkLinkedInSearchResult[] = []

  for (const company of companies) {
    if (signal?.aborted) break

    onProgress(company.leadId, 'running')

    try {
      const match = await searchLinkedInCompany(company.companyName, company.city)
      results.push({ leadId: company.leadId, companyName: company.companyName, match, error: null })
      onProgress(company.leadId, 'done', match)
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unexpected error'
      results.push({ leadId: company.leadId, companyName: company.companyName, match: null, error })
      onProgress(company.leadId, 'error', null, error)
    }

    // Throttle between requests to respect Apify and LinkedIn rate limits
    if (companies.indexOf(company) < companies.length - 1) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  return results
}