// src/services/companyEnrichment.ts

export interface EnrichedCompanyData {
  website: string | null
  linkedinUrl: string | null
  industry: string | null
  companySize: string | null
  confidence: number
  source: 'knowledgegraph' | 'duckduckgo' | 'clearbit' | 'apify' | 'google' | 'none'
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
    return u.origin
  } catch {
    return url
  }
}

const BLOCKED_DOMAINS = [
  'google.com', 'google.com.au', 'bing.com', 'yahoo.com',
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
  'tiktok.com', 'youtube.com', 'pinterest.com',
  'seek.com.au', 'indeed.com', 'glassdoor.com', 'jora.com',
  'linkedin.com',
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

// ─── PRIMARY: Google Knowledge Graph API (FREE, 100k/day, highest accuracy) ───

async function tryKnowledgeGraph(
  companyName: string,
  city?: string | null
): Promise<{ website: string | null; linkedinUrl: string | null; industry: string | null; confidence: number }> {
  const empty = { website: null, linkedinUrl: null, industry: null, confidence: 0 }
  
  // Get API key from environment variable
  const apiKey = import.meta.env.VITE_GOOGLE_KNOWLEDGE_GRAPH_API_KEY
  if (!apiKey) {
    console.log(`  [KnowledgeGraph] No API key configured. Get one from Google Cloud Console (free).`)
    return empty
  }

  try {
    const cleanName = cleanCompanyName(companyName)
    console.log(`  [KnowledgeGraph] Searching: "${cleanName}"`)

    // Add location context to improve results for Australian companies
    const query = city && city.toLowerCase() !== 'australia' && city.length > 2
      ? `${cleanName} ${city}`
      : `${cleanName} Australia`

    const response = await fetch(
      `https://kgsearch.googleapis.com/v1/entities:search?query=${encodeURIComponent(query)}&key=${apiKey}&limit=3&types=Organization&indent=True`,
      { signal: AbortSignal.timeout(8000) }
    )

    if (!response.ok) {
      console.log(`  [KnowledgeGraph] HTTP ${response.status}`)
      return empty
    }

    const data = await response.json()
    
    if (!data.itemListElement || data.itemListElement.length === 0) {
      console.log(`  [KnowledgeGraph] No results found`)
      return empty
    }

    // Find the best match (prefer Australian entities)
    let bestMatch = null
    let bestScore = 0

    for (const item of data.itemListElement) {
      const result = item.result
      const name = result.name || ''
      const detailedDescription = result.detailedDescription?.url || null
      const url = result.url || result.sameAs?.find((u: string) => u.includes('.com')) || null
      
      // Calculate match score
      let score = 0
      if (name.toLowerCase().includes(cleanName.toLowerCase())) score += 5
      if (url && url.includes('.com.au')) score += 3  // Prefer .com.au
      if (url && extractDomain(url).includes(cleanName.toLowerCase().replace(/\s/g, ''))) score += 4
      
      if (score > bestScore) {
        bestScore = score
        bestMatch = result
      }
    }

    if (!bestMatch) {
      console.log(`  [KnowledgeGraph] No good match found`)
      return empty
    }

    // Extract website from various possible fields
    let website = bestMatch.url || null
    if (!website && bestMatch.sameAs) {
      const sameAs = Array.isArray(bestMatch.sameAs) ? bestMatch.sameAs : [bestMatch.sameAs]
      website = sameAs.find((u: string) => 
        u && !u.includes('wikipedia.org') && !u.includes('facebook.com') && !u.includes('twitter.com')
      ) || null
    }

    // Try to find LinkedIn from sameAs
    let linkedinUrl = null
    if (bestMatch.sameAs) {
      const sameAs = Array.isArray(bestMatch.sameAs) ? bestMatch.sameAs : [bestMatch.sameAs]
      linkedinUrl = sameAs.find((u: string) => u && u.includes('linkedin.com/company/')) || null
    }

    if (website) {
      website = normaliseUrl(website)
      const confidence = Math.min(10, 7 + Math.floor(bestScore / 2))
      console.log(`  [KnowledgeGraph] ✅ ${website} (confidence ${confidence})`)
      if (linkedinUrl) console.log(`  [KnowledgeGraph] ✅ LinkedIn: ${linkedinUrl}`)
      
      return {
        website,
        linkedinUrl,
        industry: bestMatch.description || null,
        confidence,
      }
    }

    return empty

  } catch (error) {
    console.log(`  [KnowledgeGraph] Error:`, error)
    return empty
  }
}

// ─── Source: DuckDuckGo (FREE, no API key, no CORS, fast fallback) ───────────

async function tryDuckDuckGo(
  companyName: string,
  city?: string | null
): Promise<{ website: string | null; linkedinUrl: string | null; confidence: number }> {
  const empty = { website: null, linkedinUrl: null, confidence: 0 }
  
  try {
    const cleanName = cleanCompanyName(companyName)
    const locationPart = city && city.toLowerCase() !== 'australia' && city.length > 2
      ? ` ${city}`
      : ' Australia'
    
    const queries = [
      `${cleanName}${locationPart} company official website`,
      `${cleanName}${locationPart} linkedin`,
      `${cleanName} .com.au`,
    ]
    
    let bestWebsite: string | null = null
    let bestLinkedin: string | null = null
    let bestScore = 0
    
    for (const query of queries) {
      console.log(`  [DuckDuckGo] Query: "${query}"`)
      
      const response = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&t=leadflow-enrichment`,
        { signal: AbortSignal.timeout(6000) }
      )
      
      if (!response.ok) continue
      
      const data = await response.json()
      
      const urls: string[] = []
      
      if (data.AbstractURL) urls.push(data.AbstractURL)
      if (data.Redirect) urls.push(data.Redirect)
      if (data.Results) {
        for (const result of data.Results) {
          if (result.FirstURL) urls.push(result.FirstURL)
        }
      }
      if (data.RelatedTopics) {
        for (const topic of data.RelatedTopics) {
          if (topic.FirstURL) urls.push(topic.FirstURL)
          if (topic.Results) {
            for (const sub of topic.Results) {
              if (sub.FirstURL) urls.push(sub.FirstURL)
            }
          }
        }
      }
      
      for (const url of urls) {
        if (!url || !url.startsWith('http')) continue
        
        if (!bestLinkedin && url.includes('linkedin.com/company/')) {
          bestLinkedin = url.split('?')[0]
          console.log(`  [DuckDuckGo] ✅ LinkedIn: ${bestLinkedin}`)
        }
        
        if (isBlockedUrl(url)) continue
        
        const domain = extractDomain(url)
        if (!domain) continue
        
        let score = domainMatchScore(domain, companyName)
        if (url.includes('.com.au')) score += 2
        if (url.includes('.au')) score += 1
        
        if (score > bestScore) {
          bestScore = score
          bestWebsite = normaliseUrl(url)
          console.log(`  [DuckDuckGo] 📍 Candidate: ${bestWebsite} (score ${score})`)
        }
      }
      
      if (bestScore >= 8 && bestLinkedin) break
    }
    
    const confidence = Math.min(10, Math.floor(bestScore / 1.5))
    if (bestWebsite) console.log(`  [DuckDuckGo] ✅ Final: ${bestWebsite} (confidence ${confidence})`)
    
    return { website: bestWebsite, linkedinUrl: bestLinkedin, confidence }
    
  } catch (error) {
    console.log(`  [DuckDuckGo] Error:`, error)
    return empty
  }
}

// ─── Source: Clearbit ─────────────────────────────────────────────────────────

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

// ─── Source: Hunter.io ────────────────────────────────────────────────────────

async function tryHunter(companyName: string, city?: string | null): Promise<{
  website: string | null; linkedinUrl: string | null; confidence: number
}> {
  const empty = { website: null, linkedinUrl: null, confidence: 0 }
  try {
    const clean = cleanCompanyName(companyName)
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

// ─── Source: Google Search (Apify) - Last Resort ──────────────────────────────

async function tryGoogleSearch(
  companyName: string,
  city?: string | null
): Promise<{ website: string | null; linkedinUrl: string | null; confidence: number }> {
  const empty = { website: null, linkedinUrl: null, confidence: 0 }

  let apifyToken: string | null = null
  try {
    const { getApifyToken } = await import('./settingsService')
    apifyToken = await getApifyToken()
  } catch {
    // settingsService not available
  }

  const cleanName = cleanCompanyName(companyName)
  const locationSuffix = city && city.toLowerCase() !== 'australia' && city.length > 2
    ? ` ${city}`
    : ' Australia'

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

        for (const page of rawItems) {
          const organic: Array<{ url?: string; link?: string }> = page.organicResults ?? page.results ?? []
          items.push(...organic)
        }
        if (items.length === 0 && Array.isArray(rawItems)) {
          items = rawItems
        }
      } else {
        const ddgRes = await fetch(
          `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&t=leadflow-enrichment`,
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

      for (const item of items) {
        const rawUrl: string = item.link ?? item.url ?? ''
        if (!rawUrl || !rawUrl.startsWith('http')) continue

        if (!bestLinkedin && rawUrl.includes('linkedin.com/company/')) {
          bestLinkedin = rawUrl.split('?')[0]
          console.log(`  [Google] ✅ LinkedIn: ${bestLinkedin}`)
        }

        if (isBlockedUrl(rawUrl)) continue

        const domain = extractDomain(rawUrl)
        if (!domain) continue

        let score = domainMatchScore(domain, companyName)
        if (rawUrl.includes('.com.au')) score += 2
        if (rawUrl.includes('.au')) score += 1

        if (score > bestScore) {
          bestScore = score
          bestWebsite = normaliseUrl(rawUrl)
          console.log(`  [Google] 📍 Candidate: ${bestWebsite} (score ${score})`)
        }
      }

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

  // 1. Google Knowledge Graph (FREE, 100k/day, highest accuracy)
  const knowledgeGraph = await tryKnowledgeGraph(companyName, city)
  if (knowledgeGraph.website && knowledgeGraph.confidence >= 6) {
    console.log(`  ✅ KnowledgeGraph high-confidence result returned early`)
    return {
      website: knowledgeGraph.website,
      linkedinUrl: knowledgeGraph.linkedinUrl,
      industry: knowledgeGraph.industry,
      companySize: null,
      confidence: knowledgeGraph.confidence,
      source: 'knowledgegraph',
    }
  }

  // 2. DuckDuckGo (FREE, fast, good fallback)
  const duckduckgo = await tryDuckDuckGo(companyName, city)
  if (duckduckgo.website && duckduckgo.confidence >= 7) {
    console.log(`  ✅ DuckDuckGo high-confidence result returned early`)
    return {
      website: duckduckgo.website,
      linkedinUrl: duckduckgo.linkedinUrl,
      industry: null,
      companySize: null,
      confidence: duckduckgo.confidence,
      source: 'duckduckgo',
    }
  }

  // 3. Clearbit
  const clearbit = await tryClearbit(companyName)
  if (clearbit.website && clearbit.confidence >= 7) {
    console.log(`  ✅ Clearbit high-confidence result returned early`)
    return { ...clearbit, source: 'clearbit' }
  }

  // 4. Hunter.io
  const hunter = await tryHunter(companyName, city)

  // 5. Google Search (fallback)
  const google = await tryGoogleSearch(companyName, city)

  // ── Merge: prefer highest confidence ──────────────────────────────────────
  const candidates = [
    { website: knowledgeGraph.website, linkedinUrl: knowledgeGraph.linkedinUrl, confidence: knowledgeGraph.confidence, source: 'knowledgegraph' as const },
    { website: duckduckgo.website, linkedinUrl: duckduckgo.linkedinUrl, confidence: duckduckgo.confidence, source: 'duckduckgo' as const },
    { website: clearbit.website, linkedinUrl: clearbit.linkedinUrl, confidence: clearbit.confidence, source: 'clearbit' as const },
    { website: hunter.website, linkedinUrl: hunter.linkedinUrl, confidence: hunter.confidence, source: 'apify' as const },
    { website: google.website, linkedinUrl: google.linkedinUrl, confidence: google.confidence, source: 'google' as const },
  ]
    .filter(c => c.website)
    .sort((a, b) => b.confidence - a.confidence)

  const best = candidates[0]
  const finalLinkedin = knowledgeGraph.linkedinUrl ?? clearbit.linkedinUrl ?? google.linkedinUrl ?? duckduckgo.linkedinUrl ?? hunter.linkedinUrl ?? null

  if (!best) {
    console.log(`  ❌ No results found for "${companyName}"`)
    return {
      website: null,
      linkedinUrl: finalLinkedin,
      industry: clearbit.industry ?? knowledgeGraph.industry,
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
    industry: clearbit.industry ?? knowledgeGraph.industry ?? null,
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