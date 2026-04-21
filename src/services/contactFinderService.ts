// src/services/contactFinderService.ts
/**
 * CONTACT FINDER SERVICE
 * ──────────────────────────────────────────────────────────────────────────
 * Full automated flow for finding the right person to contact at a company.
 *
 * Flow per lead:
 *  1. Apollo org search  → employee count + LinkedIn URL + domain
 *  2. Size gate          → skip if > 500 employees
 *  3. Apollo people search → priority titles based on company size
 *  4. Email              → Apollo result → Apollo reveal → Hunter fallback
 *
 * Title priority by size:
 *  ≤30   → CEO / Director / Founder / Managing Director
 *  ≤100  → General Manager → HR Manager / People & Culture
 *  ≤300  → HR Manager / P&C Manager → General Manager
 *  ≤500  → Head of HR / Talent Acquisition → HR Manager
 */

import type { Lead } from '@/types'
import {
  searchOrganization,
  searchPeopleByTitles,
  revealPersonEmail,
} from './apolloApi'
import { findEmail } from './hunterApi'

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

  // Company data found/updated
  employeeCount: number | null
  companyLinkedinUrl: string | null
  companyWebsite: string | null
  companyDomain: string | null

  // Contact found
  contactName: string | null
  contactTitle: string | null
  contactLinkedinUrl: string | null
  contactEmail: string | null

  // Meta
  skipReason: string | null
  error: string | null
  emailSource: 'apollo' | 'hunter' | null
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
}

export interface TitleGroup {
  label: string
  titles: string[]
}

// ─── Title priority groups by company size ─────────────────────────────────────

export function getTitleGroupsBySize(employeeCount: number | null): TitleGroup[] {
  const count = employeeCount ?? 0

  if (count === 0 || count <= 30) {
    // Very small — owner/CEO is almost always handling hiring
    return [
      {
        label: 'Executive',
        titles: [
          'CEO',
          'Chief Executive Officer',
          'Managing Director',
          'Director',
          'Founder',
          'Co-Founder',
          'Owner',
          'Principal',
          'Partner',
        ],
      },
      {
        label: 'Operations',
        titles: [
          'General Manager',
          'Operations Manager',
          'Country Manager',
        ],
      },
    ]
  }

  if (count <= 100) {
    // Small-medium — GM or HR Manager
    return [
      {
        label: 'General Management',
        titles: ['General Manager', 'Country Manager'],
      },
      {
        label: 'HR / People & Culture',
        titles: [
          'HR Manager',
          'Human Resources Manager',
          'People and Culture Manager',
          'People & Culture Manager',
          'Head of People',
          'Head of People and Culture',
          'Talent Acquisition Manager',
          'Talent Acquisition Lead',
          'HR Business Partner',
          'Recruitment Manager',
        ],
      },
      {
        label: 'Executive',
        titles: [
          'Managing Director',
          'Director',
          'Operations Manager',
          'Regional Manager',
        ],
      },
    ]
  }

  if (count <= 300) {
    // Medium — HR takes the lead
    return [
      {
        label: 'HR / People & Culture',
        titles: [
          'HR Manager',
          'Human Resources Manager',
          'People and Culture Manager',
          'People & Culture Manager',
          'Talent Acquisition Manager',
          'Talent Acquisition Lead',
          'Head of People and Culture',
          'Head of People',
          'HR Business Partner',
          'HR Generalist',
          'Recruitment Manager',
          'Recruiting Manager',
        ],
      },
      {
        label: 'General Management',
        titles: [
          'General Manager',
          'Country Manager',
          'Operations Manager',
          'Regional Manager',
        ],
      },
      {
        label: 'Executive',
        titles: ['Managing Director', 'Director'],
      },
    ]
  }

  // 300–500 — dedicated People & Culture / Talent Acquisition team
  return [
    {
      label: 'People & Culture',
      titles: [
        'People and Culture Manager',
        'People & Culture Manager',
        'Head of People and Culture',
        'Head of HR',
        'Talent Acquisition Manager',
        'Talent Acquisition Lead',
        'HR Director',
        'Head of Talent',
        'Head of People',
        'Recruitment Manager',
        'Recruiting Manager',
        'Talent Acquisition Specialist',
      ],
    },
    {
      label: 'HR',
      titles: [
        'HR Manager',
        'Human Resources Manager',
        'HR Business Partner',
      ],
    },
    {
      label: 'Operations',
      titles: [
        'General Manager',
        'Operations Manager',
        'Regional Manager',
      ],
    },
  ]
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function extractDomainLocal(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`)
      .hostname.replace(/^www\./, '')
      .toLowerCase()
  } catch {
    return ''
  }
}

function parseEmployeeCountString(str: string | null | undefined): number | null {
  if (!str) return null
  // Handle "51-200", "201-500", "1001+"
  const parts = str.split('-')
  if (parts.length === 2) return parseInt(parts[1].replace(/\D/g, '')) || null
  const cleaned = str.replace(/[^0-9]/g, '')
  return parseInt(cleaned) || null
}

// ─── Main finder ────────────────────────────────────────────────────────────────

export async function findContactForLead(
  lead: Lead,
  onProgress: (phase: ContactFinderPhase, partial: Partial<ContactFinderResult>) => void
): Promise<ContactFinderResult> {
  const result: ContactFinderResult = {
    leadId: lead.id,
    companyName: lead.companyName,
    phase: 'idle',
    employeeCount: null,
    companyLinkedinUrl: lead.companyLinkedinUrl ?? null,
    companyWebsite: lead.companyWebsite ?? null,
    companyDomain: lead.companyWebsite ? extractDomainLocal(lead.companyWebsite) : null,
    contactName: null,
    contactTitle: null,
    contactLinkedinUrl: null,
    contactEmail: null,
    skipReason: null,
    error: null,
    emailSource: null,
  }

  const report = (phase: ContactFinderPhase) => {
    result.phase = phase
    onProgress(phase, { ...result })
  }

  try {
    // ── Phase 1: Find company on Apollo ───────────────────────────────────────
    report('finding_company')

    let apolloOrgId: string | null = null

    try {
      const org = await searchOrganization(
        lead.companyName,
        result.companyDomain
      )

      if (org) {
        apolloOrgId = org.id
        result.employeeCount = org.estimatedNumEmployees

        if (!result.companyLinkedinUrl && org.linkedinUrl) {
          result.companyLinkedinUrl = org.linkedinUrl
        }
        if (!result.companyWebsite && org.websiteUrl) {
          result.companyWebsite = org.websiteUrl
        }
        if (org.domain && !result.companyDomain) {
          result.companyDomain = org.domain
        } else if (result.companyWebsite && !result.companyDomain) {
          result.companyDomain = extractDomainLocal(result.companyWebsite)
        }
      }
    } catch (err) {
      // Soft fail — continue with what we have
      console.warn(
        `[ContactFinder] Apollo org search failed for "${lead.companyName}":`,
        err instanceof Error ? err.message : err
      )
    }

    // Fallback to lead's existing employee count string if Apollo returned nothing
    if (result.employeeCount === null && lead.companyEmployeeCount) {
      result.employeeCount = parseEmployeeCountString(lead.companyEmployeeCount)
    }

    report('finding_company')

    // ── Phase 2: Size gate ────────────────────────────────────────────────────
    report('checking_size')

    if (
      result.employeeCount !== null &&
      result.employeeCount > MAX_COMPANY_SIZE
    ) {
      result.skipReason = `Company has ~${result.employeeCount.toLocaleString()} employees (limit: ${MAX_COMPANY_SIZE})`
      result.phase = 'skipped'
      onProgress('skipped', { ...result })
      return result
    }

    // ── Phase 3: Find contact ─────────────────────────────────────────────────
    report('finding_contact')

    const titleGroups = getTitleGroupsBySize(result.employeeCount)
    const domain = result.companyDomain

    let foundPerson: {
      id: string
      name: string
      title: string
      email: string | null
      linkedinUrl: string | null
    } | null = null

    for (const group of titleGroups) {
      try {
        const people = await searchPeopleByTitles({
          companyName: lead.companyName,
          organizationId: apolloOrgId,
          titles: group.titles,
          domain,
        })

        if (people.length > 0) {
          // Prefer a result that already has an email
          const withEmail = people.find(p => p.email)
          const chosen = withEmail ?? people[0]
          foundPerson = {
            id: chosen.id,
            name: chosen.name,
            title: chosen.title,
            email: chosen.email ?? null,
            linkedinUrl: chosen.linkedinUrl ?? null,
          }
          break
        }
      } catch (err) {
        console.warn(
          `[ContactFinder] People search failed (${group.label}):`,
          err instanceof Error ? err.message : err
        )
      }
    }

    if (!foundPerson) {
      result.skipReason = 'No suitable contact found at this company on Apollo'
      result.phase = 'done'
      onProgress('done', { ...result })
      return result
    }

    result.contactName = foundPerson.name
    result.contactTitle = foundPerson.title
    result.contactLinkedinUrl = foundPerson.linkedinUrl
    report('finding_contact')

    // ── Phase 4: Find email ───────────────────────────────────────────────────
    report('finding_email')

    // Step A: Already in search results (free, no credits used)
    if (foundPerson.email) {
      result.contactEmail = foundPerson.email
      result.emailSource = 'apollo'
    }

    // Step B: Apollo reveal endpoint (uses 1 export credit)
    if (!result.contactEmail && foundPerson.id) {
      try {
        const revealed = await revealPersonEmail(foundPerson.id)
        if (revealed) {
          result.contactEmail = revealed
          result.emailSource = 'apollo'
        }
      } catch {
        // Silent — proceed to Hunter
      }
    }

    // Step C: Hunter.io fallback
    if (!result.contactEmail && result.contactName) {
      const hunterDomain =
        domain ||
        (result.companyWebsite ? extractDomainLocal(result.companyWebsite) : null)

      if (hunterDomain) {
        try {
          const nameParts = result.contactName.trim().split(' ')
          const firstName = nameParts[0]
          const lastName = nameParts.slice(1).join(' ') || nameParts[0]

          const hunterResult = await findEmail(firstName, lastName, hunterDomain)
          if (hunterResult?.email) {
            result.contactEmail = hunterResult.email
            result.emailSource = 'hunter'
          }
        } catch {
          // Hunter also failed — proceed without email
        }
      }
    }

    result.phase = 'done'
    onProgress('done', { ...result })
    return result

  } catch (err) {
    result.error =
      err instanceof Error ? err.message : 'An unexpected error occurred'
    result.phase = 'error'
    onProgress('error', { ...result })
    return result
  }
}