// src/services/companyEnrichment.ts
/**
 * COMPANY ENRICHMENT SERVICE (April 2026)
 *
 * Chain:
 *  1. Google Knowledge Graph API (FREE 100k/day) — most accurate for AU companies
 *  2. Clearbit Autocomplete (FREE, no auth)
 *  3. DuckDuckGo Instant Answer (FREE)
 *  4. Hunter.io domain search (FREE tier)
 *  5. Apify Google Search (paid, only if token configured)
 *
 * LinkedIn: runs via KG sameAs, Clearbit handle, slug-construction + DDG verify,
 * and Apify site:linkedin.com/company/ search — all sources combined.
 */

export interface EnrichedCompanyData {
  website: string | null
  linkedinUrl: string | null
  industry: string | null
  companySize: string | null
  confidence: number
  source: 'knowledgegraph' | 'clearbit' | 'duckduckgo' | 'hunter' | 'google' | 'none'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanCompanyName(name: string): string {
  if (!name) return ''
  return name
    .replace(/\bPty\.?\s*Ltd\.?\b|\bLtd\.?\b|\bPty\.?\b|\bLLC\b|\bInc\.?\b|\bCorp\.?\b|\bLimited\b|\bOperations\b/gi, '')
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

function extractDomain(url: string): string {
  try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '').toLowerCase() }
  catch { return '' }
}

function normaliseUrl(url: string): string {
  try { return new URL(url.startsWith('http') ? url : `https://${url}`).origin }
  catch { return url }
}

const BLOCKED_DOMAINS = [
  'google.com','google.com.au','bing.com','yahoo.com','duckduckgo.com',
  'facebook.com','instagram.com','twitter.com','x.com','tiktok.com',
  'youtube.com','pinterest.com','seek.com.au','indeed.com','glassdoor.com',
  'jora.com','yellowpages.com.au','whitepages.com.au','truelocal.com.au',
  'hotfrog.com.au','localsearch.com.au','yelp.com','wikipedia.org',
  'wikimedia.org','wikidata.org','abr.gov.au','asic.gov.au',
  'crunchbase.com','bloomberg.com','zoominfo.com','dnb.com',
]

function isBlockedUrl(url: string): boolean {
  const domain = extractDomain(url)
  return BLOCKED_DOMAINS.some(b => domain === b || domain.endsWith(`.${b}`))
}

function domainMatchScore(domain: string, companyName: string): number {
  const cComp = cleanCompanyName(companyName).toLowerCase().replace(/\s+/g, '')
  const cDom  = domain.replace(/\.com\.au$|\.com$|\.au$|\.net\.au$|\.org\.au$|\.net$|\.io$/, '').replace(/[^a-z0-9]/g, '')
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
    const u = new URL(url)
    if (!u.pathname.startsWith('/company/')) return null
    // Keep only /company/slug — strip extra path segments and trailing slash
    const parts = u.pathname.split('/').filter(Boolean)
    if (parts.length < 2) return null
    return `https://www.linkedin.com/company/${parts[1]}`
  } catch { return null }
}

// ─── 1. Google Knowledge Graph ────────────────────────────────────────────────

async function tryKnowledgeGraph(companyName: string, city?: string | null) {
  const empty = { website: null as string|null, linkedinUrl: null as string|null, industry: null as string|null, confidence: 0 }
  const apiKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_KNOWLEDGE_GRAPH_API_KEY) || ''
  if (!apiKey) return empty
  try {
    const cleanName = cleanCompanyName(companyName)
    const query = (city && city.toLowerCase() !== 'australia' && city.length > 2) ? `${cleanName} ${city}` : `${cleanName} Australia`
    console.log(`  [KG] "${query}"`)
    const res = await fetch(`https://kgsearch.googleapis.com/v1/entities:search?query=${encodeURIComponent(query)}&key=${apiKey}&limit=5&types=Organization`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return empty
    const data = await res.json()
    if (!data.itemListElement?.length) return empty

    let bestScore = 0, bestMatch = { ...empty }
    for (const item of data.itemListElement) {
      const r = item.result; let score = 0
      const name: string = r.name || ''
      if (name.toLowerCase().includes(cleanName.toLowerCase())) score += 5
      const sameAs: string[] = Array.isArray(r.sameAs) ? r.sameAs : (r.sameAs ? [r.sameAs] : [])
      const linkedinUrl = sameAs.find(u => u?.includes('linkedin.com/company/')) || null
      const website = r.url || sameAs.find(u => u && !isBlockedUrl(u) && !u.includes('linkedin.com')) || null
      if (website?.includes('.com.au')) score += 2
      if (linkedinUrl) score += 3
      if (item.resultScore) score += Math.min(3, Math.floor(item.resultScore / 10))
      if (score > bestScore) {
        bestScore = score
        bestMatch = { website: website ? normaliseUrl(website) : null, linkedinUrl: linkedinUrl ? cleanLinkedInUrl(linkedinUrl) : null, industry: r.description || null, confidence: 0 }
      }
    }
    if (!bestMatch.website && !bestMatch.linkedinUrl) return empty
    bestMatch.confidence = Math.min(10, 5 + Math.floor(bestScore / 2))
    console.log(`  [KG] ✅ ${bestMatch.website ?? 'no-site'} (conf ${bestMatch.confidence})`)
    return bestMatch
  } catch (e) { console.log(`  [KG] Error:`, e); return empty }
}

// ─── 2. Clearbit ──────────────────────────────────────────────────────────────

async function tryClearbit(companyName: string) {
  const empty = { website: null as string|null, linkedinUrl: null as string|null, industry: null as string|null, companySize: null as string|null, confidence: 0 }
  try {
    const clean = cleanCompanyName(companyName)
    console.log(`  [Clearbit] "${clean}"`)
    const res = await fetch(`https://company.clearbit.com/v1/domains/find?name=${encodeURIComponent(clean)}`, { headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(8000) })
    if (!res.ok) return empty
    const data = await res.json()
    if (!data?.domain) return empty
    const website = normaliseUrl(`https://${data.domain}`)
    const linkedinUrl = data.linkedin?.handle ? `https://www.linkedin.com/company/${data.linkedin.handle}` : null
    const score = domainMatchScore(data.domain, companyName)
    const confidence = Math.min(10, 6 + score)
    console.log(`  [Clearbit] ✅ ${website} (conf ${confidence})`)
    return { website, linkedinUrl, industry: data.category?.industry || null, companySize: data.metrics?.employeesRange || null, confidence }
  } catch (e) { console.log(`  [Clearbit] Error:`, e); return empty }
}

// ─── 3. LinkedIn slug verify via DDG ─────────────────────────────────────────

async function tryLinkedInSlug(companyName: string): Promise<string | null> {
  const slug = toLinkedInSlug(companyName)
  if (!slug || slug.length < 3) return null
  console.log(`  [LI-slug] Trying: linkedin.com/company/${slug}`)
  try {
    const q = `site:linkedin.com/company/ "${cleanCompanyName(companyName)}"`
    const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_redirect=1`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const data = await res.json()
    const urls: string[] = [
      data.AbstractURL,
      ...(data.Results || []).map((r: any) => r.FirstURL),
      ...(data.RelatedTopics || []).flatMap((t: any) => [t.FirstURL, ...(t.Results || []).map((s: any) => s.FirstURL)]),
    ].filter(Boolean)
    for (const url of urls) {
      if (url?.includes('linkedin.com/company/')) {
        const clean = cleanLinkedInUrl(url)
        if (clean) { console.log(`  [LI-slug] ✅ ${clean}`); return clean }
      }
    }
    return null
  } catch { return null }
}

// ─── 4. DuckDuckGo ────────────────────────────────────────────────────────────

async function tryDuckDuckGo(companyName: string, city?: string | null) {
  const empty = { website: null as string|null, linkedinUrl: null as string|null, confidence: 0 }
  try {
    const cleanName = cleanCompanyName(companyName)
    const loc = (city && city.toLowerCase() !== 'australia' && city.length > 2) ? ` ${city}` : ' Australia'
    const queries = [`${cleanName}${loc} official website`, `${cleanName}${loc} company`, `${cleanName} .com.au`]
    let bestWebsite: string|null = null, bestLinkedin: string|null = null, bestScore = 0
    for (const query of queries) {
      console.log(`  [DDG] "${query}"`)
      const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&t=leadflow`, { signal: AbortSignal.timeout(6000) })
      if (!res.ok) continue
      const data = await res.json()
      const urls: string[] = [data.AbstractURL, data.Redirect, data.OfficialSite,
        ...(data.Results || []).map((r: any) => r.FirstURL),
        ...(data.RelatedTopics || []).flatMap((t: any) => [t.FirstURL, ...(t.Results || []).map((s: any) => s.FirstURL)]),
      ].filter(Boolean)
      for (const url of urls) {
        if (!url?.startsWith('http')) continue
        if (!bestLinkedin && url.includes('linkedin.com/company/')) { bestLinkedin = cleanLinkedInUrl(url); continue }
        if (isBlockedUrl(url) || url.includes('linkedin.com')) continue
        const domain = extractDomain(url)
        let score = domainMatchScore(domain, companyName)
        if (url.includes('.com.au')) score += 2
        if (url.includes('.au')) score += 1
        if (score > bestScore) { bestScore = score; bestWebsite = normaliseUrl(url); console.log(`  [DDG] 📍 ${bestWebsite} (${score})`) }
      }
      if (bestScore >= 8) break
    }
    const confidence = Math.min(9, Math.floor(bestScore * 1.2))
    return { website: bestWebsite, linkedinUrl: bestLinkedin, confidence }
  } catch (e) { console.log(`  [DDG] Error:`, e); return empty }
}

// ─── 5. Hunter.io ─────────────────────────────────────────────────────────────

async function tryHunter(companyName: string) {
  const empty = { website: null as string|null, confidence: 0 }
  try {
    const res = await fetch(`https://api.hunter.io/v2/domains/search?query=${encodeURIComponent(cleanCompanyName(companyName))}`, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return empty
    const data = await res.json()
    if (!data?.domain) return empty
    const website = normaliseUrl(`https://${data.domain}`)
    const score = domainMatchScore(data.domain, companyName)
    console.log(`  [Hunter] ✅ ${website}`)
    return { website, confidence: Math.min(8, 4 + score) }
  } catch { return empty }
}

// ─── 6. Apify Google ─────────────────────────────────────────────────────────

async function tryApifyGoogle(companyName: string, city?: string | null) {
  const empty = { website: null as string|null, linkedinUrl: null as string|null, confidence: 0 }
  let apifyToken: string|null = null
  try { const { getApifyToken } = await import('./settingsService'); apifyToken = await getApifyToken() } catch {}
  if (!apifyToken) return empty

  const cleanName = cleanCompanyName(companyName)
  const slug = toLinkedInSlug(companyName)
  const loc = (city && city.toLowerCase() !== 'australia' && city.length > 2) ? ` ${city}` : ' Australia'
  const queries = [
    `"${cleanName}"${loc} site:.com.au`,
    `${cleanName}${loc} official website`,
    `site:linkedin.com/company/${slug}`,
  ]

  let bestWebsite: string|null = null, bestLinkedin: string|null = null, bestScore = 0

  for (const query of queries) {
    console.log(`  [Apify] "${query}"`)
    try {
      const startRes = await fetch(`https://api.apify.com/v2/acts/apify~google-search-scraper/runs?token=${apifyToken}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
        if (!bestLinkedin && rawUrl.includes('linkedin.com/company/')) { bestLinkedin = cleanLinkedInUrl(rawUrl); console.log(`  [Apify] ✅ LI: ${bestLinkedin}`); continue }
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

// ─── Public API ───────────────────────────────────────────────────────────────

export async function enrichCompanyWebsite(companyName: string, city?: string | null): Promise<EnrichedCompanyData> {
  console.log(`\n━━━ Enriching: "${companyName}" (${city ?? 'unknown'}) ━━━`)
  if (!companyName?.trim()) return { website: null, linkedinUrl: null, industry: null, companySize: null, confidence: 0, source: 'none' }

  // Run KG + Clearbit in parallel (both free & fast)
  const [kg, clearbit] = await Promise.all([tryKnowledgeGraph(companyName, city), tryClearbit(companyName)])

  // Check for early high-confidence result
  const earlyCandidates = [
    kg.website      && kg.confidence >= 7      ? { ...kg,      source: 'knowledgegraph' as const } : null,
    clearbit.website && clearbit.confidence >= 7 ? { ...clearbit, source: 'clearbit'      as const } : null,
  ].filter(Boolean) as any[]

  const linkedinSlugPromise = tryLinkedInSlug(companyName)

  if (earlyCandidates.length) {
    const best = earlyCandidates.sort((a: any, b: any) => b.confidence - a.confidence)[0]
    const slugLI = await linkedinSlugPromise
    const finalLinkedin = best.linkedinUrl ?? clearbit.linkedinUrl ?? kg.linkedinUrl ?? slugLI ?? null
    console.log(`  ✅ Early (${best.source}): ${best.website}`)
    if (finalLinkedin) console.log(`  ✅ LinkedIn: ${finalLinkedin}`)
    return {
      website: best.website,
      linkedinUrl: finalLinkedin,
      industry: clearbit.industry ?? kg.industry ?? null,
      companySize: (best.source === 'clearbit' ? clearbit.companySize : null) ?? null,
      confidence: best.confidence,
      source: best.source,
    }
  }

  // Secondary sources in parallel
  const [ddg, hunter, apify, slugLI] = await Promise.all([
    tryDuckDuckGo(companyName, city),
    tryHunter(companyName),
    tryApifyGoogle(companyName, city),
    linkedinSlugPromise,
  ])

  type Src = 'knowledgegraph'|'clearbit'|'duckduckgo'|'hunter'|'google'|'none'
  const wCandidates = [
    kg.website      ? { website: kg.website,      confidence: kg.confidence,      source: 'knowledgegraph' as Src } : null,
    clearbit.website ? { website: clearbit.website, confidence: clearbit.confidence, source: 'clearbit'      as Src } : null,
    ddg.website     ? { website: ddg.website,      confidence: ddg.confidence,     source: 'duckduckgo'     as Src } : null,
    hunter.website  ? { website: hunter.website,   confidence: hunter.confidence,  source: 'hunter'         as Src } : null,
    apify.website   ? { website: apify.website,    confidence: apify.confidence,   source: 'google'         as Src } : null,
  ].filter(Boolean).sort((a: any, b: any) => b.confidence - a.confidence) as any[]

  const finalLinkedin = [kg.linkedinUrl, clearbit.linkedinUrl, ddg.linkedinUrl, apify.linkedinUrl, slugLI].find(Boolean) ?? null
  const best = wCandidates[0] ?? null

  if (!best) {
    console.log(`  ❌ No results for "${companyName}"`)
    return { website: null, linkedinUrl: finalLinkedin, industry: clearbit.industry ?? kg.industry ?? null, companySize: clearbit.companySize ?? null, confidence: 0, source: 'none' }
  }

  console.log(`  🏆 ${best.website} (conf ${best.confidence}, src ${best.source})`)
  if (finalLinkedin) console.log(`  🏆 LinkedIn: ${finalLinkedin}`)

  return {
    website: best.website,
    linkedinUrl: finalLinkedin,
    industry: clearbit.industry ?? kg.industry ?? null,
    companySize: clearbit.companySize ?? null,
    confidence: best.confidence,
    source: best.source,
  }
}

export async function enrichMultipleCompanies(companies: Array<{ id: string; name: string; city?: string | null }>): Promise<Map<string, EnrichedCompanyData>> {
  const results = new Map<string, EnrichedCompanyData>()
  console.log(`\n🚀 Bulk enrichment: ${companies.length} companies`)
  for (let i = 0; i < companies.length; i++) {
    const { id, name, city } = companies[i]
    console.log(`\n[${i+1}/${companies.length}] ${name}`)
    results.set(id, await enrichCompanyWebsite(name, city))
    if (i < companies.length - 1) await new Promise(r => setTimeout(r, 600))
  }
  const found = Array.from(results.values()).filter(r => r.website).length
  console.log(`\n✅ Done: ${found}/${companies.length}`)
  return results
}