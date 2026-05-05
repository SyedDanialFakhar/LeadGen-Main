/**
 * APOLLO.IO API SERVICE — PRODUCTION LEVEL
 * ─────────────────────────────────────────────────────────────────────────────
 * All endpoints verified against official Apollo API docs (2025).
 *
 * BASE URL  : https://api.apollo.io/api/v1   (NOT /v1)
 * AUTH      : x-api-key header (Master key required)
 * ALL PARAMS: query string (NOT JSON body)
 *
 * CRITICAL INSIGHT from official docs:
 *   api_search returns `has_email` and `has_direct_phone` on every person
 *   BEFORE any credits are spent. We use these to SCORE and PRIORITIZE
 *   candidates. Never blindly enrich the first result.
 *
 * ENDPOINTS:
 *   GET  /organizations/enrich?domain=              1 credit
 *   POST /mixed_companies/search?q_...              1 credit
 *   POST /mixed_people/api_search?person_titles[]=  FREE
 *   POST /people/match?id=                          1 credit (email + phone)
 */

import { getApolloApiKey } from './settingsService'

const BASE = 'https://api.apollo.io/api/v1'

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

async function apolloFetch(path: string, method: 'GET' | 'POST', qs?: string): Promise<Response> {
  const key = await getApolloApiKey()
  if (!key?.trim()) {
    throw new Error(
      'Apollo API key not configured.\n1. Go to developer.apollo.io/#/keys\n' +
      '2. Create key → toggle "Set as master key" ON\n3. Add it in Settings',
    )
  }

  const url = `${BASE}${path}${qs ? `?${qs}` : ''}`
  console.log(`[Apollo] ${method} ${path} qs=${(qs ?? '').slice(0, 100)}`)

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      accept: 'application/json',
      'x-api-key': key.trim(),
    },
  })

  console.log(`[Apollo] HTTP ${res.status}`)
  if (res.ok) return res

  let detail = ''
  try { const e = await res.clone().json(); detail = e.message || e.error || JSON.stringify(e) }
  catch { detail = await res.clone().text().catch(() => '') }

  if (res.status === 401) throw new Error('Apollo 401: Invalid API key.')
  if (res.status === 403) throw new Error('Apollo 403: Must use MASTER key. Toggle ON at developer.apollo.io/#/keys')
  if (res.status === 422) throw new Error(`Apollo 422: ${detail}`)
  if (res.status === 429) throw new Error('Apollo 429: Rate limited — wait 60s.')
  throw new Error(`Apollo ${res.status}: ${detail || res.statusText}`)
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ApolloOrg {
  id: string; name: string; websiteUrl: string | null; linkedinUrl: string | null
  estimatedNumEmployees: number | null; industry: string | null
  city: string | null; country: string | null; domain: string | null; phone: string | null
}

/** Returned FREE by api_search — includes scoring metadata has_email / has_direct_phone */
export interface ApolloPersonSearchResult {
  id: string; firstName: string; lastName: string; title: string
  linkedinUrl: string | null; orgName: string | null
  hasEmail: boolean               // use to decide if enrichment is worth it
  hasDirectPhone: 'Yes' | 'Maybe' | 'No' | null
  lastRefreshedAt: string | null  // older = less reliable data
}

/** Returned by people/match — costs 1 credit */
export interface ApolloPersonEnriched {
  id: string; name: string; firstName: string; lastName: string; title: string
  email: string | null; emailStatus: string | null
  linkedinUrl: string | null; phone: string | null
}

export interface ApolloContact {
  id: string; firstName: string; lastName: string; name: string; title: string
  email: string | null; phone: string | null; linkedinUrl: string | null
  organization: { id: string; name: string; websiteUrl: string | null; linkedinUrl: string | null; estimatedNumEmployees: number | null } | null
}

export interface ApolloEnrichedContact extends ApolloPersonEnriched {
  city: string | null; country: string | null
  organization: { id: string; name: string; websiteUrl: string | null; linkedinUrl: string | null; estimatedNumEmployees: number | null } | null
}

// ─── Mappers ───────────────────────────────────────────────────────────────────

function mapOrg(o: any, fallbackDomain?: string | null): ApolloOrg {
  return {
    id: o.id ?? '', name: o.name ?? '',
    websiteUrl: o.website_url ?? null, linkedinUrl: o.linkedin_url ?? null,
    estimatedNumEmployees: o.estimated_num_employees ?? null, industry: o.industry ?? null,
    city: o.city ?? null, country: o.country ?? null,
    domain: o.primary_domain ?? o.domain ?? fallbackDomain ?? null,
    phone: o.phone ?? o.sanitized_phone ?? null,
  }
}

function extractPhone(p: any): string | null {
  if (p.phone) return p.phone
  const phones: any[] = p.phone_numbers ?? []
  if (!phones.length) return null
  const sorted = [...phones].sort((a, b) => {
    const rank = (t: string) => t === 'direct_dial' || t === 'work_direct' ? 0 : t === 'corporate' ? 1 : t === 'mobile' ? 2 : 3
    return rank(a.type_cd) - rank(b.type_cd)
  })
  return sorted[0]?.sanitized_number ?? null
}

// ─── 1. Org enrichment by domain ─────────────────────────────────────────────

export async function enrichOrganizationByDomain(domain: string): Promise<ApolloOrg | null> {
  const clean = domain.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '').toLowerCase().trim()
  if (!clean || clean.length < 4 || !clean.includes('.')) return null

  try {
    const res = await apolloFetch('/organizations/enrich', 'GET', buildQS({ domain: clean }))
    const data = await res.json()
    if (!data.organization) { console.log('[Apollo] Domain not in DB:', clean); return null }
    const org = mapOrg(data.organization, clean)
    console.log(`[Apollo] Org by domain: "${org.name}" emp=${org.estimatedNumEmployees}`)
    return org
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('422') || msg.includes('Invalid request')) return null
    throw err
  }
}

// ─── 2. Org search by name ────────────────────────────────────────────────────

export async function searchOrganizationByName(companyName: string): Promise<ApolloOrg | null> {
  const qs = buildQS({ q_organization_name: companyName, organization_locations: ['Australia'], per_page: 5, page: 1 })
  const res = await apolloFetch('/mixed_companies/search', 'POST', qs)
  const data = await res.json()
  const orgs: any[] = data.organizations ?? []
  if (!orgs.length) { console.log('[Apollo] No orgs for:', companyName); return null }

  const lc = companyName.toLowerCase()
  const firstWord = lc.replace(/[^a-z0-9\s]/g, '').split(' ').find(w => w.length > 3) ?? ''
  const best = orgs.find(o => o.name?.toLowerCase() === lc)
    ?? (firstWord ? orgs.find(o => o.name?.toLowerCase().includes(firstWord)) : null)
    ?? orgs[0]

  console.log(`[Apollo] Org by name: "${best.name}" emp=${best.estimated_num_employees}`)
  return mapOrg(best)
}

// ─── 3. People search — FREE (returns scoring metadata) ───────────────────────
//
// Key params:
//   include_similar_titles=true  → Apollo includes close variants automatically
//   contact_email_status[]       → filter to people likely to have emails (free)
//   person_seniorities[]         → filter out interns/entry-level
//
// Response includes has_email + has_direct_phone — use for SCORING before enriching.

export async function searchPeopleByTitles(params: {
  companyName: string
  domain?: string | null
  organizationId?: string | null
  titles: string[]
  seniorities?: string[]
  requireEmail?: boolean
}): Promise<ApolloPersonSearchResult[]> {
  const qsParams: Record<string, string | string[] | number | boolean> = {
    person_titles: params.titles,
    organization_locations: ['Australia'],
    include_similar_titles: true,
    per_page: 10,
    page: 1,
  }

  if (params.domain) {
    qsParams['q_organization_domains_list'] = [params.domain]
  } else if (params.organizationId) {
    qsParams['organization_ids'] = [params.organizationId]
  } else {
    qsParams['q_organization_name'] = params.companyName
  }

  if (params.seniorities?.length) qsParams['person_seniorities'] = params.seniorities

  // Filter to people Apollo knows have emails — FREE, no credits
  if (params.requireEmail) {
    qsParams['contact_email_status'] = ['verified', 'likely_to_engage', 'unverified']
  }

  const res = await apolloFetch('/mixed_people/api_search', 'POST', buildQS(qsParams))
  const data = await res.json()
  const people: any[] = data.people ?? []
  console.log(`[Apollo] People search "${params.companyName}": ${people.length} results`)

  return people.map(p => ({
    id: String(p.id ?? ''),
    firstName: String(p.first_name ?? ''),
    lastName: String(p.last_name ?? ''),
    title: String(p.title ?? ''),
    linkedinUrl: p.linkedin_url ?? null,
    orgName: p.organization?.name ?? null,
    hasEmail: p.has_email === true,
    hasDirectPhone: p.has_direct_phone ?? null,
    lastRefreshedAt: p.last_refreshed_at ?? null,
  }))
}

// ─── 4. Enrich by ID — 1 credit (email + direct dial) ────────────────────────

export async function enrichPersonById(personId: string): Promise<ApolloPersonEnriched | null> {
  try {
    const qs = buildQS({ id: personId, reveal_personal_emails: false, reveal_phone_number: true })
    const res = await apolloFetch('/people/match', 'POST', qs)
    const data = await res.json()
    const p = data.person
    if (!p) { console.log('[Apollo] enrichPersonById: no person for', personId); return null }
    const phone = extractPhone(p)
    console.log(`[Apollo] Enriched: ${p.name} | email=${!!p.email} phone=${!!phone}`)
    return { id: p.id, name: p.name ?? '', firstName: p.first_name ?? '', lastName: p.last_name ?? '', title: p.title ?? '', email: p.email ?? null, emailStatus: p.email_status ?? null, linkedinUrl: p.linkedin_url ?? null, phone }
  } catch (err) {
    console.error('[Apollo] enrichPersonById:', err instanceof Error ? err.message : err)
    return null
  }
}

// ─── 5. Enrich by name + domain — 1 credit (fallback) ────────────────────────

export async function enrichPersonByNameDomain(
  firstName: string, lastName: string, domain: string, organizationName?: string,
): Promise<ApolloPersonEnriched | null> {
  try {
    const qs = buildQS({ first_name: firstName, last_name: lastName, domain, ...(organizationName ? { organization_name: organizationName } : {}), reveal_personal_emails: false, reveal_phone_number: true })
    const res = await apolloFetch('/people/match', 'POST', qs)
    const data = await res.json()
    const p = data.person
    if (!p) return null
    return { id: p.id, name: p.name ?? '', firstName: p.first_name ?? '', lastName: p.last_name ?? '', title: p.title ?? '', email: p.email ?? null, emailStatus: p.email_status ?? null, linkedinUrl: p.linkedin_url ?? null, phone: extractPhone(p) }
  } catch (err) {
    console.error('[Apollo] enrichPersonByNameDomain:', err instanceof Error ? err.message : err)
    return null
  }
}

// ─── Legacy (useEnrichment.ts) ────────────────────────────────────────────────

export async function searchPeople(query: { name?: string; company?: string; title?: string; location?: string }): Promise<ApolloContact[]> {
  const qsParams: Record<string, string | string[] | number> = { per_page: 5, page: 1 }
  if (query.company) qsParams['q_organization_name'] = query.company
  if (query.name)    qsParams['q_keywords']          = query.name
  if (query.title)   qsParams['person_titles']       = [query.title]
  if (query.location) qsParams['organization_locations'] = [query.location]
  const res = await apolloFetch('/mixed_people/api_search', 'POST', buildQS(qsParams))
  const data = await res.json()
  return (data.people ?? []).map((p: any) => ({
    id: p.id, firstName: p.first_name ?? '', lastName: p.last_name ?? '',
    name: p.name ?? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
    title: p.title ?? '', email: null, phone: null, linkedinUrl: p.linkedin_url ?? null,
    organization: p.organization ? { id: p.organization.id, name: p.organization.name, websiteUrl: p.organization.website_url ?? null, linkedinUrl: p.organization.linkedin_url ?? null, estimatedNumEmployees: p.organization.estimated_num_employees ?? null } : null,
  }))
}

export async function enrichPerson(email: string): Promise<ApolloEnrichedContact | null> {
  try {
    const qs = buildQS({ email, reveal_personal_emails: false, reveal_phone_number: false })
    const res = await apolloFetch('/people/match', 'POST', qs)
    const data = await res.json()
    const p = data.person
    if (!p) return null
    return { id: p.id, name: p.name ?? '', firstName: p.first_name ?? '', lastName: p.last_name ?? '', title: p.title ?? '', email: p.email ?? null, emailStatus: p.email_status ?? null, linkedinUrl: p.linkedin_url ?? null, phone: p.phone ?? null, city: p.city ?? null, country: p.country ?? null, organization: p.organization ? { id: p.organization.id, name: p.organization.name, websiteUrl: p.organization.website_url ?? null, linkedinUrl: p.organization.linkedin_url ?? null, estimatedNumEmployees: p.organization.estimated_num_employees ?? null } : null }
  } catch { return null }
}