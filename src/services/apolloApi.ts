// src/services/apolloApi.ts
// Apollo.io contact enrichment — free tier: 10k credits, 5 phones/month

import type { ApolloContact, ApolloEnrichedContact } from '@/types'
import { getApolloApiKey } from './settingsService'

const APOLLO_BASE = 'https://api.apollo.io/v1'

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
    phone: (p.phone_numbers as Array<{ sanitized_number: string }>)?.[0]
      ?.sanitized_number ?? null,
    linkedinUrl: (p.linkedin_url as string) ?? null,
    organization: p.organization
      ? {
          id: (p.organization as Record<string, unknown>).id as string,
          name: (p.organization as Record<string, unknown>).name as string,
          websiteUrl:
            ((p.organization as Record<string, unknown>).website_url as string) ?? null,
          linkedinUrl:
            ((p.organization as Record<string, unknown>).linkedin_url as string) ?? null,
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