/**
 * COMPANY RESOLVER — Production Layer
 * ─────────────────────────────────────────────────────────────────────────────
 * Resolves a raw lead into a fully normalised company profile with:
 *   - Verified Apollo org ID
 *   - LinkedIn employee count (more accurate than Seek)
 *   - Company domain (needed for Hunter + Apollo name+domain match)
 *   - Industry, LinkedIn URL, website
 *
 * RESOLUTION STRATEGY (in order of accuracy):
 *   1. Domain enrichment  — if we already have website (most accurate, 1 credit)
 *   2. Name search        — if no domain (1 credit)
 *   3. Skip enrichment    — if we already have domain + count + linkedinUrl (saves credit)
 *
 * DOMAIN EXTRACTION FALLBACK CHAIN:
 *   lead.companyWebsite → org.websiteUrl → guess from ABN/name (last resort)
 */

import {
    enrichOrganizationByDomain,
    searchOrganizationByName,
    type ApolloOrg,
  } from './apolloApi'
  import type { Lead } from '@/types'
  
  export interface ResolvedCompany {
    apolloOrgId: string | null
    companyName: string
    domain: string | null
    websiteUrl: string | null
    linkedinUrl: string | null
    estimatedNumEmployees: number | null
    industry: string | null
    creditsUsed: number
    creditsSaved: number
    source: 'domain_enrichment' | 'name_search' | 'existing_data' | 'fallback'
  }
  
  // ─── Domain helpers ─────────────────────────────────────────────────────────────
  
  export function extractDomain(url: string | null | undefined): string | null {
    if (!url?.trim()) return null
    try {
      const urlStr = url.startsWith('http') ? url : `https://${url}`
      const hostname = new URL(urlStr).hostname
      const domain = hostname.replace(/^www\./, '').toLowerCase().trim()
      return domain.length >= 4 && domain.includes('.') ? domain : null
    } catch {
      return null
    }
  }
  
  export function parseEmpCount(str: string | null | undefined): number | null {
    if (!str?.trim()) return null
    const range = str.match(/(\d[\d,]*)\s*[-–]\s*(\d[\d,]*)/)
    if (range) return parseInt(range[2].replace(/,/g, ''))
    const plus = str.match(/(\d[\d,]*)\s*\+/)
    if (plus) return parseInt(plus[1].replace(/,/g, ''))
    const plain = str.replace(/[^0-9]/g, '')
    return plain ? parseInt(plain) : null
  }
  
  // ─── Main resolver ──────────────────────────────────────────────────────────────
  
  export async function resolveCompany(lead: Lead): Promise<{
    company: ResolvedCompany
    seekCount: number | null
  }> {
    const existingDomain = extractDomain(lead.companyWebsite)
    const seekCount = parseEmpCount(lead.companyEmployeeCount)
  
    const base: ResolvedCompany = {
      apolloOrgId: null,
      companyName: lead.companyName,
      domain: existingDomain,
      websiteUrl: lead.companyWebsite ?? null,
      linkedinUrl: lead.companyLinkedinUrl ?? null,
      estimatedNumEmployees: null,
      industry: lead.companyIndustry ?? null,
      creditsUsed: 0,
      creditsSaved: 0,
      source: 'fallback',
    }
  
    // Skip org enrichment if we already have all three: domain + count + linkedinUrl
    const canSkip = existingDomain && seekCount !== null && lead.companyLinkedinUrl
    if (canSkip) {
      console.log('[CR] Skipping org enrichment — already have domain+count+LinkedIn')
      return {
        company: {
          ...base,
          estimatedNumEmployees: seekCount,
          creditsSaved: 1,
          source: 'existing_data',
        },
        seekCount,
      }
    }
  
    // Attempt 1: Domain enrichment (most accurate — matches LinkedIn headcount)
    if (existingDomain) {
      console.log('[CR] Trying domain enrichment:', existingDomain)
      try {
        const org = await enrichOrganizationByDomain(existingDomain)
        if (org) {
          return {
            company: applyOrg(base, org, existingDomain, 'domain_enrichment'),
            seekCount,
          }
        }
      } catch (err) {
        console.error('[CR] Domain enrichment failed:', err instanceof Error ? err.message : err)
      }
    }
  
    // Attempt 2: Name search
    console.log('[CR] Trying name search:', lead.companyName)
    try {
      const org = await searchOrganizationByName(lead.companyName)
      if (org) {
        const domain = org.domain ?? existingDomain
        return {
          company: applyOrg({ ...base, domain }, org, domain, 'name_search'),
          seekCount,
        }
      }
    } catch (err) {
      console.error('[CR] Name search failed:', err instanceof Error ? err.message : err)
    }
  
    // Fallback: use Seek data as-is
    console.log('[CR] Using Seek data as fallback for:', lead.companyName)
    return {
      company: {
        ...base,
        estimatedNumEmployees: seekCount,
        source: 'fallback',
      },
      seekCount,
    }
  }
  
  function applyOrg(
    base: ResolvedCompany,
    org: ApolloOrg,
    domain: string | null,
    source: ResolvedCompany['source'],
  ): ResolvedCompany {
    return {
      ...base,
      apolloOrgId: org.id || null,
      domain: org.domain ?? domain,
      websiteUrl: org.websiteUrl ?? base.websiteUrl,
      linkedinUrl: org.linkedinUrl ?? base.linkedinUrl,
      estimatedNumEmployees: org.estimatedNumEmployees,
      industry: org.industry ?? base.industry,
      creditsUsed: base.creditsUsed + 1,
      source,
    }
  }