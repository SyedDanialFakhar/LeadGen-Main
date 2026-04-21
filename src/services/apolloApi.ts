// src/services/apolloApi.ts
// Apollo.io — free tier: 50 export credits/month, unlimited people search

import type { ApolloContact, ApolloEnrichedContact } from '@/types'
import { getApolloApiKey } from './settingsService'

const APOLLO_BASE = 'https://api.apollo.io/v1'

// ─── New Types ─────────────────────────────────────────────────────────────────

export interface ApolloOrganization {
  id: string
  name: string
  websiteUrl: string | null
  linkedinUrl: string | null
  estimatedNumEmployees: number | null
  industry: string | null
  city: string | null
  country: string | null
  phone: string | null
  domain: string | null
}

// ─── Organization Search ───────────────────────────────────────────────────────
// Finds a company on Apollo — returns employee count, LinkedIn URL, domain
// Does NOT use export credits

export async function searchOrganization(
  companyName: string,
  domain?: string | null
): Promise<ApolloOrganization | null> {
  const apiKey = await getApolloApiKey()
  if (!apiKey) throw new Error('Apollo API key not configured. Please add it in Settings.')

  const body: Record<string, unknown> = {
    q_organization_name: companyName,
    per_page: 5,
    page: 1,
    organization_locations: ['Australia'],
  }
  if (domain) body.q_organization_domains = [domain]

  const response = await fetch(`${APOLLO_BASE}/mixed_companies/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    if (response.status === 429) throw new Error('Apollo rate limit reached — try again in a moment')
    if (response.status === 401) throw new Error('Invalid Apollo API key — check your Settings')
    throw new Error(`Apollo organization search failed: ${response.statusText}`)
  }

  const data = await response.json()
  const orgs: any[] = data.organizations ?? []
  if (!orgs.length) return null

  // Pick best match: prefer ones with a name that contains first word of query
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
    phone: best.sanitized_phone ?? best.phone ?? null,
    domain: best.primary_domain ?? null,
  }
}

// ─── People Search by Titles ───────────────────────────────────────────────────
// Searches for people with specific titles at a company.
// Does NOT use export credits — emails may or may not be pre-populated.

export async function searchPeopleByTitles(params: {
  companyName: string
  organizationId?: string | null
  titles: string[]
  domain?: string | null
}): Promise<ApolloContact[]> {
  const apiKey = await getApolloApiKey()
  if (!apiKey) throw new Error('Apollo API key not configured. Please add it in Settings.')

  const body: Record<string, unknown> = {
    q_organization_name: params.companyName,
    person_titles: params.titles,
    per_page: 10,
    page: 1,
  }

  if (params.organizationId) body.organization_ids = [params.organizationId]
  if (params.domain) body.q_organization_domains = [params.domain]

  const response = await fetch(`${APOLLO_BASE}/mixed_people/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    if (response.status === 429) throw new Error('Apollo rate limit reached — try again in a moment')
    throw new Error(`Apollo people search failed: ${response.statusText}`)
  }

  const data = await response.json()
  const people: any[] = data.people ?? []

  return people.map(p => ({
    id: p.id as string,
    firstName: p.first_name as string,
    lastName: p.last_name as string,
    name: p.name as string,
    title: p.title as string,
    // Apollo returns emails in search results on free tier for verified contacts
    email: (p.email as string) ?? null,
    // Phone NOT available on free tier
    phone: null,
    linkedinUrl: (p.linkedin_url as string) ?? null,
    organization: p.organization
      ? {
          id: (p.organization as any).id,
          name: (p.organization as any).name,
          websiteUrl: (p.organization as any).website_url ?? null,
          linkedinUrl: (p.organization as any).linkedin_url ?? null,
          estimatedNumEmployees:
            (p.organization as any).estimated_num_employees ?? null,
        }
      : null,
  }))
}

// ─── Email Reveal ──────────────────────────────────────────────────────────────
// Reveals the email for a specific person by Apollo ID.
// ⚠️ Uses 1 export credit per successful reveal (50/month on free tier)

export async function revealPersonEmail(personId: string): Promise<string | null> {
  const apiKey = await getApolloApiKey()
  if (!apiKey) throw new Error('Apollo API key not configured')

  const response = await fetch(`${APOLLO_BASE}/people/match`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify({
      id: personId,
      reveal_personal_emails: false, // true would use extra credits
    }),
  })

  if (!response.ok) return null

  const data = await response.json()
  return (data.person?.email as string) ?? null
}

// ─── Existing functions (preserved) ───────────────────────────────────────────

export async function searchPeople(query: {
  name?: string
  company?: string
  title?: string
  location?: string
}): Promise<ApolloContact[]> {
  const apiKey = await getApolloApiKey()
  if (!apiKey) throw new Error('Apollo API key not configured. Please add it in Settings.')

  const response = await fetch(`${APOLLO_BASE}/mixed_people/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify({
      q_organization_name: query.company,
      q_keywords: query.name,
      person_titles: query.title ? [query.title] : undefined,
      person_locations: query.location ? [query.location] : undefined,
      page: 1,
      per_page: 5,
    }),
  })

  if (!response.ok) {
    if (response.status === 429) throw new Error('Apollo rate limit reached')
    throw new Error(`Apollo API error: ${response.statusText}`)
  }

  const data = await response.json()
  const people = data.people ?? []

  return people.map((p: Record<string, unknown>) => ({
    id: p.id as string,
    firstName: p.first_name as string,
    lastName: p.last_name as string,
    name: p.name as string,
    title: p.title as string,
    email: (p.email as string) ?? null,
    phone:
      (p.phone_numbers as Array<{ sanitized_number: string }>)?.[0]
        ?.sanitized_number ?? null,
    linkedinUrl: (p.linkedin_url as string) ?? null,
    organization: p.organization
      ? {
          id: (p.organization as Record<string, unknown>).id as string,
          name: (p.organization as Record<string, unknown>).name as string,
          websiteUrl:
            ((p.organization as Record<string, unknown>).website_url as string) ??
            null,
          linkedinUrl:
            ((p.organization as Record<string, unknown>).linkedin_url as string) ??
            null,
          estimatedNumEmployees:
            ((p.organization as Record<string, unknown>)
              .estimated_num_employees as number) ?? null,
        }
      : null,
  }))
}

export async function enrichPerson(
  email: string
): Promise<ApolloEnrichedContact | null> {
  const apiKey = await getApolloApiKey()
  if (!apiKey) throw new Error('Apollo API key not configured')

  const response = await fetch(`${APOLLO_BASE}/people/match`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify({ email }),
  })

  if (!response.ok) return null

  const data = await response.json()
  const p = data.person
  if (!p) return null

  return {
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    name: p.name,
    title: p.title,
    email: p.email ?? null,
    phone: p.phone_numbers?.[0]?.sanitized_number ?? null,
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
          estimatedNumEmployees:
            p.organization.estimated_num_employees ?? null,
        }
      : null,
  }
}