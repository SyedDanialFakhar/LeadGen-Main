// src/services/companyEnrichment.ts
/**
 * COMPANY ENRICHMENT SERVICE - OPTIMIZED (May 2026)
 * 
 * MAJOR IMPROVEMENT: 
 * 1. Website Scraping is now the HIGHEST priority for LinkedIn detection
 * 2. Much stricter scoring and validation to reduce wrong LinkedIn links
 * 3. Better logging for debugging
 */

export interface EnrichedCompanyData {
  website: string | null
  linkedinUrl: string | null
  industry: string | null
  companySize: string | null
  confidence: number
  source: 'knowledgegraph' | 'clearbit' | 'wikidata' | 'duckduckgo' | 'opencorporates' | 'google' | 'website_scrape' | 'none'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanCompanyName(name: string): string {
  if (!name) return ''
  return name
    .replace(/\bPty\.?\s*Ltd\.?\b|\bLtd\.?\b|\bPty\.?\b|\bLLC\b|\bInc\.?\b|\bCorp\.?\b|\bLimited\b|\bOperations\b|\bGroup\b|\bHoldings\b/gi, '')
    .replace(/[&]/g, 'and')
    .replace(/[^\w\s]/g, '')
    .trim()
}

function toLinkedInSlug(name: string): string {
  return cleanCompanyName(name)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function toLinkedInSlugVariants(name: string): string[] {
  const base = cleanCompanyName(name)
  const variants = new Set<string>()

  const standard = base.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
  variants.add(standard)

  const noAnd = base.replace(/\band\b/gi, '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
  variants.add(noAnd)

  const withAmp = name.replace(/\s*&\s*/g, '-').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
  variants.add(withAmp)

  const firstWord = standard.split('-')[0]
  if (firstWord && firstWord.length > 3) variants.add(firstWord)

  const raw = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  variants.add(raw)

  return Array.from(variants).filter(v => v.length >= 2)
}

function extractDomain(url: string): string {
  try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '').toLowerCase() }
  catch { return '' }
}

function normaliseUrl(url: string): string {
  try { return new URL(url.startsWith('http') ? url : `https://${url}`).origin }
  catch { return url }
}

const BLOCKED_DOMAINS = [
  'google.com', 'google.com.au', 'bing.com', 'yahoo.com', 'duckduckgo.com',
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com',
  'youtube.com', 'pinterest.com', 'seek.com.au', 'indeed.com', 'glassdoor.com',
  'jora.com', 'yellowpages.com.au', 'whitepages.com.au', 'truelocal.com.au',
  'hotfrog.com.au', 'localsearch.com.au', 'yelp.com', 'wikipedia.org',
  'wikimedia.org', 'wikidata.org', 'abr.gov.au', 'asic.gov.au',
  'crunchbase.com', 'bloomberg.com', 'zoominfo.com', 'dnb.com',
  'opencorporates.com', 'abn.business.gov.au', 'abnlookup.gov.au',
]

function isBlockedUrl(url: string): boolean {
  const domain = extractDomain(url)
  return BLOCKED_DOMAINS.some(b => domain === b || domain.endsWith(`.${b}`))
}

function domainMatchScore(domain: string, companyName: string): number {
  const cComp = cleanCompanyName(companyName).toLowerCase().replace(/\s+/g, '')
  const cDom = domain.replace(/\.com\.au$|\.com$|\.au$|\.net\.au$|\.org\.au$|\.net$|\.io$/, '').replace(/[^a-z0-9]/g, '')
  if (cDom === cComp) return 10
  if (cDom.includes(cComp) || cComp.includes(cDom)) return 8
  const words = cleanCompanyName(companyName).toLowerCase().split(/\s+/).filter(w => w.length > 2)
  const matched = words.filter(w => cDom.includes(w))
  if (matched.length >= 2) return 7
  if (matched.length === 1) return 4
  return 0
}

function cleanLinkedInUrl(url: string): string | null {
  try {
    const u = new URL(url.includes('linkedin.com') && !url.startsWith('http') ? `https://${url}` : url)
    if (!u.pathname.startsWith('/company/')) return null
    const parts = u.pathname.split('/').filter(Boolean)
    if (parts.length < 2) return null
    const slug = parts[1].replace(/[^a-z0-9-]/gi, '')
    if (!slug || slug.length < 2) return null
    return `https://www.linkedin.com/company/${slug}`
  } catch { return null }
}

function isValidLinkedInCompanyUrl(url: string): boolean {
  return !!cleanLinkedInUrl(url)
}

function linkedInSlugScore(url: string, companyName: string): number {
  const cleaned = cleanLinkedInUrl(url)
  if (!cleaned) return 0
  const slug = cleaned.replace('https://www.linkedin.com/company/', '')
  const expectedSlug = toLinkedInSlug(companyName)
  const nameWords = cleanCompanyName(companyName).toLowerCase().split(/\s+/).filter(w => w.length > 2)

  if (slug === expectedSlug) return 10
  if (slug.includes(expectedSlug) || expectedSlug.includes(slug)) return 8
  const matchedWords = nameWords.filter(w => slug.includes(w))
  if (matchedWords.length >= 2) return 7
  if (matchedWords.length === 1) return 4
  return 2
}

// ─── HIGHEST PRIORITY: Website Scraping for LinkedIn ─────────────────────────
async function scrapeWebsiteForLinkedIn(websiteUrl: string, companyName: string): Promise<string | null> {
  try {
    console.log(`  [WebScrape] Fetching ${websiteUrl} for LinkedIn links...`)
    
    const res = await fetch(websiteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      console.log(`  [WebScrape] Failed: HTTP ${res.status}`)
      return null
    }

    const html = await res.text()
    
    const linkedInRegex = /https?:\/\/(?:www\.)?linkedin\.com\/company\/([a-zA-Z0-9-_]+)/gi
    const matches = [...html.matchAll(linkedInRegex)]
    
    if (matches.length === 0) {
      console.log(`  [WebScrape] No LinkedIn company URLs found`)
      return null
    }

    const candidates = matches
      .map(m => m[0])
      .map(url => ({
        url: cleanLinkedInUrl(url),
        score: linkedInSlugScore(url, companyName),
      }))
      .filter(c => c.url && c.score >= 4) 
      .sort((a, b) => b.score - a.score)

    if (candidates.length === 0) {
      console.log(`  [WebScrape] Found URLs but none matched company name well`)
      return null
    }

    const best = candidates[0]
    console.log(`  [WebScrape] ✅ Found LinkedIn: ${best.url} (score ${best.score})`)
    return best.url
  } catch (e) {
    console.log(`  [WebScrape] Error:`, e instanceof Error ? e.message : String(e))
    return null
  }
}

// ─── 1. Google Knowledge Graph ────────────────────────────────────────────────

async function tryKnowledgeGraph(companyName: string, city?: string | null) {
  const empty = { website: null as string | null, linkedinUrl: null as string | null, industry: null as string | null, confidence: 0 }
  const apiKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_KNOWLEDGE_GRAPH_API_KEY) || ''
  if (!apiKey) return empty
  try {
    const cleanName = cleanCompanyName(companyName)
    const query = (city && city.toLowerCase() !== 'australia' && city.length > 2) ? `${cleanName} ${city}` : `${cleanName} Australia`
    console.log(`  [KG] "${query}"`)
    const res = await fetch(
      `https://kgsearch.googleapis.com/v1/entities:search?query=${encodeURIComponent(query)}&key=${apiKey}&limit=5&types=Organization`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return empty
    const data = await res.json()
    if (!data.itemListElement?.length) return empty

    let bestScore = 0
    let bestMatch = { ...empty }

    for (const item of data.itemListElement) {
      const r = item.result
      let score = 0
      const name: string = r.name || ''
      const cleanedName = cleanCompanyName(name).toLowerCase()
      const cleanedQuery = cleanCompanyName(companyName).toLowerCase()

      if (cleanedName === cleanedQuery) score += 8
      else if (cleanedName.includes(cleanedQuery) || cleanedQuery.includes(cleanedName)) score += 5

      const sameAs: string[] = Array.isArray(r.sameAs) ? r.sameAs : (r.sameAs ? [r.sameAs] : [])
      const linkedinCandidates = sameAs.filter(u => u?.includes('linkedin.com/company/'))
      let bestLinkedin: string | null = null
      let bestLiScore = 0
      for (const liUrl of linkedinCandidates) {
        const liScore = linkedInSlugScore(liUrl, companyName)
        if (liScore > bestLiScore) { bestLiScore = liScore; bestLinkedin = cleanLinkedInUrl(liUrl) }
      }

      const website = r.url || sameAs.find(u => u && !isBlockedUrl(u) && !u.includes('linkedin.com')) || null
      const websiteScore = website ? domainMatchScore(extractDomain(website), companyName) : 0

      if (website?.includes('.com.au')) score += 2
      if (bestLinkedin) score += 3 + Math.floor(bestLiScore / 3)
      if (websiteScore >= 8) score += 3
      if (item.resultScore) score += Math.min(3, Math.floor(item.resultScore / 10))

      if (score > bestScore) {
        bestScore = score
        bestMatch = {
          website: website ? normaliseUrl(website) : null,
          linkedinUrl: bestLinkedin,
          industry: r.description || null,
          confidence: 0,
        }
      }
    }

    if (!bestMatch.website && !bestMatch.linkedinUrl) return empty
    bestMatch.confidence = Math.min(10, 5 + Math.floor(bestScore / 2))
    console.log(`  [KG] ✅ ${bestMatch.website ?? 'no-site'} | LI: ${bestMatch.linkedinUrl ?? 'none'} (conf ${bestMatch.confidence})`)
    return bestMatch
  } catch (e) { console.log(`  [KG] Error:`, e); return empty }
}

// ─── 2. Clearbit ──────────────────────────────────────────────────────────────

async function tryClearbit(companyName: string) {
  const empty = { website: null as string | null, linkedinUrl: null as string | null, industry: null as string | null, companySize: null as string | null, confidence: 0 }
  try {
    const clean = cleanCompanyName(companyName)
    console.log(`  [Clearbit] "${clean}"`)
    const res = await fetch(
      `https://company.clearbit.com/v1/domains/find?name=${encodeURIComponent(clean)}`,
      { headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return empty
    const data = await res.json()
    if (!data?.domain) return empty

    const website = normaliseUrl(`https://${data.domain}`)
    let linkedinUrl: string | null = null
    if (data.linkedin?.handle) {
      const rawUrl = `https://www.linkedin.com/company/${data.linkedin.handle}`
      const score = linkedInSlugScore(rawUrl, companyName)
      if (score >= 4) linkedinUrl = cleanLinkedInUrl(rawUrl)
    }

    const domScore = domainMatchScore(data.domain, companyName)
    const confidence = Math.min(10, 6 + domScore)
    console.log(`  [Clearbit] ✅ ${website} | LI: ${linkedinUrl ?? 'none'} (conf ${confidence})`)
    return { website, linkedinUrl, industry: data.category?.industry || null, companySize: data.metrics?.employeesRange || null, confidence }
  } catch (e) { console.log(`  [Clearbit] Error:`, e); return empty }
}

// ─── 3. Wikidata SPARQL ───────────────────────────────────────────────────────

async function tryWikidata(companyName: string) {
  const empty = { website: null as string | null, linkedinUrl: null as string | null, confidence: 0 }
  try {
    const clean = cleanCompanyName(companyName)
    const searchRes = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(clean)}&language=en&type=item&limit=5&format=json&origin=*`,
      { signal: AbortSignal.timeout(6000) }
    )
    if (!searchRes.ok) return empty
    const searchData = await searchRes.json()
    if (!searchData.search?.length) return empty

    const entityId = searchData.search[0].id
    const claimsRes = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entityId}&props=claims&format=json&origin=*`,
      { signal: AbortSignal.timeout(6000) }
    )
    if (!claimsRes.ok) return empty
    const claimsData = await claimsRes.json()
    const entity = claimsData.entities?.[entityId]
    if (!entity) return empty

    const claims = entity.claims || {}

    let website: string | null = null
    const websiteClaims = claims['P856'] || []
    for (const c of websiteClaims) {
      const url = c.mainsnak?.datavalue?.value
      if (url && !isBlockedUrl(url)) { website = normaliseUrl(url); break }
    }

    let linkedinUrl: string | null = null
    const liPageClaims = claims['P4264'] || []
    for (const c of liPageClaims) {
      const handle = c.mainsnak?.datavalue?.value
      if (handle) {
        const url = `https://www.linkedin.com/company/${handle}`
        const score = linkedInSlugScore(url, companyName)
        if (score >= 3) { linkedinUrl = cleanLinkedInUrl(url); break }
      }
    }

    if (!website && !linkedinUrl) return empty
    const confidence = website ? Math.min(8, 5 + domainMatchScore(extractDomain(website), companyName)) : 5
    console.log(`  [Wikidata] ✅ ${website ?? 'no-site'} | LI: ${linkedinUrl ?? 'none'} (conf ${confidence})`)
    return { website, linkedinUrl, confidence }
  } catch (e) { console.log(`  [Wikidata] Error:`, e); return empty }
}

// ─── 4. LinkedIn slug verification via DuckDuckGo ─────────────────────────────

async function tryLinkedInSlugVerify(companyName: string): Promise<string | null> {
  const variants = toLinkedInSlugVariants(companyName)
  console.log(`  [LI-slug] Trying ${variants.length} variants for "${companyName}"`)

  try {
    const q = `site:linkedin.com/company/ "${cleanCompanyName(companyName)}" Australia`
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_redirect=1`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const allResults = [...(data.RelatedTopics || []), ...(data.Results || [])]
    for (const r of allResults) {
      const url = r.FirstURL || r.url || ''
      if (url.includes('linkedin.com/company/')) {
        const cleaned = cleanLinkedInUrl(url)
        if (cleaned) {
          console.log(`  [LI-slug] ✅ DDG confirmed: ${cleaned}`)
          return cleaned
        }
      }
    }
  } catch (e) {}

  const bestSlug = variants[0]
  if (bestSlug && bestSlug.length >= 3) {
    const url = `https://www.linkedin.com/company/${bestSlug}`
    console.log(`  [LI-slug] Using unverified: ${url}`)
    return url
  }
  return null
}

// ─── 5. DuckDuckGo Instant Answer ────────────────────────────────────────────

async function tryDuckDuckGo(companyName: string, city?: string | null) {
  const empty = { website: null as string | null, linkedinUrl: null as string | null, confidence: 0 }
  try {
    const cleanName = cleanCompanyName(companyName)
    const loc = city && city.toLowerCase() !== 'australia' && city.length > 2 ? ` ${city} Australia` : ' Australia'
    const q = `${cleanName}${loc} official website`
    console.log(`  [DDG] "${q}"`)

    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_redirect=1&skip_disambig=1`,
      { signal: AbortSignal.timeout(6000) }
    )
    if (!res.ok) return empty
    const data = await res.json()

    let bestWebsite: string | null = null
    let bestLinkedin: string | null = null
    let bestScore = 0

    const check = (url: string) => {
      if (!url?.startsWith('http')) return
      if (url.includes('linkedin.com/company/')) {
        const cleaned = cleanLinkedInUrl(url)
        if (cleaned && !bestLinkedin) {
          const score = linkedInSlugScore(cleaned, companyName)
          if (score >= 4) { bestLinkedin = cleaned; console.log(`  [DDG] 🔗 LI: ${cleaned}`) }
        }
        return
      }
      if (isBlockedUrl(url)) return
      const domain = extractDomain(url)
      const score = domainMatchScore(domain, companyName)
      if (score > bestScore) { bestScore = score; bestWebsite = normaliseUrl(url) }
    }

    if (data.AbstractURL) check(data.AbstractURL)
    for (const r of data.RelatedTopics || []) if (r.FirstURL) check(r.FirstURL)
    for (const r of data.Results || []) if (r.FirstURL) check(r.FirstURL)

    if (!bestWebsite && !bestLinkedin) return empty
    const confidence = Math.min(9, Math.floor(bestScore * 1.2))
    return { website: bestWebsite, linkedinUrl: bestLinkedin, confidence }
  } catch (e) { console.log(`  [DDG] Error:`, e); return empty }
}

// ─── 6. Hunter.io ─────────────────────────────────────────────────────────────

async function tryHunter(companyName: string) {
  const empty = { website: null as string | null, confidence: 0 }
  try {
    const res = await fetch(
      `https://api.hunter.io/v2/domains/search?query=${encodeURIComponent(cleanCompanyName(companyName))}`,
      { signal: AbortSignal.timeout(6000) }
    )
    if (!res.ok) return empty
    const data = await res.json()
    if (!data?.domain) return empty
    const website = normaliseUrl(`https://${data.domain}`)
    const score = domainMatchScore(data.domain, companyName)
    console.log(`  [Hunter] ✅ ${website}`)
    return { website, confidence: Math.min(8, 4 + score) }
  } catch { return empty }
}

// ─── 7. Open Corporates ───────────────────────────────────────────────────────

async function tryOpenCorporates(companyName: string) {
  const empty = { website: null as string | null, confidence: 0 }
  try {
    const clean = cleanCompanyName(companyName)
    const res = await fetch(
      `https://api.opencorporates.com/v0.4/companies/search?q=${encodeURIComponent(clean)}&jurisdiction_code=au&per_page=3`,
      { signal: AbortSignal.timeout(6000) }
    )
    if (!res.ok) return empty
    const data = await res.json()
    const companies = data.results?.companies || []
    if (!companies.length) return empty

    for (const { company } of companies) {
      if (!company) continue
      const name = company.name || ''
      if (cleanCompanyName(name).toLowerCase() === clean.toLowerCase() && company.registered_address?.country === 'Australia') {
        console.log(`  [OC] ✅ Found AU company: ${name}`)
        return { website: null, confidence: 5 }
      }
    }
    return empty
  } catch { return empty }
}

// ─── 8. Apify Google Search (paid fallback) ───────────────────────────────────

async function tryApifyGoogle(companyName: string, city?: string | null) {
  const empty = { website: null as string | null, linkedinUrl: null as string | null, confidence: 0 }
  let apifyToken: string | null = null
  try { const { getApifyToken } = await import('./settingsService'); apifyToken = await getApifyToken() } catch {}
  if (!apifyToken) return empty

  const cleanName = cleanCompanyName(companyName)
  const loc = (city && city.toLowerCase() !== 'australia' && city.length > 2) ? ` ${city}` : ' Australia'

  const queries = [
    `"${cleanName}"${loc} site:.com.au`,
    `${cleanName}${loc} official website`,
    `site:linkedin.com/company/ "${cleanName}" Australia`,
  ]

  let bestWebsite: string | null = null
  let bestLinkedin: string | null = null
  let bestScore = 0

  for (const query of queries) {
    console.log(`  [Apify] "${query}"`)
    try {
      const startRes = await fetch(`https://api.apify.com/v2/acts/apify~google-search-scraper/runs?token=${apifyToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries: query, maxPagesPerQuery: 1, resultsPerPage: 8, languageCode: 'en', countryCode: 'au' }),
      })
      if (!startRes.ok) continue
      const runId = (await startRes.json()).data.id
      let status = 'RUNNING'
      for (let i = 0; i < 15 && status === 'RUNNING'; i++) {
        await new Promise(r => setTimeout(r, 2000))
        status = (await (await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`)).json()).data?.status ?? 'FAILED'
      }
      if (status !== 'SUCCEEDED') continue
      const rawItems = await (await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apifyToken}`)).json()
      const items: any[] = []
      for (const page of rawItems) items.push(...(page.organicResults ?? page.results ?? []))
      if (!items.length && Array.isArray(rawItems)) items.push(...rawItems)

      for (const item of items) {
        const rawUrl = item.link ?? item.url ?? ''
        if (!rawUrl?.startsWith('http')) continue
        if (rawUrl.includes('linkedin.com/company/')) {
          if (!bestLinkedin) {
            const cleaned = cleanLinkedInUrl(rawUrl)
            if (cleaned) {
              const liScore = linkedInSlugScore(cleaned, companyName)
              if (liScore >= 4) { bestLinkedin = cleaned; console.log(`  [Apify] ✅ LI: ${bestLinkedin}`) }
            }
          }
          continue
        }
        if (isBlockedUrl(rawUrl) || rawUrl.includes('linkedin.com')) continue
        const domain = extractDomain(rawUrl)
        let score = domainMatchScore(domain, companyName)
        if (rawUrl.includes('.com.au')) score += 2
        if (score > bestScore) { bestScore = score; bestWebsite = normaliseUrl(rawUrl); console.log(`  [Apify] 📍 ${bestWebsite} (${score})`) }
      }
      if (bestScore >= 8 && bestLinkedin) break
    } catch (e) { console.log(`  [Apify] Error:`, e) }
  }
  return { website: bestWebsite, linkedinUrl: bestLinkedin, confidence: Math.min(9, Math.floor(bestScore * 1.2)) }
}

// ─── LinkedIn consolidation ───────────────────────────────────────────────────

function pickBestLinkedIn(candidates: Array<string | null>, companyName: string): string | null {
  const valid = candidates
    .filter((u): u is string => !!u && isValidLinkedInCompanyUrl(u))
    .map(u => ({ url: cleanLinkedInUrl(u)!, score: linkedInSlugScore(u, companyName) }))
    .filter(c => c.score >= 3)
    .sort((a, b) => b.score - a.score)

  if (!valid.length) return null
  console.log(`  [LI-pick] Best: ${valid[0].url} (score ${valid[0].score})`)
  return valid[0].url
}

// ─── MAIN FUNCTION - IMPROVED ─────────────────────────────────────────────────

export async function enrichCompanyWebsite(companyName: string, city?: string | null): Promise<EnrichedCompanyData> {
  console.log(`\n━━━ Enriching: "${companyName}" (${city ?? 'unknown'}) ━━━`)
  if (!companyName?.trim()) {
    return { website: null, linkedinUrl: null, industry: null, companySize: null, confidence: 0, source: 'none' }
  }

  const [kg, clearbit, wikidata] = await Promise.all([
    tryKnowledgeGraph(companyName, city),
    tryClearbit(companyName),
    tryWikidata(companyName),
  ])

  const websiteCandidates = [kg.website, clearbit.website, wikidata.website].filter(Boolean) as string[]
  let scrapedLinkedIn: string | null = null

  if (websiteCandidates.length > 0) {
    const bestWebsite = websiteCandidates[0]
    console.log(`  [Phase 1.5] Scraping website for LinkedIn: ${bestWebsite}`)
    scrapedLinkedIn = await scrapeWebsiteForLinkedIn(bestWebsite, companyName)

    if (scrapedLinkedIn) {
      const bestWebsiteResult = [kg, clearbit, wikidata].filter(r => r.website).sort((a, b) => b.confidence - a.confidence)[0]
      console.log(`  🏆 WEBSITE SCRAPE SUCCESS: ${bestWebsiteResult?.website} | LI: ${scrapedLinkedIn}`)
      return {
        website: bestWebsiteResult?.website || null,
        linkedinUrl: scrapedLinkedIn,
        industry: clearbit.industry ?? kg.industry ?? null,
        companySize: clearbit.companySize ?? null,
        confidence: 9,
        source: 'website_scrape',
      }
    }
  }

  const slugLiPromise = tryLinkedInSlugVerify(companyName)

  const [ddg, hunter, slugLi] = await Promise.all([
    tryDuckDuckGo(companyName, city),
    tryHunter(companyName),
    slugLiPromise,
  ])

  const wCandidates = [
    kg.website ? { website: kg.website, confidence: kg.confidence, source: 'knowledgegraph' as const } : null,
    clearbit.website ? { website: clearbit.website, confidence: clearbit.confidence, source: 'clearbit' as const } : null,
    wikidata.website ? { website: wikidata.website, confidence: wikidata.confidence, source: 'wikidata' as const } : null,
    ddg.website ? { website: ddg.website, confidence: ddg.confidence, source: 'duckduckgo' as const } : null,
    hunter.website ? { website: hunter.website, confidence: hunter.confidence, source: 'hunter' as const } : null,
  ].filter(Boolean).sort((a: any, b: any) => b.confidence - a.confidence) as any[]

  const allLinkedInCandidates = [scrapedLinkedIn, kg.linkedinUrl, clearbit.linkedinUrl, wikidata.linkedinUrl, ddg.linkedinUrl, slugLi]
  const finalLinkedin = pickBestLinkedIn(allLinkedInCandidates, companyName)

  const best = wCandidates[0] ?? null

  if (!best || best.confidence < 5) {
    const apify = await tryApifyGoogle(companyName, city)
    if (apify.website) {
      const bestLinkedin = pickBestLinkedIn([scrapedLinkedIn, apify.linkedinUrl, finalLinkedin], companyName)
      return {
        website: apify.website,
        linkedinUrl: bestLinkedin,
        industry: clearbit.industry ?? kg.industry ?? null,
        companySize: clearbit.companySize ?? null,
        confidence: apify.confidence,
        source: 'google',
      }
    }
    if (!best) {
      console.log(`  ❌ No results for "${companyName}"`)
      return { website: null, linkedinUrl: finalLinkedin, industry: clearbit.industry ?? kg.industry ?? null, companySize: clearbit.companySize ?? null, confidence: 0, source: 'none' }
    }
  }

  console.log(`  🏆 ${best.website} (conf ${best.confidence}, src ${best.source}) | LI: ${finalLinkedin ?? 'none'}`)
  return {
    website: best.website,
    linkedinUrl: finalLinkedin,
    industry: clearbit.industry ?? kg.industry ?? null,
    companySize: clearbit.companySize ?? null,
    confidence: best.confidence,
    source: best.source,
  }
}

// ─── Bulk API ─────────────────────────────────────────────────────────────────

export async function enrichMultipleCompanies(
  companies: Array<{ id: string; name: string; city?: string | null }>
): Promise<Map<string, EnrichedCompanyData>> {
  const results = new Map<string, EnrichedCompanyData>()
  console.log(`\n🚀 Bulk enrichment: ${companies.length} companies`)

  const BATCH_SIZE = 3
  for (let i = 0; i < companies.length; i += BATCH_SIZE) {
    const batch = companies.slice(i, i + BATCH_SIZE)
    console.log(`\n[Batch ${Math.floor(i / BATCH_SIZE) + 1}] Processing ${batch.map(c => c.name).join(', ')}`)

    const batchResults = await Promise.all(
      batch.map(({ id, name, city }) =>
        enrichCompanyWebsite(name, city).then(data => ({ id, data }))
      )
    )
    for (const { id, data } of batchResults) results.set(id, data)

    if (i + BATCH_SIZE < companies.length) await new Promise(r => setTimeout(r, 400))
  }

  const found = Array.from(results.values()).filter(r => r.website).length
  const linkedinFound = Array.from(results.values()).filter(r => r.linkedinUrl).length
  const scrapedLinkedIn = Array.from(results.values()).filter(r => r.source === 'website_scrape').length
  console.log(`\n✅ Done: ${found}/${companies.length} websites, ${linkedinFound}/${companies.length} LinkedIn URLs`)
  console.log(`   📊 ${scrapedLinkedIn} LinkedIn URLs found via website scraping (most accurate method)`)
  return results
}