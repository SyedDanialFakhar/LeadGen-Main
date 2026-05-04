/**
 * APOLLO.IO API SERVICE — COMPLETE & CORRECTED
 * ─────────────────────────────────────────────────────────────────────────────
 * VERIFIED CORRECT ENDPOINTS (2025):
 *
 *   Base URL         : https://api.apollo.io/api/v1        ← /api/v1 NOT /v1
 *   Org enrichment   : GET  /organizations/enrich?domain=  ← GET, query param
 *   Org search       : POST /mixed_companies/search?q_...  ← POST, query string
 *   People search    : POST /mixed_people/api_search?...   ← api_search NOT search
 *   People enrich    : POST /people/match?id=...           ← query string NOT body
 *
 * PHONE NUMBERS — REALITY CHECK:
 *   • Direct dial (corporate/office): returned synchronously, no extra credits
 *   • Personal mobile: 8 credits each + requires async webhook — NOT used here
 *   • Free plan: 5 mobile credits/month total — way too limited for daily use
 *   • We capture direct dial (office) from people/match synchronously.
 *
 * CREDITS (free tier ~100/month):
 *   People search    : FREE
 *   Org enrichment   : 1 credit
 *   Email reveal     : 1 credit
 *   Mobile reveal    : 8 credits (not used — too expensive)
 */

import { getApolloApiKey } from './settingsService'

const BASE = 'https://api.apollo.io/api/v1'

// ─── Query string builder ──────────────────────────────────────────────────────

function buildQS(
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

// ─── Core fetch ────────────────────────────────────────────────────────────────

async function apolloFetch(
  path: string,
  method: 'GET' | 'POST',
  qs?: string,
): Promise<Response> {
  const key = await getApolloApiKey()

  if (!key || key.trim() === '') {
    throw new Error(
      'Apollo API key not configured.\n' +
        '1. Go to developer.apollo.io/#/keys\n' +
        '2. Create key → toggle "Set as master key" ON\n' +
        '3. Add it in Settings → Apollo API Key',
    )
  }

  const url = `${BASE}${path}${qs ? `?${qs}` : ''}`
  console.log(`[Apollo] ${method} ${path}${qs ? ` ?${qs.slice(0, 100)}…` : ''}`)

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      accept: 'application/json',
      'x-api-key': key.trim(),
    },
  })

  console.log(`[Apollo] → ${res.status}`)
  if (res.ok) return res

  let detail = ''
  try {
    const err = await res.clone().json()
    detail = err.message || err.error || JSON.stringify(err)
  } catch {
    detail = await res.clone().text().catch(() => '')
  }

  if (res.status === 401) throw new Error('Apollo 401: Invalid API key — check Settings.')
  if (res.status === 403)
    throw new Error(
      'Apollo 403: Key must be a MASTER key.\n' +
        'Go to developer.apollo.io/#/keys → toggle "Set as master key" ON.',
    )
  if (res.status === 422) throw new Error(`Apollo 422: Invalid request — ${detail}`)
  if (res.status === 429) throw new Error('Apollo 429: Rate limit — wait 60s.')
  throw new Error(`Apollo ${res.status}: ${detail || res.statusText}`)
}

// ─── Types ─────────────────────────────────────────────────────────────────────

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
  phone: string | null
}

export interface ApolloPerson {
  id: string
  name: string
  firstName: string
  lastName: string
  title: string
  linkedinUrl: string | null
  email: string | null
  emailStatus: string | null
  phone: string | null
  orgName: string | null
}

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

// ─── Mappers ───────────────────────────────────────────────────────────────────

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
    phone: o.phone ?? o.sanitized_phone ?? null,
  }
}

function extractPhone(p: any): string | null {
  if (p.phone) return p.phone
  const phones: any[] = p.phone_numbers ?? []
  if (!phones.length) return null
  const directDial = phones.find(ph =>
    ['direct_dial', 'work_direct', 'corporate'].includes(ph.type_cd),
  )
  const mobile = phones.find(ph => ph.type_cd === 'mobile')
  const any = phones[0]
  return (directDial ?? mobile ?? any)?.sanitized_number ?? null
}

// ─── 1. Org enrichment by domain — 1 credit ───────────────────────────────────

export async function enrichOrganizationByDomain(domain: string): Promise<ApolloOrg | null> {
  const clean = domain
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
    .trim()

  if (!clean || clean.length < 4 || !clean.includes('.')) {
    console.warn('[Apollo] Invalid domain:', domain)
    return null
  }

  console.log('[Apollo] Enrich org by domain:', clean)

  try {
    const res = await apolloFetch('/organizations/enrich', 'GET', buildQS({ domain: clean }))
    const data = await res.json()
    if (!data.organization) {
      console.log('[Apollo] Domain not found:', clean)
      return null
    }
    const org = mapOrg(data.organization, clean)
    console.log('[Apollo] Org found:', org.name, '| emp:', org.estimatedNumEmployees)
    return org
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('422') || msg.includes('Invalid request')) {
      console.log('[Apollo] Domain not in DB:', clean)
      return null
    }
    throw err
  }
}

// ─── 2. Org search by name — 1 credit ─────────────────────────────────────────

export async function searchOrganizationByName(companyName: string): Promise<ApolloOrg | null> {
  console.log('[Apollo] Search org by name:', companyName)

  const qs = buildQS({
    q_organization_name: companyName,
    organization_locations: ['Australia'],
    per_page: 5,
    page: 1,
  })

  const res = await apolloFetch('/mixed_companies/search', 'POST', qs)
  const data = await res.json()
  const orgs: any[] = data.organizations ?? []

  if (!orgs.length) return null

  const lc = companyName.toLowerCase()
  const firstWord =
    lc
      .replace(/[^a-z0-9\s]/g, '')
      .split(' ')
      .find(w => w.length > 3) ?? ''

  const exact = orgs.find(o => o.name?.toLowerCase() === lc)
  const wordMatch = firstWord
    ? orgs.find(o => o.name?.toLowerCase().includes(firstWord))
    : null
  const best = exact ?? wordMatch ?? orgs[0]

  console.log('[Apollo] Best org:', best.name, '| emp:', best.estimated_num_employees)
  return mapOrg(best)
}

// ─── 3. People search — FREE, no credits ──────────────────────────────────────

export async function searchPeopleByTitles(params: {
  companyName: string
  domain?: string | null
  organizationId?: string | null
  titles: string[]
  seniorities?: string[]
}): Promise<ApolloPerson[]> {
  console.log('[Apollo] People search:', params.companyName, '|', params.titles.slice(0, 2))

  const qsParams: Record<string, string | string[] | number> = {
    person_titles: params.titles,
    organization_locations: ['Australia'],
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

  if (params.seniorities?.length) {
    qsParams['person_seniorities'] = params.seniorities
  }

  const res = await apolloFetch('/mixed_people/api_search', 'POST', buildQS(qsParams))
  const data = await res.json()
  const people: any[] = data.people ?? []

  console.log('[Apollo] Found', people.length, 'people')

  return people.map(p => ({
    id: String(p.id ?? ''),
    name: String(p.name ?? `${p.first_name ?? ''} ${p.last_name ?? ''}`).trim(),
    firstName: String(p.first_name ?? ''),
    lastName: String(p.last_name ?? ''),
    title: String(p.title ?? ''),
    linkedinUrl: (p.linkedin_url as string) ?? null,
    email: null,
    emailStatus: null,
    phone: null,
    orgName: p.organization?.name ?? params.companyName,
  }))
}

// ─── 4. Enrich person by ID — 1 credit (email + direct dial) ──────────────────

export async function enrichPersonById(personId: string): Promise<{
  email: string | null
  emailStatus: string | null
  linkedinUrl: string | null
  name: string | null
  title: string | null
  phone: string | null
} | null> {
  console.log('[Apollo] Enrich by ID:', personId)

  try {
    const qs = buildQS({
      id: personId,
      reveal_personal_emails: false,
      reveal_phone_number: true,
    })

    const res = await apolloFetch('/people/match', 'POST', qs)
    const data = await res.json()
    const p = data.person

    if (!p) {
      console.log('[Apollo] No person returned for ID:', personId)
      return null
    }

    const phone = extractPhone(p)
    console.log('[Apollo] Result: email=', !!p.email, '| phone=', !!phone)

    return {
      email: p.email ?? null,
      emailStatus: p.email_status ?? null,
      linkedinUrl: p.linkedin_url ?? null,
      name: p.name ?? null,
      title: p.title ?? null,
      phone,
    }
  } catch (err) {
    console.error('[Apollo] Enrich by ID failed:', err instanceof Error ? err.message : err)
    return null
  }
}

// ─── 5. Enrich by name + domain — 1 credit (fallback) ─────────────────────────

export async function enrichPersonByNameDomain(
  firstName: string,
  lastName: string,
  domain: string,
  organizationName?: string,
): Promise<{
  email: string | null
  emailStatus: string | null
  linkedinUrl: string | null
  name: string | null
  title: string | null
  phone: string | null
} | null> {
  console.log('[Apollo] Enrich name+domain:', firstName, lastName, '@', domain)

  try {
    const qs = buildQS({
      first_name: firstName,
      last_name: lastName,
      domain,
      ...(organizationName ? { organization_name: organizationName } : {}),
      reveal_personal_emails: false,
      reveal_phone_number: true,
    })

    const res = await apolloFetch('/people/match', 'POST', qs)
    const data = await res.json()
    const p = data.person
    if (!p) return null

    return {
      email: p.email ?? null,
      emailStatus: p.email_status ?? null,
      linkedinUrl: p.linkedin_url ?? null,
      name: p.name ?? null,
      title: p.title ?? null,
      phone: extractPhone(p),
    }
  } catch (err) {
    console.error('[Apollo] Name+domain enrich failed:', err instanceof Error ? err.message : err)
    return null
  }
}

// ─── Legacy compatibility ──────────────────────────────────────────────────────

export async function searchPeople(query: {
  name?: string
  company?: string
  title?: string
  location?: string
}): Promise<ApolloContact[]> {
  const qsParams: Record<string, string | string[] | number> = { per_page: 5, page: 1 }
  if (query.company)  qsParams['q_organization_name']    = query.company
  if (query.name)     qsParams['q_keywords']             = query.name
  if (query.title)    qsParams['person_titles']          = [query.title]
  if (query.location) qsParams['organization_locations'] = [query.location]

  const res = await apolloFetch('/mixed_people/api_search', 'POST', buildQS(qsParams))
  const data = await res.json()

  return (data.people ?? []).map((p: any) => ({
    id: p.id,
    firstName: p.first_name ?? '',
    lastName: p.last_name ?? '',
    name: p.name ?? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
    title: p.title ?? '',
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
    const qs = buildQS({ email, reveal_personal_emails: false, reveal_phone_number: false })
    const res = await apolloFetch('/people/match', 'POST', qs)
    const data = await res.json()
    const p = data.person
    if (!p) return null

    return {
      id: p.id,
      firstName: p.first_name ?? '',
      lastName: p.last_name ?? '',
      name: p.name ?? '',
      title: p.title ?? '',
      email: p.email ?? null,
      phone: p.phone ?? null,
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