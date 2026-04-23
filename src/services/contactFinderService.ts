// src/services/contactFinderService.ts
/**
 * CONTACT FINDER SERVICE
 * ──────────────────────────────────────────────────────────────────────────
 * Full automated flow per lead:
 *
 *  Phase 1 — Company lookup (Apollo org enrichment by domain, or by name)
 *    → Gets REAL employee count from LinkedIn via Apollo
 *    → Gets company LinkedIn URL + website
 *    → Credits: 1 per company (org enrichment)
 *
 *  Phase 2 — Size gate
 *    → Skip if > 500 employees
 *    → Free (no API call)
 *
 *  Phase 3 — Find the right person (Apollo people search — FREE)
 *    → Tries title groups in priority order by company size
 *    → Credits: 0 (people search is free)
 *
 *  Phase 4 — Get their email
 *    → Try Apollo enrichment by ID (1 credit)
 *    → Fallback: Hunter.io by name + domain
 *    → Credits: 1 (Apollo) or from Hunter quota
 *
 * Title priority by size:
 *  ≤ 30    CEO / Director / Founder / MD / Owner
 *  ≤ 100   General Manager → HR Manager / P&C
 *  ≤ 300   HR Manager / P&C Manager / Talent Acquisition → GM
 *  ≤ 500   Head of People / Talent Acquisition Lead → HR Manager
 */

import {
  enrichOrganizationByDomain,
  searchOrganizationByName,
  searchPeopleByTitles,
  enrichPersonById,
} from './apolloApi'
import { findEmail } from './hunterApi'
import type { Lead } from '@/types'

export const MAX_COMPANY_SIZE = 500

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ContactFinderPhase =
  | 'idle'
  | 'finding_company'
  | 'checking_size'
  | 'finding_contact'
  | 'finding_email'
  | 'done'
  | 'skipped'
  | 'error'

export interface ContactFinderResult {
  leadId: string
  companyName: string
  phase: ContactFinderPhase

  // Company data
  apolloOrgId: string | null
  employeeCount: number | null
  companyLinkedinUrl: string | null
  companyWebsite: string | null
  companyDomain: string | null
  industry: string | null

  // Contact found
  contactName: string | null
  contactTitle: string | null
  contactLinkedinUrl: string | null
  contactEmail: string | null
  emailStatus: string | null

  // Meta
  skipReason: string | null
  error: string | null
  emailSource: 'apollo' | 'hunter' | null
  creditsUsed: number
}

export interface ContactDecision {
  leadId: string
  accept: boolean
  contactName: string | null
  contactTitle: string | null
  contactLinkedinUrl: string | null
  contactEmail: string | null
  employeeCount: number | null
  companyLinkedinUrl: string | null
  companyWebsite: string | null
  industry: string | null
}

// ─── Title priority groups by company size ─────────────────────────────────────

export interface TitleGroup {
  label: string
  titles: string[]
  seniorities?: string[]
}

export function getTitleGroupsBySize(employeeCount: number | null): TitleGroup[] {
  const count = employeeCount ?? 0

  // Very small — owner/founder/CEO handles hiring directly
  if (count === 0 || count <= 30) {
    return [
      {
        label: 'Executive',
        titles: [
          'CEO', 'Chief Executive Officer', 'Managing Director', 'Director',
          'Founder', 'Co-Founder', 'Owner', 'Principal', 'Partner',
        ],
        seniorities: ['owner', 'founder', 'c_suite', 'partner'],
      },
      {
        label: 'Operations',
        titles: ['General Manager', 'Operations Manager', 'Country Manager'],
        seniorities: ['director', 'manager'],
      },
    ]
  }

  // Small-medium — GM or HR Manager
  if (count <= 100) {
    return [
      {
        label: 'General Management',
        titles: ['General Manager', 'Country Manager', 'Business Manager'],
        seniorities: ['director', 'manager'],
      },
      {
        label: 'HR / People & Culture',
        titles: [
          'HR Manager', 'Human Resources Manager',
          'People and Culture Manager', 'People & Culture Manager',
          'Head of People', 'Head of People and Culture',
          'Talent Acquisition Manager', 'HR Business Partner',
          'Recruitment Manager',
        ],
        seniorities: ['head', 'manager'],
      },
      {
        label: 'Executive',
        titles: ['Managing Director', 'Director', 'Operations Manager'],
        seniorities: ['director', 'c_suite'],
      },
    ]
  }

  // Medium — HR leads the process
  if (count <= 300) {
    return [
      {
        label: 'HR / People & Culture',
        titles: [
          'HR Manager', 'Human Resources Manager',
          'People and Culture Manager', 'People & Culture Manager',
          'Talent Acquisition Manager', 'Head of People and Culture',
          'Head of People', 'HR Business Partner', 'Recruitment Manager',
        ],
        seniorities: ['head', 'manager'],
      },
      {
        label: 'General Management',
        titles: ['General Manager', 'Country Manager', 'Operations Manager', 'Regional Manager'],
        seniorities: ['director', 'manager'],
      },
      {
        label: 'Executive',
        titles: ['Managing Director', 'Director'],
        seniorities: ['director', 'c_suite'],
      },
    ]
  }

  // 300–500 — Dedicated talent team
  return [
    {
      label: 'Talent / People & Culture',
      titles: [
        'People and Culture Manager', 'People & Culture Manager',
        'Head of People and Culture', 'Head of HR', 'Head of Talent',
        'Talent Acquisition Manager', 'Head of People',
        'HR Director', 'Talent Acquisition Lead', 'Recruitment Manager',
      ],
      seniorities: ['head', 'director', 'manager'],
    },
    {
      label: 'HR',
      titles: ['HR Manager', 'Human Resources Manager', 'HR Business Partner'],
      seniorities: ['manager'],
    },
    {
      label: 'Operations',
      titles: ['General Manager', 'Operations Manager', 'Regional Manager'],
      seniorities: ['manager', 'director'],
    },
  ]
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function extractDomainFromUrl(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`)
      .hostname.replace(/^www\./, '')
      .toLowerCase()
      .trim()
  } catch {
    return ''
  }
}

function parseEmployeeCount(str: string | null | undefined): number | null {
  if (!str) return null
  // "51-200" → 200,  "201-500" → 500,  "1001+" → 1001
  const parts = str.split(/[-–]/)
  if (parts.length === 2) {
    const n = parseInt(parts[1].replace(/\D/g, ''))
    return isNaN(n) ? null : n
  }
  const n = parseInt(str.replace(/[^0-9]/g, ''))
  return isNaN(n) ? null : n
}

// ─── Main finder ────────────────────────────────────────────────────────────────

export async function findContactForLead(
  lead: Lead,
  onProgress: (phase: ContactFinderPhase, partial: Partial<ContactFinderResult>) => void,
): Promise<ContactFinderResult> {
  const result: ContactFinderResult = {
    leadId: lead.id,
    companyName: lead.companyName,
    phase: 'idle',
    apolloOrgId: null,
    employeeCount: null,
    companyLinkedinUrl: lead.companyLinkedinUrl ?? null,
    companyWebsite: lead.companyWebsite ?? null,
    companyDomain: lead.companyWebsite
      ? extractDomainFromUrl(lead.companyWebsite)
      : null,
    industry: null,
    contactName: null,
    contactTitle: null,
    contactLinkedinUrl: null,
    contactEmail: null,
    emailStatus: null,
    skipReason: null,
    error: null,
    emailSource: null,
    creditsUsed: 0,
  }

  const report = (phase: ContactFinderPhase) => {
    result.phase = phase
    onProgress(phase, { ...result })
  }

  try {
    // ── Phase 1: Company lookup ────────────────────────────────────────────────
    report('finding_company')

    let domain = result.companyDomain

    // Strategy A: Enrich by domain (most accurate, uses LinkedIn data)
    if (domain) {
      try {
        const org = await enrichOrganizationByDomain(domain)
        if (org) {
          result.apolloOrgId = org.id
          result.employeeCount = org.estimatedNumEmployees
          result.industry = org.industry
          if (!result.companyLinkedinUrl && org.linkedinUrl)
            result.companyLinkedinUrl = org.linkedinUrl
          if (!result.companyWebsite && org.websiteUrl)
            result.companyWebsite = org.websiteUrl
          if (org.domain) domain = result.companyDomain = org.domain
          result.creditsUsed += 1
        }
      } catch (err) {
        // Soft fail — try name search
        console.warn(`[ContactFinder] Org enrichment by domain failed:`, err)
      }
    }

    // Strategy B: Search by name when no domain or domain enrichment failed
    if (!result.apolloOrgId && !result.employeeCount) {
      try {
        const org = await searchOrganizationByName(lead.companyName, lead.city)
        if (org) {
          result.apolloOrgId = org.id
          result.employeeCount = org.estimatedNumEmployees
          result.industry = org.industry
          if (!result.companyLinkedinUrl && org.linkedinUrl)
            result.companyLinkedinUrl = org.linkedinUrl
          if (!result.companyWebsite && org.websiteUrl)
            result.companyWebsite = org.websiteUrl
          if (org.domain && !domain) {
            domain = result.companyDomain = org.domain
          }
          result.creditsUsed += 1
        }
      } catch (err) {
        console.warn(`[ContactFinder] Org search by name failed:`, err)
      }
    }

    // Fallback: parse the Seek employee count string if Apollo found nothing
    if (result.employeeCount === null && lead.companyEmployeeCount) {
      result.employeeCount = parseEmployeeCount(lead.companyEmployeeCount)
    }

    report('finding_company')

    // ── Phase 2: Size gate ─────────────────────────────────────────────────────
    report('checking_size')

    if (result.employeeCount !== null && result.employeeCount > MAX_COMPANY_SIZE) {
      result.skipReason = `${lead.companyName} has ~${result.employeeCount.toLocaleString()} employees (limit: ${MAX_COMPANY_SIZE})`
      result.phase = 'skipped'
      onProgress('skipped', { ...result })
      return result
    }

    // ── Phase 3: Find right person (FREE — no credits) ─────────────────────────
    report('finding_contact')

    const titleGroups = getTitleGroupsBySize(result.employeeCount)

    let foundPerson: {
      id: string
      name: string
      title: string
      linkedinUrl: string | null
    } | null = null

    for (const group of titleGroups) {
      try {
        const people = await searchPeopleByTitles({
          companyName: lead.companyName,
          domain: domain || null,
          organizationId: result.apolloOrgId,
          titles: group.titles,
          seniorities: group.seniorities,
        })

        if (people.length > 0) {
          // Prefer people at the exact same company (filter by orgName)
          const nameWords = lead.companyName.toLowerCase().split(' ')
          const atCompany = people.filter(p =>
            nameWords.some(w => w.length > 3 && p.orgName?.toLowerCase().includes(w))
          )
          const chosen = atCompany[0] ?? people[0]
          foundPerson = {
            id: chosen.id,
            name: chosen.name,
            title: chosen.title,
            linkedinUrl: chosen.linkedinUrl,
          }
          break
        }
      } catch (err) {
        console.warn(`[ContactFinder] People search failed (${group.label}):`, err)
      }
    }

    if (!foundPerson) {
      result.skipReason = 'No matching contact found on Apollo for this company'
      result.phase = 'done'
      onProgress('done', { ...result })
      return result
    }

    result.contactName = foundPerson.name
    result.contactTitle = foundPerson.title
    result.contactLinkedinUrl = foundPerson.linkedinUrl
    report('finding_contact')

    // ── Phase 4: Get their email ───────────────────────────────────────────────
    report('finding_email')

    // Step A: Apollo enrichment by ID (1 credit — most reliable work email)
    if (foundPerson.id) {
      const enriched = await enrichPersonById(foundPerson.id)
      if (enriched?.email) {
        result.contactEmail = enriched.email
        result.emailStatus = enriched.emailStatus
        result.emailSource = 'apollo'
        result.creditsUsed += 1
        if (enriched.linkedinUrl && !result.contactLinkedinUrl)
          result.contactLinkedinUrl = enriched.linkedinUrl
      } else {
        result.creditsUsed += 1  // Credit consumed even if email not found
      }
    }

    // Step B: Hunter.io fallback (uses Hunter quota, not Apollo credits)
    if (!result.contactEmail) {
      const hunterDomain = domain
      if (hunterDomain && result.contactName) {
        const parts = result.contactName.trim().split(' ')
        const firstName = parts[0]
        const lastName = parts.slice(1).join(' ') || parts[0]

        try {
          const hunterResult = await findEmail(firstName, lastName, hunterDomain)
          if (hunterResult?.email) {
            result.contactEmail = hunterResult.email
            result.emailSource = 'hunter'
            if (hunterResult.linkedin && !result.contactLinkedinUrl)
              result.contactLinkedinUrl = hunterResult.linkedin
          }
        } catch {
          // Hunter quota may be exhausted — continue without email
        }
      }
    }

    result.phase = 'done'
    onProgress('done', { ...result })
    return result

  } catch (err) {
    result.error = err instanceof Error ? err.message : 'An unexpected error occurred'
    result.phase = 'error'
    onProgress('error', { ...result })
    return result
  }
}