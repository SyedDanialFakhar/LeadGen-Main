// src/services/apolloApi.ts
/**
 * APOLLO.IO API SERVICE
 * Verified against official docs — April 2026
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ⚠️  REQUIRES A MASTER API KEY — regular keys will get 403 on search endpoints
 *     Create at: developer.apollo.io/#/keys  →  toggle "Set as master key" ON
 *
 * Base URL:  https://api.apollo.io/api/v1   ← /api/v1 NOT /v1
 * Auth:      Header  x-api-key: YOUR_KEY    ← not URL param (deprecated)
 *
 * CREDIT COSTS (free tier = 75 credits/month):
 *   GET  /organizations/enrich?domain=  → 1 credit  (real LinkedIn employee count)
 *   POST /mixed_companies/search        → 1 credit  (fallback when no domain)
 *   POST /mixed_people/api_search       → FREE ✅   (no credits ever)
 *   POST /people/match  (id=)           → 1 credit  (reveals the email)
 *
 * CREDIT-SAVING RULES applied in this service:
 *   1. Skip org enrichment if lead already has domain + employee count ≤ 500
 *   2. Try org enrichment by domain before name search (same cost, more accurate)
 *   3. People search is always free — use it liberally
 *   4. Only reveal email for the single best candidate per company
 */

import { getApolloApiKey } from './settingsService'

const APOLLO_BASE = 'https://api.apollo.io/api/v1'

// ─── Shared fetch wrapper ──────────────────────────────────────────────────────

async function apolloFetch(path: string, init: RequestInit): Promise<Response> {
  const apiKey = await getApolloApiKey()
  if (!apiKey) {
    throw new Error(
      'Apollo API key not configured.\n\n' +
      'Steps to fix:\n' +
      '1. Go to developer.apollo.io/#/keys\n' +
      '2. Click "Create new key"\n' +
      '3. Toggle "Set as master key" ON\n' +
      '4. Copy the key\n' +
      '5. Add VITE_APOLLO_API_KEY=your_key to your .env file'
    )
  }

  const res = await fetch(`${APOLLO_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
      'x-api-key': apiKey,            // Header auth — URL param is deprecated
      ...(init.headers as Record<string, string> | undefined),
    },
  })

  if (res.ok) return res

  let errorDetail = ''
  try { errorDetail = (await res.clone().json()).message ?? '' } catch {}

  switch (res.status) {
    case 401:
      throw new Error('Apollo: Invalid API key — check your key in .env and Settings.')
    case 403:
      throw new Error(
        'Apollo: Permission denied.\n' +
        'You need a MASTER API KEY.\n' +
        'Go to developer.apollo.io/#/keys → Create key → toggle "Set as master key" ON.'
      )
    case 422:
      throw new Error(`Apollo validation error: ${errorDetail || res.statusText}`)
    case 429:
      throw new Error('Apollo rate limit reached — wait 60 seconds and try again.')
    default:
      throw new Error(`Apollo error ${res.status}: ${errorDetail || res.statusText}`)
  }
}

// ─── Public Types ──────────────────────────────────────────────────────────────

export interface ApolloOrg {
  id: string
  name: string
  websiteUrl: string | null
  /** Sourced from LinkedIn — real verified employee count */
  linkedinUrl: string | null
  estimatedNumEmployees: number | null
  industry: string | null
  city: string | null
  country: string | null
  domain: string | null
}

export interface ApolloPerson {
  id: string
  name: string
  firstName: string
  lastName: string
  title: string
  linkedinUrl: string | null
  /** Always null from /mixed_people/api_search — must call enrichPersonById */
  email: string | null
  emailStatus: string | null
  orgName: string | null
}

// Backwards-compat (used by existing useEnrichment.ts)
export interface ApolloContact {
  id: string
  firstName: string
  lastName: string
  name: string
  title: string
  email: string | null
  phone: string | null
  linkedinUrl: string | null
  organization: {
    id: string
    name: string
    websiteUrl: string | null
    linkedinUrl: string | null
    estimatedNumEmployees: number | null
  } | null
}

export interface ApolloEnrichedContact {
  id: string
  firstName: string
  lastName: string
  name: string
  title: string
  email: string | null
  phone: string | null
  linkedinUrl: string | null
  emailStatus: string | null
  city: string | null
  country: string | null
  organization: {
    id: string
    name: string
    websiteUrl: string | null
    linkedinUrl: string | null
    estimatedNumEmployees: number | null
  } | null
}

// ─── 1. Organization Enrichment by domain ─────────────────────────────────────
// Costs 1 credit. Returns real employee count from LinkedIn.
// Most accurate source. Call this FIRST when you have a domain.

export async function enrichOrganizationByDomain(domain: string): Promise<ApolloOrg | null> {
  const clean = domain
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
    .trim()

  if (!clean || clean.length < 3) return null

  try {
    const res = await apolloFetch(`/organizations/enrich?domain=${encodeURIComponent(clean)}`, {
      method: 'GET',
    })
    const data = await res.json()
    const o = data.organization
    if (!o) return null

    return mapOrg(o, clean)
  } catch (err) {
    // 422/validation = domain not in Apollo — not a real error
    if (err instanceof Error && (err.message.includes('422') || err.message.includes('validation'))) {
      return null
    }
    throw err
  }
}

// ─── 2. Organization Search by name ───────────────────────────────────────────
// Costs 1 credit. Only use when we have NO domain.

export async function searchOrganizationByName(
  companyName: string,
  city?: string | null
): Promise<ApolloOrg | null> {
  const res = await apolloFetch('/mixed_companies/search', {
    method: 'POST',
    body: JSON.stringify({
      q_organization_name: companyName,
      organization_locations: ['Australia'],
      per_page: 5,
      page: 1,
    }),
  })

  const data = await res.json()
  const orgs: any[] = data.organizations ?? []
  if (!orgs.length) return null

  // Best match: name contains first word of query
  const first = companyName.toLowerCase().split(' ')[0]
  const best = orgs.find(o => o.name?.toLowerCase().includes(first)) ?? orgs[0]

  return mapOrg(best, best.primary_domain ?? null)
}

function mapOrg(o: any, fallbackDomain: string | null): ApolloOrg {
  return {
    id: o.id ?? '',
    name: o.name ?? '',
    websiteUrl: o.website_url ?? null,
    linkedinUrl: o.linkedin_url ?? null,
    estimatedNumEmployees: o.estimated_num_employees ?? null,
    industry: o.industry ?? null,
    city: o.city ?? null,
    country: o.country ?? null,
    domain: o.primary_domain ?? o.domain ?? fallbackDomain,
  }
}

// ─── 3. People Search (FREE — zero credits always) ────────────────────────────
// Returns IDs + titles. Never returns emails — that requires enrichment.
// Correct endpoint: /mixed_people/api_search  (NOT /mixed_people/search)

export async function searchPeopleByTitles(params: {
  companyName: string
  domain?: string | null
  organizationId?: string | null
  titles: string[]
  seniorities?: string[]
}): Promise<ApolloPerson[]> {
  const body: Record<string, unknown> = {
    person_titles: params.titles,
    organization_locations: ['Australia'],
    per_page: 10,
    page: 1,
    include_similar_titles: true,
  }

  // Domain is the most reliable company identifier
  if (params.domain) {
    body.q_organization_domains_list = [params.domain]
  } else if (params.organizationId) {
    body.organization_ids = [params.organizationId]
  } else {
    body.q_organization_name = params.companyName
  }

  if (params.seniorities?.length) {
    body.person_seniorities = params.seniorities
  }

  const res = await apolloFetch('/mixed_people/api_search', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  const data = await res.json()
  const people: any[] = data.people ?? []

  return people.map(p => ({
    id: p.id as string,
    name: (p.name as string) ?? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
    firstName: (p.first_name as string) ?? '',
    lastName: (p.last_name as string) ?? '',
    title: (p.title as string) ?? '',
    linkedinUrl: (p.linkedin_url as string) ?? null,
    email: null,           // NEVER returned by this endpoint
    emailStatus: null,
    orgName: (p.organization?.name as string) ?? params.companyName,
  }))
}

// ─── 4. Enrich person by Apollo ID (costs 1 credit) ──────────────────────────
// THE correct way to get an email. Pass the id from searchPeopleByTitles.
// Endpoint: POST /people/match with { id: "..." } in body

export async function enrichPersonById(personId: string): Promise<{
  email: string | null
  emailStatus: string | null
  linkedinUrl: string | null
  name: string | null
  title: string | null
} | null> {
  try {
    const res = await apolloFetch('/people/match', {
      method: 'POST',
      body: JSON.stringify({
        id: personId,
        reveal_personal_emails: false,  // true = personal email (costs more)
        reveal_phone_number: false,     // phone NOT on free tier
      }),
    })
    const data = await res.json()
    const p = data.person
    if (!p) return null

    return {
      email: (p.email as string) ?? null,
      emailStatus: (p.email_status as string) ?? null,
      linkedinUrl: (p.linkedin_url as string) ?? null,
      name: (p.name as string) ?? null,
      title: (p.title as string) ?? null,
    }
  } catch {
    return null  // Soft fail — let Hunter try
  }
}

// ─── 5. Legacy shims (used by existing useEnrichment hook) ────────────────────

export async function searchPeople(query: {
  name?: string
  company?: string
  title?: string
  location?: string
}): Promise<ApolloContact[]> {
  const body: Record<string, unknown> = { per_page: 5, page: 1 }
  if (query.company) body.q_organization_name = query.company
  if (query.name) body.q_keywords = query.name
  if (query.title) body.person_titles = [query.title]
  if (query.location) body.organization_locations = [query.location]

  const res = await apolloFetch('/mixed_people/api_search', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return (data.people ?? []).map((p: any) => ({
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    name: p.name ?? `${p.first_name} ${p.last_name}`,
    title: p.title,
    email: null,
    phone: null,
    linkedinUrl: p.linkedin_url ?? null,
    organization: p.organization
      ? {
          id: p.organization.id,
          name: p.organization.name,
          websiteUrl: p.organization.website_url ?? null,
          linkedinUrl: p.organization.linkedin_url ?? null,
          estimatedNumEmployees: p.organization.estimated_num_employees ?? null,
        }
      : null,
  }))
}

export async function enrichPerson(email: string): Promise<ApolloEnrichedContact | null> {
  try {
    const qs = new URLSearchParams({
      email,
      reveal_personal_emails: 'false',
      reveal_phone_number: 'false',
    })
    const res = await apolloFetch(`/people/match?${qs}`, { method: 'POST', body: '{}' })
    const data = await res.json()
    const p = data.person
    if (!p) return null

    return {
      id: p.id, firstName: p.first_name, lastName: p.last_name,
      name: p.name, title: p.title,
      email: p.email ?? null, phone: null,
      linkedinUrl: p.linkedin_url ?? null,
      emailStatus: p.email_status ?? null,
      city: p.city ?? null, country: p.country ?? null,
      organization: p.organization
        ? {
            id: p.organization.id, name: p.organization.name,
            websiteUrl: p.organization.website_url ?? null,
            linkedinUrl: p.organization.linkedin_url ?? null,
            estimatedNumEmployees: p.organization.estimated_num_employees ?? null,
          }
        : null,
    }
  } catch { return null }
}