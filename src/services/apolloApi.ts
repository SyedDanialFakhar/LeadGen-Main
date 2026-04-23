// src/services/apolloApi.ts
/**
 * APOLLO.IO API — Verified against official docs, April 2026
 * ─────────────────────────────────────────────────────────────────────────────
 * Correct base URL: https://api.apollo.io/api/v1  ← /api/v1 NOT /v1
 *
 * Endpoint costs:
 *   GET  /organizations/enrich?domain=   → costs credits, returns LinkedIn employee count
 *   POST /mixed_companies/search         → costs credits, use only if no domain
 *   POST /mixed_people/api_search        → FREE, no credits, no emails returned
 *   POST /people/match?id=               → costs 1 credit, reveals email
 *
 * Key param names (official):
 *   q_organization_domains_list          ← array, no www/@
 *   organization_ids                     ← array of Apollo org IDs
 *   person_titles                        ← array
 *   organization_locations               ← array  e.g. ["Australia"]
 *   organization_num_employees_ranges    ← array  e.g. ["1,500"]
 *   include_similar_titles               ← boolean
 *   person_seniorities                   ← array e.g. ["c_suite","director","manager"]
 */

import { getApolloApiKey } from './settingsService'

const APOLLO_BASE = 'https://api.apollo.io/api/v1'

// ─── Shared fetch wrapper ──────────────────────────────────────────────────────

async function apolloFetch(path: string, init: RequestInit): Promise<Response> {
  const apiKey = await getApolloApiKey()
  if (!apiKey) throw new Error('Apollo API key not configured — add it in Settings.')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    accept: 'application/json',
    'x-api-key': apiKey,
    ...(init.headers as Record<string, string> | undefined),
  }

  const res = await fetch(`${APOLLO_BASE}${path}`, { ...init, headers })

  if (!res.ok) {
    if (res.status === 401)
      throw new Error('Invalid Apollo API key — check your Settings.')
    if (res.status === 403)
      throw new Error('Apollo API key lacks permission for this endpoint (may need a master API key).')
    if (res.status === 422) {
      let msg = 'Apollo validation error'
      try { msg = (await res.json()).message ?? msg } catch {}
      throw new Error(msg)
    }
    if (res.status === 429)
      throw new Error('Apollo rate limit reached — please wait a moment and try again.')
    throw new Error(`Apollo error ${res.status}: ${res.statusText}`)
  }

  return res
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ApolloOrg {
  id: string
  name: string
  websiteUrl: string | null
  linkedinUrl: string | null
  /** Comes from LinkedIn data — this is the real verified employee count */
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
  /** Always null from /mixed_people/api_search — only set after enrichment */
  email: string | null
  emailStatus: string | null
  orgName: string | null
}

// Backwards-compat types for existing useEnrichment.ts
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
// Best for getting REAL employee count (sourced from LinkedIn).
// Costs credits. Always try this before name-based search.

export async function enrichOrganizationByDomain(
  domain: string,
): Promise<ApolloOrg | null> {
  const clean = domain
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
    .trim()

  if (!clean) return null

  try {
    const res = await apolloFetch(
      `/organizations/enrich?domain=${encodeURIComponent(clean)}`,
      { method: 'GET' },
    )
    const data = await res.json()
    const o = data.organization
    if (!o) return null

    return {
      id: o.id ?? '',
      name: o.name ?? '',
      websiteUrl: o.website_url ?? null,
      linkedinUrl: o.linkedin_url ?? null,
      estimatedNumEmployees: o.estimated_num_employees ?? null,
      industry: o.industry ?? null,
      city: o.city ?? null,
      country: o.country ?? null,
      domain: o.primary_domain ?? o.domain ?? clean,
    }
  } catch (err) {
    // 422 = domain not found, not a real error
    if (err instanceof Error && err.message.includes('422')) return null
    if (err instanceof Error && err.message.includes('validation')) return null
    throw err
  }
}

// ─── 2. Organization Search by company name ────────────────────────────────────
// Costs credits. Only use when we have no domain to try.

export async function searchOrganizationByName(
  companyName: string,
  city?: string | null,
): Promise<ApolloOrg | null> {
  const body: Record<string, unknown> = {
    q_organization_name: companyName,
    organization_locations: ['Australia'],
    per_page: 5,
    page: 1,
  }

  const res = await apolloFetch('/mixed_companies/search', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  const data = await res.json()
  const orgs: any[] = data.organizations ?? []
  if (!orgs.length) return null

  // Best-match: name contains first word of query
  const firstWord = companyName.toLowerCase().split(' ')[0]
  const best =
    orgs.find(o => o.name?.toLowerCase().includes(firstWord)) ?? orgs[0]

  return {
    id: best.id ?? '',
    name: best.name ?? companyName,
    websiteUrl: best.website_url ?? null,
    linkedinUrl: best.linkedin_url ?? null,
    estimatedNumEmployees: best.estimated_num_employees ?? null,
    industry: best.industry ?? null,
    city: best.city ?? null,
    country: best.country ?? null,
    domain: best.primary_domain ?? null,
  }
}

// ─── 3. People API Search (FREE — zero credits) ───────────────────────────────
// Returns person IDs and job titles. Does NOT return emails ever.
// Must pass results to enrichPersonById() to get the email.

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

  // Domain is most reliable — takes precedence over org ID
  if (params.domain) {
    body.q_organization_domains_list = [params.domain]
  } else if (params.organizationId) {
    body.organization_ids = [params.organizationId]
  } else {
    // Last resort: name search (less accurate)
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
    email: null,        // Never returned by this endpoint
    emailStatus: null,
    orgName: (p.organization?.name as string) ?? params.companyName,
  }))
}

// ─── 4. People Enrichment by Apollo ID (costs 1 credit) ──────────────────────
// This is the CORRECT way to get an email.
// Pass the `id` from searchPeopleByTitles.

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
        reveal_personal_emails: false,  // true = personal email like gmail (more credits)
        reveal_phone_number: false,
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
    return null  // Soft fail — proceed to Hunter
  }
}

// ─── 5. People match by name + domain (costs 1 credit, no ID needed) ──────────
// Useful when we have a name from Hunter and want Apollo enrichment.

export async function enrichPersonByNameAndDomain(params: {
  firstName: string
  lastName: string
  domain: string
}): Promise<{ email: string | null; emailStatus: string | null } | null> {
  try {
    const qs = new URLSearchParams({
      first_name: params.firstName,
      last_name: params.lastName,
      domain: params.domain,
      reveal_personal_emails: 'false',
      reveal_phone_number: 'false',
    })
    const res = await apolloFetch(`/people/match?${qs}`, {
      method: 'POST',
      body: '{}',
    })

    const data = await res.json()
    const p = data.person
    if (!p) return null

    return {
      email: (p.email as string) ?? null,
      emailStatus: (p.email_status as string) ?? null,
    }
  } catch {
    return null
  }
}

// ─── Legacy shims (used by existing useEnrichment hook) ───────────────────────

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
  const people: any[] = data.people ?? []

  return people.map(p => ({
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    name: p.name ?? `${p.first_name} ${p.last_name}`,
    title: p.title,
    email: null,    // Not returned by this endpoint
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

export async function enrichPerson(
  email: string,
): Promise<ApolloEnrichedContact | null> {
  try {
    const qs = new URLSearchParams({
      email,
      reveal_personal_emails: 'false',
      reveal_phone_number: 'false',
    })
    const res = await apolloFetch(`/people/match?${qs}`, {
      method: 'POST',
      body: '{}',
    })
    const data = await res.json()
    const p = data.person
    if (!p) return null

    return {
      id: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
      name: p.name,
      title: p.title,
      email: p.email ?? null,
      phone: null,
      linkedinUrl: p.linkedin_url ?? null,
      emailStatus: p.email_status ?? null,
      city: p.city ?? null,
      country: p.country ?? null,
      organization: p.organization
        ? {
            id: p.organization.id,
            name: p.organization.name,
            websiteUrl: p.organization.website_url ?? null,
            linkedinUrl: p.organization.linkedin_url ?? null,
            estimatedNumEmployees: p.organization.estimated_num_employees ?? null,
          }
        : null,
    }
  } catch {
    return null
  }
}