/**
 * CONTACT FINDER SERVICE — COMPLETE & CORRECTED
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 1 – finding_company  : GET org by domain (1 credit) or POST by name (1 credit)
 * Phase 2 – checking_size    : Skip if > 500 employees (free)
 * Phase 3 – finding_contact  : POST people search by title priority (FREE)
 * Phase 4 – finding_email    : POST people/match by ID (1 credit) → name+domain fallback → Hunter
 *
 * PHONE: We capture direct-dial (office) number synchronously from people/match.
 *        Personal mobile requires webhook + 8 credits — not worth it on free tier.
 */

import {
  enrichOrganizationByDomain,
  searchOrganizationByName,
  searchPeopleByTitles,
  enrichPersonById,
  enrichPersonByNameDomain,
} from './apolloApi'
import { findEmail } from './hunterApi'
import { getTitleGroupsBySize } from '@/utils/contactPicker'
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
  apolloOrgId: string | null
  employeeCount: number | null
  seekEmployeeCount: string | null
  companyLinkedinUrl: string | null
  companyWebsite: string | null
  companyDomain: string | null
  industry: string | null
  contactName: string | null
  contactTitle: string | null
  contactLinkedinUrl: string | null
  contactEmail: string | null
  contactPhone: string | null    // Direct dial / office number if available
  emailStatus: string | null
  skipReason: string | null
  error: string | null
  emailSource: 'apollo' | 'hunter' | null
  creditsUsed: number
  creditsSaved: number
}

export interface ContactDecision {
  leadId: string
  accept: boolean
  contactName: string | null
  contactTitle: string | null
  contactLinkedinUrl: string | null
  contactEmail: string | null
  contactPhone: string | null
  employeeCount: number | null
  companyLinkedinUrl: string | null
  companyWebsite: string | null
  industry: string | null
}

// ─── Credit estimator ──────────────────────────────────────────────────────────

export function estimateCredits(leads: Lead[]): {
  min: number
  max: number
  label: string
} {
  let min = 0
  let max = 0

  for (const lead of leads) {
    const seekMax = parseEmpCount(lead.companyEmployeeCount)
    if (seekMax !== null && seekMax > MAX_COMPANY_SIZE) continue

    const hasDomain = !!extractDomain(lead.companyWebsite)
    const hasCount  = lead.companyEmployeeCount != null

    if (!hasDomain || !hasCount || !lead.companyLinkedinUrl) {
      min += 1
      max += 1
    }
    max += 1  // potential email reveal
  }

  return {
    min,
    max,
    label: `${min}–${max} Apollo credit${max !== 1 ? 's' : ''} (${leads.length} lead${leads.length !== 1 ? 's' : ''})`,
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function extractDomain(url: string | null | undefined): string | null {
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

function parseEmpCount(str: string | null | undefined): number | null {
  if (!str?.trim()) return null
  const range = str.match(/(\d[\d,]*)\s*[-–]\s*(\d[\d,]*)/)
  if (range) return parseInt(range[2].replace(/,/g, ''))
  const plus = str.match(/(\d[\d,]*)\s*\+/)
  if (plus) return parseInt(plus[1].replace(/,/g, ''))
  const plain = str.replace(/[^0-9]/g, '')
  return plain ? parseInt(plain) : null
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export async function findContactForLead(
  lead: Lead,
  onProgress: (phase: ContactFinderPhase, partial: Partial<ContactFinderResult>) => void,
): Promise<ContactFinderResult> {
  console.log('\n[CF] ═══ START:', lead.companyName, '═══')

  const existingDomain = extractDomain(lead.companyWebsite)
  const seekCount = parseEmpCount(lead.companyEmployeeCount)

  const result: ContactFinderResult = {
    leadId: lead.id,
    companyName: lead.companyName,
    phase: 'idle',
    apolloOrgId: null,
    employeeCount: null,
    seekEmployeeCount: lead.companyEmployeeCount ?? null,
    companyLinkedinUrl: lead.companyLinkedinUrl ?? null,
    companyWebsite: lead.companyWebsite ?? null,
    companyDomain: existingDomain,
    industry: lead.companyIndustry ?? null,
    contactName: null,
    contactTitle: null,
    contactLinkedinUrl: null,
    contactEmail: null,
    contactPhone: null,
    emailStatus: null,
    skipReason: null,
    error: null,
    emailSource: null,
    creditsUsed: 0,
    creditsSaved: 0,
  }

  const report = (phase: ContactFinderPhase) => {
    result.phase = phase
    onProgress(phase, { ...result })
  }

  try {
    // ── Early skip: Seek already says too large ────────────────────────────
    if (seekCount !== null && seekCount > MAX_COMPANY_SIZE) {
      result.skipReason = `Seek says ${lead.companyEmployeeCount} employees — over ${MAX_COMPANY_SIZE} limit (credit saved)`
      result.creditsSaved = 1
      result.phase = 'skipped'
      onProgress('skipped', { ...result })
      return result
    }

    // ════ PHASE 1: Company Lookup ══════════════════════════════════════════
    report('finding_company')

    let domain = existingDomain
    const canSkip =
      domain &&
      seekCount !== null &&
      seekCount <= MAX_COMPANY_SIZE &&
      lead.companyLinkedinUrl

    if (canSkip) {
      console.log('[CF] Skipping org enrichment — already have domain+count+LinkedIn')
      result.employeeCount = seekCount
      result.creditsSaved += 1
    } else {
      // Try domain enrichment first (most accurate — directly matches LinkedIn data)
      if (domain) {
        console.log('[CF] → Trying domain enrichment:', domain)
        try {
          const org = await enrichOrganizationByDomain(domain)
          if (org) {
            result.apolloOrgId          = org.id
            result.employeeCount        = org.estimatedNumEmployees
            result.industry             = org.industry ?? result.industry
            result.companyLinkedinUrl   = org.linkedinUrl ?? result.companyLinkedinUrl
            result.companyWebsite       = org.websiteUrl ?? result.companyWebsite
            result.companyDomain        = org.domain ?? domain
            result.creditsUsed         += 1
            console.log('[CF] ✓ Org by domain | emp:', result.employeeCount)
          }
        } catch (err) {
          console.error('[CF] Domain enrichment error:', err instanceof Error ? err.message : err)
        }
      }

      // Fallback: name search
      if (!result.apolloOrgId) {
        console.log('[CF] → Trying org name search:', lead.companyName)
        try {
          const org = await searchOrganizationByName(lead.companyName)
          if (org) {
            result.apolloOrgId          = org.id
            result.employeeCount        = org.estimatedNumEmployees
            result.industry             = org.industry ?? result.industry
            result.companyLinkedinUrl   = org.linkedinUrl ?? result.companyLinkedinUrl
            result.companyWebsite       = org.websiteUrl ?? result.companyWebsite
            if (org.domain && !domain) domain = result.companyDomain = org.domain
            result.creditsUsed         += 1
            console.log('[CF] ✓ Org by name | emp:', result.employeeCount)
          }
        } catch (err) {
          console.error('[CF] Name search error:', err instanceof Error ? err.message : err)
        }
      }

      // Last resort: use Seek count
      if (result.employeeCount === null && seekCount !== null) {
        console.log('[CF] Using Seek count fallback:', seekCount)
        result.employeeCount = seekCount
      }
    }

    report('finding_company')

    // ════ PHASE 2: Size Gate ═══════════════════════════════════════════════
    report('checking_size')

    if (result.employeeCount !== null && result.employeeCount > MAX_COMPANY_SIZE) {
      const note =
        seekCount !== null && seekCount !== result.employeeCount
          ? ` (Seek said ${lead.companyEmployeeCount} — LinkedIn data is more accurate)`
          : ''
      result.skipReason = `${lead.companyName} has ${result.employeeCount.toLocaleString()} employees on LinkedIn${note}. Limit is ${MAX_COMPANY_SIZE}.`
      result.phase = 'skipped'
      onProgress('skipped', { ...result })
      return result
    }

    console.log('[CF] ✓ Size OK:', result.employeeCount ?? 'unknown')

    // ════ PHASE 3: Find Contact ════════════════════════════════════════════
    report('finding_contact')

    const groups = getTitleGroupsBySize(result.employeeCount)
    console.log('[CF] Trying', groups.length, 'title groups')

    let foundPerson: {
      id: string
      name: string
      title: string
      linkedinUrl: string | null
    } | null = null

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i]
      console.log(`[CF] Group ${i + 1}/${groups.length}: ${group.label}`)

      try {
        const people = await searchPeopleByTitles({
          companyName: lead.companyName,
          domain: domain ?? null,
          organizationId: result.apolloOrgId,
          titles: group.titles,
          seniorities: group.seniorities,
        })

        if (people.length > 0) {
          // Prefer people whose org name matches
          const companyWords = lead.companyName
            .toLowerCase()
            .split(' ')
            .filter(w => w.length > 3)

          const atRightCompany = people.filter(p =>
            companyWords.some(w => p.orgName?.toLowerCase().includes(w)),
          )

          const chosen = atRightCompany[0] ?? people[0]
          console.log('[CF] ✓ Selected:', chosen.name, '—', chosen.title)

          foundPerson = {
            id: chosen.id,
            name: chosen.name,
            title: chosen.title,
            linkedinUrl: chosen.linkedinUrl,
          }
          break
        }
      } catch (err) {
        console.error(`[CF] People search failed (${group.label}):`, err instanceof Error ? err.message : err)
      }
    }

    if (!foundPerson) {
      console.log('[CF] No contact found on Apollo')
      result.phase = 'done'
      onProgress('done', { ...result })
      return result
    }

    result.contactName        = foundPerson.name
    result.contactTitle       = foundPerson.title
    result.contactLinkedinUrl = foundPerson.linkedinUrl
    report('finding_contact')

    // ════ PHASE 4: Get Email + Phone ═══════════════════════════════════════
    report('finding_email')

    // Attempt 1: Apollo enrichment by person ID (most reliable)
    console.log('[CF] → Apollo enrich by ID:', foundPerson.id)
    try {
      const enriched = await enrichPersonById(foundPerson.id)
      result.creditsUsed += 1

      if (enriched) {
        if (enriched.email) {
          result.contactEmail  = enriched.email
          result.emailStatus   = enriched.emailStatus
          result.emailSource   = 'apollo'
          console.log('[CF] ✓ Email from Apollo ID:', enriched.email)
        }
        if (enriched.phone) {
          result.contactPhone = enriched.phone
          console.log('[CF] ✓ Phone from Apollo ID:', enriched.phone)
        }
        if (enriched.linkedinUrl && !result.contactLinkedinUrl) {
          result.contactLinkedinUrl = enriched.linkedinUrl
        }
      }
    } catch (err) {
      console.error('[CF] Apollo ID enrich failed:', err instanceof Error ? err.message : err)
    }

    // Attempt 2: Apollo by name + domain (if no email yet and we have a domain)
    if (!result.contactEmail && domain && result.contactName) {
      console.log('[CF] → Apollo name+domain fallback')
      try {
        const parts     = result.contactName.trim().split(/\s+/)
        const firstName = parts[0]
        const lastName  = parts.slice(1).join(' ') || parts[0]

        const byName = await enrichPersonByNameDomain(
          firstName,
          lastName,
          domain,
          lead.companyName,
        )
        result.creditsUsed += 1

        if (byName) {
          if (byName.email) {
            result.contactEmail = byName.email
            result.emailStatus  = byName.emailStatus
            result.emailSource  = 'apollo'
            console.log('[CF] ✓ Email from Apollo name+domain:', byName.email)
          }
          if (byName.phone && !result.contactPhone) {
            result.contactPhone = byName.phone
            console.log('[CF] ✓ Phone from name+domain:', byName.phone)
          }
          if (byName.linkedinUrl && !result.contactLinkedinUrl) {
            result.contactLinkedinUrl = byName.linkedinUrl
          }
        }
      } catch (err) {
        console.error('[CF] Name+domain fallback failed:', err instanceof Error ? err.message : err)
      }
    }

    // Attempt 3: Hunter.io fallback (if still no email)
    if (!result.contactEmail && domain && result.contactName) {
      console.log('[CF] → Hunter.io fallback')
      try {
        const parts     = result.contactName.trim().split(/\s+/)
        const firstName = parts[0]
        const lastName  = parts.slice(1).join(' ') || parts[0]

        const hunterResult = await findEmail(firstName, lastName, domain)
        if (hunterResult?.email) {
          result.contactEmail = hunterResult.email
          result.emailSource  = 'hunter'
          console.log('[CF] ✓ Email from Hunter:', hunterResult.email)
          if (hunterResult.linkedin && !result.contactLinkedinUrl) {
            result.contactLinkedinUrl = hunterResult.linkedin
          }
        }
      } catch (err) {
        console.error('[CF] Hunter fallback failed:', err instanceof Error ? err.message : err)
      }
    }

    result.phase = 'done'
    console.log('[CF] ═══ DONE:', lead.companyName)
    console.log('[CF]   Contact:', result.contactName ?? 'none')
    console.log('[CF]   Email  :', result.contactEmail ?? 'none')
    console.log('[CF]   Phone  :', result.contactPhone ?? 'none')
    console.log('[CF]   Source :', result.emailSource ?? 'n/a')
    console.log('[CF]   Credits:', result.creditsUsed, 'used,', result.creditsSaved, 'saved')

    onProgress('done', { ...result })
    return result
  } catch (err) {
    console.error('[CF] FATAL:', err)
    result.error = err instanceof Error ? err.message : 'Unexpected error'
    result.phase = 'error'
    onProgress('error', { ...result })
    return result
  }
}