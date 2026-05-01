// src/services/apolloApi.ts
/**
 * APOLLO.IO API SERVICE — CORRECTED VERSION
 * ─────────────────────────────────────────────────────────────────────────────
 * CRITICAL FIXES:
 *   1. Correct endpoint: /mixed_people/search (NOT /mixed_people/api_search)
 *   2. Correct field names in request bodies
 *   3. Proper error handling with detailed messages
 *   4. API key validation before making requests
 *
 * SETUP:
 *   1. Go to: developer.apollo.io/#/keys
 *   2. Create new key → Toggle "Set as master key" ON
 *   3. Add to Settings page in your app (stored in Supabase)
 *
 * Base URL: https://api.apollo.io/v1 (NOT /api/v1)
 * Auth: Header x-api-key
 *
 * CREDITS (free tier):
 *   - Organization enrich: 1 credit
 *   - Company search: 1 credit  
 *   - People search: FREE (no email returned)
 *   - People match (email reveal): 1 credit
 */

import { getApolloApiKey } from './settingsService'

const BASE = 'https://api.apollo.io/v1'

// ─── Shared fetch with proper error handling ──────────────────────────────────

async function apolloFetch(path: string, init: RequestInit): Promise<Response> {
  const key = await getApolloApiKey()

  if (!key || key.trim() === '') {
    throw new Error(
      'Apollo API key not configured.\n\n' +
      'Setup steps:\n' +
      '1. Go to developer.apollo.io/#/keys\n' +
      '2. Click "Create new key"\n' +
      '3. IMPORTANT: Toggle "Set as master key" ON\n' +
      '4. Copy the key and add it in Settings page\n' +
      '5. Refresh this page'
    )
  }

  console.log(`[Apollo] ${init.method} ${path}`)

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'x-api-key': key.trim(),
      ...(init.headers as Record<string, string> | undefined ?? {}),
    },
  })

  // Log response for debugging
  console.log(`[Apollo] Response ${res.status} for ${path}`)

  if (res.ok) return res

  // Try to get error message from response
  let errorDetail = ''
  try {
    const errorData = await res.clone().json()
    errorDetail = errorData.message || errorData.error || JSON.stringify(errorData)
  } catch {
    errorDetail = await res.clone().text().catch(() => '')
  }

  // Specific error messages
  if (res.status === 401) {
    throw new Error(
      'Apollo 401: Invalid API key.\n\n' +
      'Your API key is incorrect or expired.\n' +
      'Please check your Settings page and update the Apollo API key.'
    )
  }
  
  if (res.status === 403) {
    throw new Error(
      'Apollo 403: Permission denied.\n\n' +
      'Your API key must be a MASTER key.\n\n' +
      'Fix:\n' +
      '1. Go to developer.apollo.io/#/keys\n' +
      '2. Find your key or create a new one\n' +
      '3. Toggle "Set as master key" ON\n' +
      '4. Update the key in Settings page'
    )
  }
  
  if (res.status === 422) {
    throw new Error(`Apollo 422: Invalid request - ${errorDetail}`)
  }
  
  if (res.status === 429) {
    throw new Error('Apollo 429: Rate limit exceeded. Please wait 60 seconds and try again.')
  }

  throw new Error(`Apollo ${res.status}: ${errorDetail || res.statusText}`)
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

// ─── Helper to map organization data ───────────────────────────────────────────

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
  }
}

// ─── 1. Organization enrichment by domain (1 credit) ───────────────────────────

export async function enrichOrganizationByDomain(domain: string): Promise<ApolloOrg | null> {
  // Clean domain
  const clean = domain
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
    .trim()

  if (!clean || clean.length < 4) {
    console.warn('[Apollo] Invalid domain:', domain)
    return null
  }

  console.log('[Apollo] Enriching organization by domain:', clean)

  try {
    const res = await apolloFetch(`/organizations/enrich?domain=${encodeURIComponent(clean)}`, {
      method: 'GET',
    })
    
    const data = await res.json()
    console.log('[Apollo] Organization enrich response:', data)
    
    if (!data.organization) {
      console.log('[Apollo] No organization found for domain:', clean)
      return null
    }
    
    return mapOrg(data.organization, clean)
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    
    // 422 means domain not found in Apollo - this is not an error, just no data
    if (errorMsg.includes('422') || errorMsg.includes('Invalid request')) {
      console.log('[Apollo] Domain not in Apollo database:', clean)
      return null
    }
    
    // Real errors should be thrown
    console.error('[Apollo] Organization enrich error:', errorMsg)
    throw err
  }
}

// ─── 2. Organization search by name (1 credit) ─────────────────────────────────

export async function searchOrganizationByName(companyName: string): Promise<ApolloOrg | null> {
  console.log('[Apollo] Searching organization by name:', companyName)

  const requestBody = {
    organization_name: companyName, // CORRECTED: was q_organization_name
    organization_locations: ['Australia'],
    per_page: 5,
    page: 1,
  }

  console.log('[Apollo] Company search request:', requestBody)

  const res = await apolloFetch('/mixed_companies/search', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  })

  const data = await res.json()
  console.log('[Apollo] Company search response:', data)

  const orgs: any[] = data.organizations ?? []
  
  if (!orgs.length) {
    console.log('[Apollo] No organizations found for:', companyName)
    return null
  }

  // Find best match - prefer exact name match or name containing first significant word
  const firstWord = companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(' ')
    .find(w => w.length > 3) ?? ''

  let best = orgs[0]
  
  if (firstWord) {
    const exactMatch = orgs.find(o => 
      o.name?.toLowerCase() === companyName.toLowerCase()
    )
    if (exactMatch) {
      best = exactMatch
    } else {
      const wordMatch = orgs.find(o => 
        o.name?.toLowerCase().includes(firstWord)
      )
      if (wordMatch) best = wordMatch
    }
  }

  console.log('[Apollo] Selected organization:', best.name)
  return mapOrg(best, best.primary_domain ?? null)
}

// ─── 3. People search by titles (FREE - no credits) ────────────────────────────
// CRITICAL FIX: Endpoint is /mixed_people/search NOT /mixed_people/api_search

export async function searchPeopleByTitles(params: {
  companyName: string
  domain?: string | null
  organizationId?: string | null
  titles: string[]
  seniorities?: string[]
}): Promise<ApolloPerson[]> {
  console.log('[Apollo] Searching people with params:', params)

  const requestBody: any = {
    person_titles: params.titles,
    organization_locations: ['Australia'],
    per_page: 10,
    page: 1,
  }

  // CORRECTED: Use proper field names
  if (params.domain) {
    requestBody.organization_domains = [params.domain] // CORRECTED: was q_organization_domains_list
  } else if (params.organizationId) {
    requestBody.organization_ids = [params.organizationId]
  } else {
    requestBody.organization_name = params.companyName // CORRECTED: was q_organization_name
  }

  if (params.seniorities?.length) {
    requestBody.person_seniorities = params.seniorities
  }

  console.log('[Apollo] People search request body:', requestBody)

  // CRITICAL FIX: Correct endpoint is /mixed_people/search
  const res = await apolloFetch('/mixed_people/search', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  })

  const data = await res.json()
  console.log('[Apollo] People search response:', {
    total: data.people?.length ?? 0,
    pagination: data.pagination,
  })

  const people: any[] = data.people ?? []

  const mapped = people.map(p => ({
    id: String(p.id ?? ''),
    name: String(p.name ?? `${p.first_name ?? ''} ${p.last_name ?? ''}`).trim(),
    firstName: String(p.first_name ?? ''),
    lastName: String(p.last_name ?? ''),
    title: String(p.title ?? ''),
    linkedinUrl: (p.linkedin_url as string) ?? null,
    email: null, // Never returned by search endpoint
    emailStatus: null,
    orgName: p.organization?.name ?? params.companyName,
  }))

  console.log('[Apollo] Found people:', mapped.map(p => `${p.name} - ${p.title}`))
  return mapped
}

// ─── 4. Enrich person by ID to get email (1 credit) ───────────────────────────

export async function enrichPersonById(personId: string): Promise<{
  email: string | null
  emailStatus: string | null
  linkedinUrl: string | null
  name: string | null
  title: string | null
} | null> {
  console.log('[Apollo] Enriching person by ID:', personId)

  try {
    const res = await apolloFetch('/people/match', {
      method: 'POST',
      body: JSON.stringify({
        id: personId,
        reveal_personal_emails: false,
        reveal_phone_number: false,
      }),
    })
    
    const data = await res.json()
    console.log('[Apollo] Person match response:', {
      hasEmail: !!data.person?.email,
      emailStatus: data.person?.email_status,
    })
    
    const p = data.person
    if (!p) {
      console.log('[Apollo] No person data returned')
      return null
    }

    return {
      email: p.email ?? null,
      emailStatus: p.email_status ?? null,
      linkedinUrl: p.linkedin_url ?? null,
      name: p.name ?? null,
      title: p.title ?? null,
    }
  } catch (err) {
    console.error('[Apollo] Person enrich error:', err instanceof Error ? err.message : err)
    return null
  }
}

// ─── Legacy compatibility functions ────────────────────────────────────────────

export async function searchPeople(query: {
  name?: string
  company?: string
  title?: string
  location?: string
}): Promise<ApolloContact[]> {
  console.log('[Apollo] Legacy searchPeople called:', query)

  const requestBody: any = {
    per_page: 5,
    page: 1,
  }

  // CORRECTED field names
  if (query.company) requestBody.organization_name = query.company
  if (query.name) requestBody.q_keywords = query.name
  if (query.title) requestBody.person_titles = [query.title]
  if (query.location) requestBody.organization_locations = [query.location]

  const res = await apolloFetch('/mixed_people/search', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  })

  const data = await res.json()
  const people: any[] = data.people ?? []

  return people.map(p => ({
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    name: p.name ?? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
    title: p.title,
    email: null,
    phone: null,
    linkedinUrl: p.linkedin_url ?? null,
    organization: p.organization ? {
      id: p.organization.id,
      name: p.organization.name,
      websiteUrl: p.organization.website_url ?? null,
      linkedinUrl: p.organization.linkedin_url ?? null,
      estimatedNumEmployees: p.organization.estimated_num_employees ?? null,
    } : null,
  }))
}

export async function enrichPerson(email: string): Promise<ApolloEnrichedContact | null> {
  console.log('[Apollo] Legacy enrichPerson called:', email)

  try {
    const res = await apolloFetch('/people/match', {
      method: 'POST',
      body: JSON.stringify({
        email,
        reveal_personal_emails: false,
        reveal_phone_number: false,
      }),
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
      organization: p.organization ? {
        id: p.organization.id,
        name: p.organization.name,
        websiteUrl: p.organization.website_url ?? null,
        linkedinUrl: p.organization.linkedin_url ?? null,
        estimatedNumEmployees: p.organization.estimated_num_employees ?? null,
      } : null,
    }
  } catch {
    return null
  }
}