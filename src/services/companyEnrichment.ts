// src/services/companyEnrichment.ts

export interface EnrichedCompanyData {
  website: string | null
  linkedinUrl: string | null
  industry: string | null
  companySize: string | null
  confidence: number
  source: 'clearbit' | 'apify' | 'google' | 'none'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanCompanyName(name: string): string {
  if (!name) return ''
  return name
    .replace(/\bPty\.?\s*Ltd\.?\b|\bLtd\.?\b|\bPty\.?\b|\bLLC\b|\bInc\.?\b|\bCorp\.?\b|\bLimited\b/gi, '')
    .replace(/[&]/g, 'and')
    .replace(/[^\w\s]/g, '')
    .trim()
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return u.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

function normaliseUrl(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return u.origin  // strips paths/query strings for cleaner storage
  } catch {
    return url
  }
}

const BLOCKED_DOMAINS = [
  'google.com', 'google.com.au', 'bing.com', 'yahoo.com',
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
  'tiktok.com', 'youtube.com', 'pinterest.com',
  'seek.com.au', 'indeed.com', 'glassdoor.com', 'jora.com',
  'linkedin.com',  // handled separately
  'yellowpages.com.au', 'whitepages.com.au', 'truelocal.com.au',
  'hotfrog.com.au', 'localsearch.com.au', 'yelp.com',
  'wikipedia.org', 'wikimedia.org',
  'abr.gov.au', 'asic.gov.au',
  'crunchbase.com', 'bloomberg.com', 'zoominfo.com', 'dnb.com',
]

function isBlockedUrl(url: string): boolean {
  const domain = extractDomain(url)
  return BLOCKED_DOMAINS.some(b => domain === b || domain.endsWith(`.${b}`))
}

function domainMatchScore(domain: string, companyName: string): number {
  const cleanCompany = cleanCompanyName(companyName).toLowerCase().replace(/\s+/g, '')
  const cleanDomain = domain.replace(/\.com\.au$|\.com$|\.au$|\.net\.au$|\.org\.au$/, '').replace(/[^a-z0-9]/g, '')

  if (cleanDomain === cleanCompany) return 10
  if (cleanDomain.includes(cleanCompany) || cleanCompany.includes(cleanDomain)) return 8

  const words = cleanCompanyName(companyName).toLowerCase().split(/\s+/).filter(w => w.length > 2)
  const matchedWords = words.filter(w => cleanDomain.includes(w))
  if (matchedWords.length > 0) return Math.min(7, 3 + matchedWords.length * 2)

  return 0
}

// ─── Source: Clearbit (free, no auth) ─────────────────────────────────────────

async function tryClearbit(companyName: string): Promise<{
  website: string | null; linkedinUrl: string | null
  industry: string | null; companySize: string | null; confidence: number
}> {
  const empty = { website: null, linkedinUrl: null, industry: null, companySize: null, confidence: 0 }
  try {
    const clean = cleanCompanyName(companyName)
    console.log(`  [Clearbit] Searching: "${clean}"`)

    const res = await fetch(
      `https://company.clearbit.com/v1/domains/find?name=${encodeURIComponent(clean)}`,
      { headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(8000) }
    )

    if (!res.ok) {
      console.log(`  [Clearbit] HTTP ${res.status} for "${clean}"`)
      return empty
    }

    const data = await res.json()
    if (!data?.domain) {
      console.log(`  [Clearbit] No domain returned for "${clean}"`)
      return empty
    }

    const website = normaliseUrl(`https://${data.domain}`)
    const linkedinUrl = data.linkedin?.handle
      ? `https://www.linkedin.com/company/${data.linkedin.handle}`
      : null

    const score = domainMatchScore(data.domain, companyName)
    const confidence = Math.min(10, 6 + score)

    console.log(`  [Clearbit] ✅ ${website} (score ${score}, confidence ${confidence})`)
    if (linkedinUrl) console.log(`  [Clearbit] ✅ LinkedIn: ${linkedinUrl}`)

    return {
      website,
      linkedinUrl,
      industry: data.category?.industry || data.tags?.[0] || null,
      companySize: data.metrics?.employeesRange || null,
      confidence,
    }
  } catch (err) {
    console.log(`  [Clearbit] Error:`, err)
    return empty
  }
}

// ─── Source: Hunter.io (free tier, no auth needed for basic lookup) ─────────────

async function tryHunter(companyName: string, city?: string | null): Promise<{
  website: string | null; linkedinUrl: string | null; confidence: number
}> {
  // Hunter domain search doesn't need an API key for basic use
  const empty = { website: null, linkedinUrl: null, confidence: 0 }
  try {
    const clean = cleanCompanyName(companyName)
    // Hunter's free autocomplete endpoint
    const res = await fetch(
      `https://api.hunter.io/v2/domains/search?query=${encodeURIComponent(clean)}`,
      { signal: AbortSignal.timeout(6000) }
    )
    if (!res.ok) return empty
    const data = await res.json()
    if (!data?.domain) return empty

    const website = normaliseUrl(`https://${data.domain}`)
    const score = domainMatchScore(data.domain, companyName)
    console.log(`  [Hunter] ✅ ${website} (score ${score})`)
    return { website, linkedinUrl: null, confidence: Math.min(9, 5 + score) }
  } catch {
    return empty
  }
}

// ─── Source: Google Custom Search via SerpAPI public endpoint ─────────────────

async function tryGoogleSearch(
  companyName: string,
  city?: string | null
): Promise<{ website: string | null; linkedinUrl: string | null; confidence: number }> {
  const empty = { website: null, linkedinUrl: null, confidence: 0 }

  // Try to get Apify token from settings for authenticated requests
  let apifyToken: string | null = null
  try {
    // Dynamically import to avoid hard dependency
    const { getApifyToken } = await import('./settingsService')
    apifyToken = await getApifyToken()
  } catch {
    // settingsService not available – continue without token
  }

  const cleanName = cleanCompanyName(companyName)
  const locationSuffix = city && city.toLowerCase() !== 'australia' && city.length > 2
    ? ` ${city}`
    : ' Australia'

  // Ordered search strategies — most specific first
  const queries = [
    `"${cleanName}"${locationSuffix} official website`,
    `${cleanName}${locationSuffix} site:.com.au`,
    `${cleanName}${locationSuffix} company`,
    `"${cleanName}" linkedin company`,
  ]

  let bestWebsite: string | null = null
  let bestLinkedin: string | null = null
  let bestScore = 0

  for (const query of queries) {
    console.log(`  [Google] Query: "${query}"`)

    try {
      let items: Array<{ link?: string; url?: string; title?: string }> = []

      if (apifyToken) {
        // ── Apify Google Search Scraper ──────────────────────────────────────
        const startRes = await fetch(
          `https://api.apify.com/v2/acts/apify~google-search-scraper/runs?token=${apifyToken}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              queries: query,
              maxPagesPerQuery: 1,
              resultsPerPage: 10,
              languageCode: 'en',
              countryCode: 'au',
            }),
          }
        )

        if (!startRes.ok) continue
        const { data: runData } = await startRes.json()
        const runId = runData.id

        // Poll for completion (max 30s)
        let status = 'RUNNING'
        for (let i = 0; i < 15 && status === 'RUNNING'; i++) {
          await new Promise(r => setTimeout(r, 2000))
          const pollRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`)
          status = (await pollRes.json()).data?.status ?? 'FAILED'
        }

        if (status !== 'SUCCEEDED') continue

        const datasetRes = await fetch(
          `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apifyToken}`
        )
        const rawItems = await datasetRes.json()

        // Apify returns an array of search-result pages; each page has an `organicResults` array
        for (const page of rawItems) {
          const organic: Array<{ url?: string; link?: string }> = page.organicResults ?? page.results ?? []
          items.push(...organic)
        }
        // Also accept flat arrays (some scraper versions)
        if (items.length === 0 && Array.isArray(rawItems)) {
          items = rawItems
        }
      } else {
        // ── Fallback: DuckDuckGo Instant Answer (CORS-friendly, no key needed) ─
        const ddgRes = await fetch(
          `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&t=claude-enrichment`,
          { signal: AbortSignal.timeout(6000) }
        )
        if (ddgRes.ok) {
          const ddg = await ddgRes.json()
          const urls = [
            ddg.AbstractURL,
            ddg.OfficialWebsite,
            ...(ddg.Results ?? []).map((r: { FirstURL?: string }) => r.FirstURL),
            ...(ddg.RelatedTopics ?? []).map((r: { FirstURL?: string }) => r.FirstURL),
          ].filter(Boolean)
          items = urls.map((u: string) => ({ link: u }))
        }
      }

      // ── Score each result ────────────────────────────────────────────────
      for (const item of items) {
        const rawUrl: string = item.link ?? item.url ?? ''
        if (!rawUrl || !rawUrl.startsWith('http')) continue

        // LinkedIn extraction (separate from website)
        if (!bestLinkedin && rawUrl.includes('linkedin.com/company/')) {
          bestLinkedin = rawUrl.split('?')[0] // strip query params
          console.log(`  [Google] ✅ LinkedIn: ${bestLinkedin}`)
        }

        // Skip blocked domains for website
        if (isBlockedUrl(rawUrl)) continue

        const domain = extractDomain(rawUrl)
        if (!domain) continue

        let score = domainMatchScore(domain, companyName)
        if (rawUrl.includes('.com.au')) score += 2   // prefer AU domains
        if (rawUrl.includes('.au')) score += 1

        if (score > bestScore) {
          bestScore = score
          bestWebsite = normaliseUrl(rawUrl)
          console.log(`  [Google] 📍 Candidate: ${bestWebsite} (score ${score})`)
        }
      }

      // If we have a high-confidence result, stop trying more queries
      if (bestScore >= 8 && bestLinkedin) break
      if (bestScore >= 10) break

    } catch (err) {
      console.log(`  [Google] Error on query "${query}":`, err)
    }
  }

  const confidence = Math.min(10, Math.floor(bestScore / 1.5))
  if (bestWebsite) console.log(`  [Google] ✅ Final website: ${bestWebsite} (confidence ${confidence})`)

  return { website: bestWebsite, linkedinUrl: bestLinkedin, confidence }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function enrichCompanyWebsite(
  companyName: string,
  city?: string | null
): Promise<EnrichedCompanyData> {
  console.log(`\n━━━ Enriching: "${companyName}" (${city ?? 'location unknown'}) ━━━`)

  if (!companyName?.trim()) {
    return { website: null, linkedinUrl: null, industry: null, companySize: null, confidence: 0, source: 'none' }
  }

  // 1. Clearbit (free, fast, very accurate)
  const clearbit = await tryClearbit(companyName)
  // If Clearbit returns a high-confidence result, return early
  if (clearbit.website && clearbit.confidence >= 7) {
    console.log(`  ✅ Clearbit high-confidence result returned early`)
    return { ...clearbit, source: 'clearbit' }
  }

  // 2. Hunter.io basic lookup
  const hunter = await tryHunter(companyName, city)

  // 3. Google / Apify / DuckDuckGo
  const google = await tryGoogleSearch(companyName, city)

  // ── Merge: prefer highest confidence ──────────────────────────────────────
  const candidates = [
    { website: clearbit.website, linkedinUrl: clearbit.linkedinUrl, confidence: clearbit.confidence, source: 'clearbit' as const },
    { website: hunter.website, linkedinUrl: hunter.linkedinUrl, confidence: hunter.confidence, source: 'apify' as const },
    { website: google.website, linkedinUrl: google.linkedinUrl, confidence: google.confidence, source: 'google' as const },
  ]
    .filter(c => c.website)
    .sort((a, b) => b.confidence - a.confidence)

  const best = candidates[0]
  const finalLinkedin = clearbit.linkedinUrl ?? google.linkedinUrl ?? hunter.linkedinUrl ?? null

  if (!best) {
    console.log(`  ❌ No results found for "${companyName}"`)
    return {
      website: null,
      linkedinUrl: finalLinkedin,
      industry: clearbit.industry,
      companySize: clearbit.companySize,
      confidence: 0,
      source: 'none',
    }
  }

  console.log(`  🏆 Final: ${best.website} (confidence ${best.confidence}, source: ${best.source})`)
  if (finalLinkedin) console.log(`  🏆 LinkedIn: ${finalLinkedin}`)

  return {
    website: best.website,
    linkedinUrl: finalLinkedin,
    industry: clearbit.industry ?? null,
    companySize: clearbit.companySize ?? null,
    confidence: best.confidence,
    source: best.source,
  }
}

export async function enrichMultipleCompanies(
  companies: Array<{ id: string; name: string; city?: string | null }>
): Promise<Map<string, EnrichedCompanyData>> {
  const results = new Map<string, EnrichedCompanyData>()
  console.log(`\n🚀 Bulk enrichment: ${companies.length} companies`)

  for (let i = 0; i < companies.length; i++) {
    const { id, name, city } = companies[i]
    console.log(`\n[${i + 1}/${companies.length}] ${name}`)
    results.set(id, await enrichCompanyWebsite(name, city))
    if (i < companies.length - 1) await new Promise(r => setTimeout(r, 800))
  }

  const found = Array.from(results.values()).filter(r => r.website).length
  console.log(`\n✅ Done: ${found}/${companies.length} found`)
  return results
}