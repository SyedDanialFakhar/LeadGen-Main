/**
 * COMPANY RESOLVER
 * ══════════════════════════════════════════════════════════════════════════════
 * Dedicated layer for resolving a raw lead into a fully normalised company.
 * Separated from the main pipeline so it can be tested and improved independently.
 *
 * RESOLUTION STRATEGY (in priority order):
 *   1. Skip enrichment if we already have domain + count + linkedinUrl (save credit)
 *   2. Domain enrichment  — GET /organizations/enrich?domain= (1 credit, most accurate)
 *   3. Name search        — POST /mixed_companies/search (1 credit, fallback)
 *   4. Fallback to Seek   — use companyEmployeeCount from lead data (0 credits)
 *
 * NOTE ON SEEK DATA:
 *   Seek employee counts are frequently inaccurate. The LinkedIn-verified count
 *   from Apollo is used as the source of truth for size-gating decisions.
 *   The canSkip optimisation (saving 1 credit) only applies when we already have
 *   all three: domain + a count + linkedinUrl. In that case we trust the existing
 *   data and skip the Apollo call.
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
  phone: string | null        // Corporate/HQ phone from Apollo org enrichment (free)
  annualRevenue: number | null
  creditsUsed: number
  creditsSaved: number
  source: 'domain_enrichment' | 'name_search' | 'existing_data' | 'seek_fallback'
}

// ─── Exported domain + count helpers (used by contactFinderService too) ────────

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
  // Range: "51-200", "201-500", "1,001-5,000"
  const range = str.match(/(\d[\d,]*)\s*[-–]\s*(\d[\d,]*)/)
  if (range) return parseInt(range[2].replace(/,/g, ''))
  // Plus: "500+", "1000+"
  const plus = str.match(/(\d[\d,]*)\s*\+/)
  if (plus) return parseInt(plus[1].replace(/,/g, ''))
  // Plain number
  const plain = str.replace(/[^0-9]/g, '')
  return plain ? parseInt(plain) : null
}

// ─── Main resolver ─────────────────────────────────────────────────────────────

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
    phone: null,
    annualRevenue: null,
    creditsUsed: 0,
    creditsSaved: 0,
    source: 'seek_fallback',
  }

  // ── SKIP enrichment if we already have everything needed ──────────────────
  // We need: domain (for people search + Hunter), count (for size gate),
  // linkedinUrl (for UI display). If all three exist, save 1 credit.
  //
  // NOTE: We intentionally do NOT skip when Seek says the company is large.
  // That check is the caller's responsibility (contactFinderService Phase 2)
  // and only applies to the Apollo/LinkedIn-verified count, never Seek alone.
  const canSkip = existingDomain && seekCount !== null && !!lead.companyLinkedinUrl
  if (canSkip) {
    console.log('[CR] Skipping org enrichment — already have domain + count + LinkedIn')
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

  // ── Attempt 1: Domain enrichment (most accurate LinkedIn headcount) ────────
  if (existingDomain) {
    console.log('[CR] → Domain enrichment:', existingDomain)
    try {
      const org = await enrichOrganizationByDomain(existingDomain)
      if (org) {
        return { company: applyOrg(base, org, existingDomain, 'domain_enrichment'), seekCount }
      }
    } catch (err) {
      console.error('[CR] Domain enrichment failed:', err instanceof Error ? err.message : err)
    }
  }

  // ── Attempt 2: Name search ─────────────────────────────────────────────────
  // maxEmployees is set slightly above MAX_COMPANY_SIZE (1500) to account for
  // data lag between Apollo's index and LinkedIn's live headcount.
  // We use 2000 as a soft pre-filter — if Apollo's own DB says >2000, it's very
  // unlikely the real LinkedIn count will be ≤1500.
  console.log('[CR] → Name search:', lead.companyName)
  try {
    const org = await searchOrganizationByName(lead.companyName, {
      maxEmployees: 2000,
    })
    if (org) {
      const domain = org.domain ?? existingDomain
      return { company: applyOrg({ ...base, domain }, org, domain, 'name_search'), seekCount }
    }
  } catch (err) {
    console.error('[CR] Name search failed:', err instanceof Error ? err.message : err)
  }

  // ── Fallback: Seek data ────────────────────────────────────────────────────
  // Neither Apollo endpoint returned a result. Fall back to whatever Seek had.
  // The size gate in contactFinderService will still apply using this count,
  // but it won't be as reliable as a LinkedIn-verified number.
  console.log('[CR] Using Seek data as fallback for:', lead.companyName)
  return {
    company: {
      ...base,
      estimatedNumEmployees: seekCount,
      source: 'seek_fallback',
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
    phone: org.phone ?? null,                  // Corporate HQ phone — free from org enrichment
    annualRevenue: org.annualRevenue ?? null,
    creditsUsed: base.creditsUsed + 1,
    source,
  }
}