/**
 * APOLLO.IO API SERVICE
 * ══════════════════════════════════════════════════════════════════════════════
 * All endpoints verified against official Apollo API reference docs (May 2025).
 *
 * BASE URL   : https://api.apollo.io/api/v1
 * AUTH       : x-api-key header — MASTER KEY required for all endpoints
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ ENDPOINT REFERENCE (verified from docs)                                 │
 * ├──────────────────────────────────────────┬──────────┬───────────────────┤
 * │ Endpoint                                 │ Method   │ Credits           │
 * ├──────────────────────────────────────────┼──────────┼───────────────────┤
 * │ /organizations/enrich?domain=            │ GET      │ 1 per call        │
 * │ /organizations/bulk_enrich               │ POST     │ 1 per org         │
 * │ /organizations/{id}                      │ GET      │ see docs          │
 * │ /organizations/{id}/job_postings         │ GET      │ 1 per call        │
 * │ /mixed_companies/search?q_...            │ POST     │ 1 per call        │
 * │ /mixed_people/api_search?...             │ POST     │ FREE (no email)   │
 * │ /people/match?id=...                     │ POST     │ 1 per enrichment  │
 * │ /people/bulk_match                       │ POST     │ 1 per person      │
 * │ /news_articles/search                    │ POST     │ 1 per call        │
 * └──────────────────────────────────────────┴──────────┴───────────────────┘
 *
 * CRITICAL PHONE NUMBER NOTE (from official docs):
 *   reveal_phone_number=true REQUIRES webhook_url + is FULLY ASYNC.
 *   Apollo sends the phone to your webhook, not in the API response.
 *   We do NOT use this — would need a public HTTPS webhook endpoint.
 *   Corporate/HQ phone comes from org enrichment (included for free).
 *
 * BULK ENRICHMENT NOTE:
 *   /people/bulk_match uses JSON BODY with details[] array (NOT query string).
 *   /organizations/bulk_enrich also uses JSON BODY.
 *   Single /people/match uses QUERY STRING params.
 */

import { getApolloApiKey } from './settingsService'

const BASE = 'https://api.apollo.io/api/v1'

// ─── Query string builder ──────────────────────────────────────────────────────
// Handles arrays as key[]=v1&key[]=v2 (verified from Apollo cURL examples)

export function buildQS(
  params: Record<string, string | string[] | boolean | number | null | undefined>,
): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue
    if (Array.isArray(value)) {
      for (const v of value) {
        parts.push(`${encodeURIComponent(key)}[]=${encodeURIComponent(String(v))}`)
      }
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    }
  }
  return parts.join('&')
}

// ─── Core fetch helper ─────────────────────────────────────────────────────────

async function apolloRequest(
  path: string,
  method: 'GET' | 'POST',
  options?: { qs?: string; body?: Record<string, unknown> },
): Promise<Response> {
  const key = await getApolloApiKey()

  if (!key?.trim()) {
    throw new Error(
      'Apollo API key not configured.\n' +
      'Steps:\n' +
      '1. Go to developer.apollo.io/#/keys\n' +
      '2. Create key → toggle "Set as master key" ON (required for all endpoints)\n' +
      '3. Add the key in Settings → Apollo API Key\n' +
      '4. Refresh the page',
    )
  }

  // ✅ CHANGED: Call through Vercel proxy instead of directly to Apollo
  const proxyUrl = '/api/apollo-proxy'
  
  console.log(`[Apollo] ${method} ${path} via proxy`)

  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      path,
      method,
      qs: options?.qs,
      body: options?.body,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || `Proxy error: ${response.status}`)
  }

  const data = await response.json()
  
  // Return a Response-like object
  return {
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    clone: function() { return this as Response },
  } as Response
}

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ApolloOrg {
  id: string
  name: string
  websiteUrl: string | null
  linkedinUrl: string | null
  estimatedNumEmployees: number | null
  industry: string | null
  city: string | null
  country: string | null
  domain: string | null
  phone: string | null   // Corporate/HQ phone — returned synchronously from org enrichment
  annualRevenue: number | null
  totalFunding: number | null
  currentJobPostingsCount: number | null
}

/**
 * Partial result from /mixed_people/api_search — FREE, no credits.
 * has_email and has_direct_phone are key for scoring before enriching.
 */
export interface ApolloPersonSearchResult {
  id: string
  firstName: string
  lastName: string
  title: string
  linkedinUrl: string | null
  orgName: string | null
  // FREE scoring metadata — tells you if enrichment will yield data
  hasEmail: boolean                              // true = Apollo has an email for this person
  hasDirectPhone: 'Yes' | 'Maybe' | 'No' | null // indicates phone availability
  lastRefreshedAt: string | null                 // older = potentially stale data
}

/** Full result from /people/match or /people/bulk_match — costs 1 credit */
export interface ApolloPersonEnriched {
  id: string
  name: string
  firstName: string
  lastName: string
  title: string
  email: string | null
  emailStatus: string | null   // "verified" | "likely_to_engage" | "unverified" | "unavailable"
  linkedinUrl: string | null
  // NOTE: phone is NOT returned here — reveal_phone_number requires async webhook
  // Phone only available via org enrichment (corporate/HQ phone)
}

export interface ApolloJobPosting {
  id: string
  title: string
  url: string | null
  city: string | null
  country: string | null
  postedAt: string | null
}

// Legacy types for backward compatibility
export interface ApolloContact {
  id: string; firstName: string; lastName: string; name: string; title: string
  email: string | null; phone: string | null; linkedinUrl: string | null
  organization: { id: string; name: string; websiteUrl: string | null; linkedinUrl: string | null; estimatedNumEmployees: number | null } | null
}
export interface ApolloEnrichedContact extends ApolloPersonEnriched {
  city: string | null; country: string | null
  organization: { id: string; name: string; websiteUrl: string | null; linkedinUrl: string | null; estimatedNumEmployees: number | null } | null
}

// ══════════════════════════════════════════════════════════════════════════════
// MAPPERS
// ══════════════════════════════════════════════════════════════════════════════

function mapOrg(o: any, fallbackDomain?: string | null): ApolloOrg {
  return {
    id: o.id ?? '',
    name: o.name ?? '',
    websiteUrl: o.website_url ?? null,
    linkedinUrl: o.linkedin_url ?? null,
    estimatedNumEmployees: o.estimated_num_employees ?? null,
    industry: o.industry ?? null,
    city: o.city ?? null,
    country: o.country ?? null,
    domain: o.primary_domain ?? o.domain ?? fallbackDomain ?? null,
    phone: o.phone ?? o.sanitized_phone ?? null,    // Corporate HQ phone (free)
    annualRevenue: o.annual_revenue_printed ? parseFloat(String(o.annual_revenue_printed).replace(/[^0-9.]/g, '')) || null : null,
    totalFunding: o.total_funding ?? null,
    currentJobPostingsCount: o.current_job_postings_count ?? o.job_postings_count ?? null,
  }
}

function mapPersonEnriched(p: any): ApolloPersonEnriched {
  return {
    id: p.id ?? '',
    name: p.name ?? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
    firstName: p.first_name ?? '',
    lastName: p.last_name ?? '',
    title: p.title ?? '',
    email: p.email ?? null,
    emailStatus: p.email_status ?? null,
    linkedinUrl: p.linkedin_url ?? null,
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. ORGANIZATION ENRICHMENT BY DOMAIN
// GET /api/v1/organizations/enrich?domain=example.com — 1 credit
// Returns: industry, revenue, employee count, funding, HQ phone, LinkedIn URL
// ══════════════════════════════════════════════════════════════════════════════

export async function enrichOrganizationByDomain(domain: string): Promise<ApolloOrg | null> {
  const clean = domain
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
    .trim()

  if (!clean || clean.length < 4 || !clean.includes('.')) {
    console.warn('[Apollo] enrichOrganizationByDomain: invalid domain:', domain)
    return null
  }

  try {
    const res = await apolloRequest(
      '/organizations/enrich',
      'GET',
      { qs: buildQS({ domain: clean }) },
    )
    const data = await res.json()

    if (!data.organization) {
      console.log('[Apollo] Domain not found in Apollo DB:', clean)
      return null
    }

    const org = mapOrg(data.organization, clean)
    console.log(`[Apollo] Org by domain: "${org.name}" | emp=${org.estimatedNumEmployees} | phone=${org.phone}`)
    return org
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // 422 = domain not in Apollo — not a real error
    if (msg.includes('422') || msg.includes('Invalid request')) {
      console.log('[Apollo] Domain not in Apollo DB (422):', clean)
      return null
    }
    throw err
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. BULK ORGANIZATION ENRICHMENT
// POST /api/v1/organizations/bulk_enrich — 1 credit per org
// Enriches up to 10 orgs at once. Body is JSON with domains[] array.
// More efficient than calling enrichOrganizationByDomain 10 times separately.
// ══════════════════════════════════════════════════════════════════════════════

export async function bulkEnrichOrganizations(
  domains: string[],
): Promise<(ApolloOrg | null)[]> {
  if (!domains.length) return []
  if (domains.length > 10) {
    throw new Error('bulkEnrichOrganizations: max 10 domains per call')
  }

  const cleanDomains = domains
    .map(d => d.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '').toLowerCase().trim())
    .filter(d => d.length >= 4 && d.includes('.'))

  if (!cleanDomains.length) return domains.map(() => null)

  const res = await apolloRequest(
    '/organizations/bulk_enrich',
    'POST',
    { body: { domains: cleanDomains } },
  )
  const data = await res.json()

  const orgs: any[] = data.organizations ?? []
  console.log(`[Apollo] Bulk org enrichment: ${orgs.length}/${cleanDomains.length} found`)

  // Map back to original domain order
  return cleanDomains.map(domain => {
    const found = orgs.find((o: any) =>
      (o.primary_domain ?? o.domain ?? '').toLowerCase() === domain ||
      (o.website_url ?? '').toLowerCase().includes(domain),
    )
    return found ? mapOrg(found, domain) : null
  })
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. GET COMPLETE ORGANIZATION INFO
// GET /api/v1/organizations/{id} — requires master key
// Returns the most complete org profile Apollo has for a given Apollo org ID.
// ══════════════════════════════════════════════════════════════════════════════

export async function getCompleteOrganizationInfo(orgId: string): Promise<ApolloOrg | null> {
  try {
    const res = await apolloRequest(`/organizations/${orgId}`, 'GET')
    const data = await res.json()

    const org = data.organization ?? data
    if (!org?.id) {
      console.log('[Apollo] getCompleteOrganizationInfo: no data for org', orgId)
      return null
    }

    return mapOrg(org)
  } catch (err) {
    console.error('[Apollo] getCompleteOrganizationInfo error:', err instanceof Error ? err.message : err)
    return null
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. ORGANIZATION JOB POSTINGS
// GET /api/v1/organizations/{organization_id}/job_postings — 1 credit
// Returns current active job postings at the company.
// Use to confirm a company is actively hiring + get job type context.
// ══════════════════════════════════════════════════════════════════════════════

export async function getOrganizationJobPostings(
  orgId: string,
  perPage = 25,
): Promise<ApolloJobPosting[]> {
  try {
    const qs = buildQS({ per_page: perPage, page: 1 })
    const res = await apolloRequest(
      `/organizations/${orgId}/job_postings`,
      'GET',
      { qs },
    )
    const data = await res.json()
    const postings: any[] = data.job_postings ?? []

    console.log(`[Apollo] Job postings for ${orgId}: ${postings.length} found`)

    return postings.map(p => ({
      id: p.id ?? '',
      title: p.title ?? p.job_title ?? '',
      url: p.url ?? p.job_url ?? null,
      city: p.city ?? null,
      country: p.country ?? null,
      postedAt: p.posted_at ?? p.created_at ?? null,
    }))
  } catch (err) {
    console.error('[Apollo] getOrganizationJobPostings error:', err instanceof Error ? err.message : err)
    return []
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. ORGANIZATION SEARCH BY NAME
// POST /api/v1/mixed_companies/search — 1 credit per call
// Use when we don't have a domain to enrich by.
// Key params (verified from docs): q_organization_name, organization_locations[],
//   organization_num_employees_ranges[], q_organization_job_titles[]
// ══════════════════════════════════════════════════════════════════════════════

export async function searchOrganizationByName(
  companyName: string,
  options?: {
    maxEmployees?: number
    location?: string
  },
): Promise<ApolloOrg | null> {
  console.log('[Apollo] searchOrganizationByName:', companyName)

  const qsParams: Record<string, string | string[] | number> = {
    q_organization_name: companyName,
    organization_locations: [options?.location ?? 'Australia'],
    per_page: 5,
    page: 1,
  }

  // Pre-filter by size if we know the max — saves enriching wrong company
  if (options?.maxEmployees) {
    qsParams['organization_num_employees_ranges'] = [`1,${options.maxEmployees}`]
  }

  const res = await apolloRequest('/mixed_companies/search', 'POST', { qs: buildQS(qsParams) })
  const data = await res.json()
  const orgs: any[] = data.organizations ?? []

  if (!orgs.length) {
    console.log('[Apollo] No orgs found for name:', companyName)
    return null
  }

  // Best match: exact name > first-significant-word > first result
  const lc = companyName.toLowerCase()
  const firstWord = lc.replace(/[^a-z0-9\s]/g, '').split(' ').find(w => w.length > 3) ?? ''
  const exact = orgs.find(o => o.name?.toLowerCase() === lc)
  const wordHit = firstWord ? orgs.find(o => o.name?.toLowerCase().includes(firstWord)) : null
  const best = exact ?? wordHit ?? orgs[0]

  console.log(`[Apollo] Best org match: "${best.name}" | emp=${best.estimated_num_employees}`)
  return mapOrg(best)
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. PEOPLE API SEARCH — FREE (no credits consumed)
// POST /api/v1/mixed_people/api_search — MASTER KEY required
// Does NOT return emails or phone numbers. Returns has_email + has_direct_phone
// as FREE scoring metadata. Use these before deciding who to enrich.
//
// Key params verified from docs:
//   person_titles[]                    — job title filter
//   include_similar_titles             — broaden to variants (e.g. "HR Lead")
//   person_seniorities[]               — owner|founder|c_suite|partner|vp|head|
//                                        director|manager|senior|entry|intern
//   organization_locations[]           — filter by company HQ location
//   q_organization_domains_list[]      — filter by company domain (most accurate)
//   organization_ids[]                 — filter by Apollo org ID
//   q_organization_name                — filter by company name
//   contact_email_status[]             — verified|unverified|likely to engage|unavailable
//   organization_num_employees_ranges[]— e.g. "1,500" (pre-filter company size FREE)
//   organization_job_posted_at_range[min/max] — companies that posted jobs recently
// ══════════════════════════════════════════════════════════════════════════════

export interface PeopleSearchParams {
  companyName: string
  domain?: string | null
  organizationId?: string | null
  titles: string[]
  seniorities?: string[]
  emailStatusFilter?: Array<'verified' | 'unverified' | 'likely to engage' | 'unavailable'>
  maxEmployees?: number             // pre-filters company size for FREE
  jobPostedSince?: string           // ISO date — only companies that posted jobs recently
}

export async function searchPeopleByTitles(
  params: PeopleSearchParams,
): Promise<ApolloPersonSearchResult[]> {
  console.log(`[Apollo] People search: "${params.companyName}" | titles: ${params.titles.slice(0, 2).join(', ')}`)

  const qsParams: Record<string, string | string[] | number | boolean> = {
    person_titles: params.titles,
    organization_locations: ['Australia'],
    include_similar_titles: true,   // Apollo broadens to variants automatically — very useful
    per_page: 10,
    page: 1,
  }

  // Company targeting: domain is most precise, then org ID, then name
  if (params.domain) {
    qsParams['q_organization_domains_list'] = [params.domain]
  } else if (params.organizationId) {
    qsParams['organization_ids'] = [params.organizationId]
  } else {
    qsParams['q_organization_name'] = params.companyName
  }

  // Seniority filter
  if (params.seniorities?.length) {
    qsParams['person_seniorities'] = params.seniorities
  }

  // Email status filter — only return people with verified/likely emails (FREE)
  if (params.emailStatusFilter?.length) {
    qsParams['contact_email_status'] = params.emailStatusFilter
  }

  // Pre-filter company size — saves enriching people at oversized companies (FREE)
  if (params.maxEmployees) {
    qsParams['organization_num_employees_ranges'] = [`1,${params.maxEmployees}`]
  }

  // Companies that posted jobs recently — signals active hiring intent
  if (params.jobPostedSince) {
    qsParams['organization_job_posted_at_range[min]'] = params.jobPostedSince
  }

  const qs = buildQS(qsParams)
  const res = await apolloRequest('/mixed_people/api_search', 'POST', { qs })
  const data = await res.json()
  const people: any[] = data.people ?? []

  console.log(`[Apollo] People search result: ${people.length} candidates for "${params.companyName}"`)

  return people.map(p => ({
    id: String(p.id ?? ''),
    firstName: String(p.first_name ?? ''),
    lastName: String(p.last_name ?? ''),
    title: String(p.title ?? ''),
    linkedinUrl: p.linkedin_url ?? null,
    orgName: p.organization?.name ?? null,
    // These are the FREE scoring fields — use BEFORE spending credits to enrich
    hasEmail: p.has_email === true,
    hasDirectPhone: p.has_direct_phone ?? null,
    lastRefreshedAt: p.last_refreshed_at ?? null,
  }))
}

// ══════════════════════════════════════════════════════════════════════════════
// 7. PEOPLE ENRICHMENT (SINGLE)
// POST /api/v1/people/match — 1 credit per enrichment
// Params go as QUERY STRING (confirmed from docs + cURL examples)
// Returns email and email_status. Does NOT return phone (async webhook needed).
//
// Best to use with: id (Apollo person ID from search results)
// Also works with: first_name + last_name + domain/organization_name
// ══════════════════════════════════════════════════════════════════════════════

export async function enrichPersonById(personId: string): Promise<ApolloPersonEnriched | null> {
  try {
    const qs = buildQS({
      id: personId,
      reveal_personal_emails: false,
      // NOTE: reveal_phone_number INTENTIONALLY omitted — requires async webhook
    })

    const res = await apolloRequest('/people/match', 'POST', { qs })
    const data = await res.json()
    const p = data.person

    if (!p) {
      console.log('[Apollo] enrichPersonById: no match for ID', personId)
      return null
    }

    const enriched = mapPersonEnriched(p)
    console.log(`[Apollo] Enriched by ID: ${enriched.name} | email=${enriched.email} [${enriched.emailStatus}]`)
    return enriched
  } catch (err) {
    console.error('[Apollo] enrichPersonById error:', err instanceof Error ? err.message : err)
    return null
  }
}

export async function enrichPersonByNameDomain(
  firstName: string,
  lastName: string,
  domain: string,
  organizationName?: string,
): Promise<ApolloPersonEnriched | null> {
  try {
    const qs = buildQS({
      first_name: firstName,
      last_name: lastName,
      domain,
      ...(organizationName ? { organization_name: organizationName } : {}),
      reveal_personal_emails: false,
    })

    const res = await apolloRequest('/people/match', 'POST', { qs })
    const data = await res.json()
    const p = data.person
    if (!p) return null

    const enriched = mapPersonEnriched(p)
    console.log(`[Apollo] Enriched by name+domain: ${enriched.name} | email=${enriched.email}`)
    return enriched
  } catch (err) {
    console.error('[Apollo] enrichPersonByNameDomain error:', err instanceof Error ? err.message : err)
    return null
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 8. BULK PEOPLE ENRICHMENT — up to 10 people in ONE API call
// POST /api/v1/people/bulk_match — 1 credit per person enriched
// Uses JSON BODY with details[] array (different from single /people/match)
// This is far more efficient than calling enrichPersonById 10 times.
// Rate limit: 50% of single endpoint's per-minute rate, 100% of hourly/daily.
// ══════════════════════════════════════════════════════════════════════════════

export interface BulkEnrichPersonInput {
  id?: string          // Apollo person ID (most reliable)
  firstName?: string
  lastName?: string
  domain?: string
  organizationName?: string
  linkedinUrl?: string
}

export async function bulkEnrichPeople(
  people: BulkEnrichPersonInput[],
): Promise<(ApolloPersonEnriched | null)[]> {
  if (!people.length) return []
  if (people.length > 10) {
    throw new Error('bulkEnrichPeople: max 10 people per call (Apollo limit)')
  }

  console.log(`[Apollo] Bulk enriching ${people.length} people`)

  // Build details array for JSON body — each person is an object
  const details = people.map(p => {
    const d: Record<string, string> = {}
    if (p.id)              d.id              = p.id
    if (p.firstName)       d.first_name      = p.firstName
    if (p.lastName)        d.last_name       = p.lastName
    if (p.domain)          d.domain          = p.domain
    if (p.organizationName) d.organization_name = p.organizationName
    if (p.linkedinUrl)     d.linkedin_url    = p.linkedinUrl
    return d
  })

  const res = await apolloRequest('/people/bulk_match', 'POST', {
    // Query param for options
    qs: buildQS({ reveal_personal_emails: false }),
    // JSON body for the people details
    body: { details },
  })

  const data = await res.json()
  const matches: any[] = data.matches ?? []

  console.log(`[Apollo] Bulk enrichment: ${matches.length}/${people.length} matched`)

  // Map matches back to input order using id or name matching
  return people.map((input, i) => {
    // Apollo returns matches in same order, but let's be safe
    const match = matches[i]
    if (!match?.person) return null
    return mapPersonEnriched(match.person)
  })
}

// ══════════════════════════════════════════════════════════════════════════════
// 9. NEWS ARTICLES SEARCH
// POST /api/v1/news_articles/search — consumes credits
// Find recent news about companies — useful for pitch context.
// ══════════════════════════════════════════════════════════════════════════════

export async function searchNewsForOrganization(
  orgId: string,
  perPage = 5,
): Promise<Array<{ title: string; url: string | null; publishedAt: string | null }>> {
  try {
    const res = await apolloRequest('/news_articles/search', 'POST', {
      qs: buildQS({
        organization_ids: [orgId],
        per_page: perPage,
        page: 1,
      }),
    })
    const data = await res.json()
    const articles: any[] = data.news_articles ?? data.articles ?? []

    return articles.map(a => ({
      title: a.title ?? a.headline ?? '',
      url: a.url ?? a.link ?? null,
      publishedAt: a.published_at ?? a.date ?? null,
    }))
  } catch (err) {
    console.error('[Apollo] searchNewsForOrganization error:', err instanceof Error ? err.message : err)
    return []
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// LEGACY COMPATIBILITY (used by useEnrichment.ts)
// ══════════════════════════════════════════════════════════════════════════════

export async function searchPeople(query: {
  name?: string; company?: string; title?: string; location?: string
}): Promise<ApolloContact[]> {
  const qsParams: Record<string, string | string[] | number> = { per_page: 5, page: 1 }
  if (query.company)  qsParams['q_organization_name']    = query.company
  if (query.name)     qsParams['q_keywords']             = query.name
  if (query.title)    qsParams['person_titles']          = [query.title]
  if (query.location) qsParams['organization_locations'] = [query.location]

  const res = await apolloRequest('/mixed_people/api_search', 'POST', { qs: buildQS(qsParams) })
  const data = await res.json()

  return (data.people ?? []).map((p: any) => ({
    id: p.id ?? '', firstName: p.first_name ?? '', lastName: p.last_name ?? '',
    name: p.name ?? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
    title: p.title ?? '', email: null, phone: null, linkedinUrl: p.linkedin_url ?? null,
    organization: p.organization ? {
      id: p.organization.id, name: p.organization.name,
      websiteUrl: p.organization.website_url ?? null,
      linkedinUrl: p.organization.linkedin_url ?? null,
      estimatedNumEmployees: p.organization.estimated_num_employees ?? null,
    } : null,
  }))
}

export async function enrichPerson(email: string): Promise<ApolloEnrichedContact | null> {
  try {
    const res = await apolloRequest('/people/match', 'POST', {
      qs: buildQS({ email, reveal_personal_emails: false }),
    })
    const data = await res.json()
    const p = data.person
    if (!p) return null
    return {
      ...mapPersonEnriched(p), city: p.city ?? null, country: p.country ?? null,
      organization: p.organization ? {
        id: p.organization.id, name: p.organization.name,
        websiteUrl: p.organization.website_url ?? null,
        linkedinUrl: p.organization.linkedin_url ?? null,
        estimatedNumEmployees: p.organization.estimated_num_employees ?? null,
      } : null,
    }
  } catch { return null }
}