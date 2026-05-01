// src/services/contactFinderService.ts
/**
 * CONTACT FINDER SERVICE — CORRECTED VERSION
 * ─────────────────────────────────────────────────────────────────────────────
 * FIXES:
 *   1. Better domain extraction and validation
 *   2. Improved employee count parsing
 *   3. Better error handling with detailed messages
 *   4. Proper credit tracking
 *   5. Better person matching logic
 *
 * WHAT IT DOES:
 *   Phase 1: Find company on Apollo (get real LinkedIn employee count)
 *   Phase 2: Check size (skip if > 500 employees)
 *   Phase 3: Find right person (HR → GM → Director → etc.)
 *   Phase 4: Get email (Apollo first, then Hunter fallback)
 */

import {
  enrichOrganizationByDomain,
  searchOrganizationByName,
  searchPeopleByTitles,
  enrichPersonById,
} from './apolloApi'
import { findEmail } from './hunterApi'
import { getTitleGroupsBySize } from '@/utils/contactPicker'
import type { Lead } from '@/types'

export const MAX_COMPANY_SIZE = 500
export const CEO_FORCE_SIZE = 5

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
    
    // Skip if clearly too large from Seek data
    if (seekMax !== null && seekMax > MAX_COMPANY_SIZE) {
      continue
    }

    const hasDomain = !!extractDomain(lead.companyWebsite)
    const hasCount = lead.companyEmployeeCount != null

    // Company enrichment credit
    if (!hasDomain || !hasCount) {
      min += 1
      max += 1
    }

    // Email reveal credit (only if person found - not guaranteed)
    max += 1
  }

  return {
    min,
    max,
    label: `${min}–${max} Apollo credit${max !== 1 ? 's' : ''} (${leads.length} lead${leads.length !== 1 ? 's' : ''})`,
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function extractDomain(url: string | null | undefined): string | null {
  if (!url || url.trim() === '') return null

  try {
    const urlStr = url.startsWith('http') ? url : `https://${url}`
    const hostname = new URL(urlStr).hostname
    const domain = hostname.replace(/^www\./, '').toLowerCase().trim()
    
    // Validate
    if (domain.length < 4 || !domain.includes('.')) return null
    
    console.log('[CF] Extracted domain:', domain, 'from:', url)
    return domain
  } catch (err) {
    console.warn('[CF] Failed to extract domain from:', url, err)
    return null
  }
}

function parseEmpCount(str: string | null | undefined): number | null {
  if (!str || str.trim() === '') return null

  // Handle ranges like "51-200", "201-500"
  const rangeMatch = str.match(/(\d+)\s*[-–]\s*(\d+)/)
  if (rangeMatch) {
    const max = parseInt(rangeMatch[2])
    console.log('[CF] Parsed employee range:', str, '→ max:', max)
    return max
  }

  // Handle "500+" format
  const plusMatch = str.match(/(\d+)\s*\+/)
  if (plusMatch) {
    const num = parseInt(plusMatch[1])
    console.log('[CF] Parsed employee plus:', str, '→', num)
    return num
  }

  // Handle plain number
  const cleaned = str.replace(/[^0-9]/g, '')
  if (cleaned) {
    const num = parseInt(cleaned)
    console.log('[CF] Parsed employee count:', str, '→', num)
    return num
  }

  return null
}

// ─── Main contact finder ───────────────────────────────────────────────────────

export async function findContactForLead(
  lead: Lead,
  onProgress: (phase: ContactFinderPhase, partial: Partial<ContactFinderResult>) => void,
): Promise<ContactFinderResult> {
  console.log('\n[CF] ═══════════════════════════════════════════════════════════')
  console.log('[CF] Starting contact finder for:', lead.companyName)
  console.log('[CF] ═══════════════════════════════════════════════════════════\n')

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
    // ══ Early skip check ═══════════════════════════════════════════════════════
    if (seekCount !== null && seekCount > MAX_COMPANY_SIZE) {
      console.log('[CF] ⊗ Skipping - Seek shows', seekCount, 'employees (over limit)')
      result.skipReason = `Seek shows ${lead.companyEmployeeCount} employees — over ${MAX_COMPANY_SIZE} limit (saved 1 credit)`
      result.creditsSaved = 1
      result.phase = 'skipped'
      onProgress('skipped', { ...result })
      return result
    }

    // ══ PHASE 1: Company Lookup ════════════════════════════════════════════════
    console.log('[CF] ▶ Phase 1: Finding company on Apollo...')
    report('finding_company')

    let domain = existingDomain
    let needsOrgEnrich = true

    // Check if we already have enough data to skip org enrichment
    if (domain && seekCount !== null && seekCount <= MAX_COMPANY_SIZE && lead.companyLinkedinUrl) {
      console.log('[CF] ✓ Already have domain + count + LinkedIn - can skip org enrichment')
      result.employeeCount = seekCount
      result.creditsSaved = 1
      needsOrgEnrich = false
    }

    if (needsOrgEnrich) {
      // Try domain enrichment first (most accurate)
      if (domain) {
        console.log('[CF] → Trying domain enrichment:', domain)
        try {
          const org = await enrichOrganizationByDomain(domain)
          if (org) {
            console.log('[CF] ✓ Found organization by domain')
            result.apolloOrgId = org.id
            result.employeeCount = org.estimatedNumEmployees
            result.industry = org.industry ?? result.industry
            result.companyLinkedinUrl = org.linkedinUrl ?? result.companyLinkedinUrl
            result.companyWebsite = org.websiteUrl ?? result.companyWebsite
            result.companyDomain = org.domain ?? domain
            result.creditsUsed += 1
            console.log('[CF]   Employee count (LinkedIn):', result.employeeCount)
            console.log('[CF]   Credits used: 1')
          } else {
            console.log('[CF] ⊗ Domain not in Apollo database')
          }
        } catch (err) {
          console.error('[CF] ⊗ Domain enrichment failed:', err instanceof Error ? err.message : err)
        }
      }

      // Try name search if domain enrichment failed
      if (!result.apolloOrgId) {
        console.log('[CF] → Trying company name search:', lead.companyName)
        try {
          const org = await searchOrganizationByName(lead.companyName)
          if (org) {
            console.log('[CF] ✓ Found organization by name')
            result.apolloOrgId = org.id
            result.employeeCount = org.estimatedNumEmployees
            result.industry = org.industry ?? result.industry
            result.companyLinkedinUrl = org.linkedinUrl ?? result.companyLinkedinUrl
            result.companyWebsite = org.websiteUrl ?? result.companyWebsite
            if (org.domain && !domain) {
              domain = result.companyDomain = org.domain
            }
            result.creditsUsed += 1
            console.log('[CF]   Employee count (LinkedIn):', result.employeeCount)
            console.log('[CF]   Credits used: 1')
          } else {
            console.log('[CF] ⊗ Company not found in Apollo')
          }
        } catch (err) {
          console.error('[CF] ⊗ Name search failed:', err instanceof Error ? err.message : err)
        }
      }

      // Fallback to Seek count if Apollo found nothing
      if (result.employeeCount === null && seekCount !== null) {
        console.log('[CF] → Using Seek employee count as fallback:', seekCount)
        result.employeeCount = seekCount
      }
    }

    report('finding_company')

    // ══ PHASE 2: Size Gate ═════════════════════════════════════════════════════
    console.log('[CF] ▶ Phase 2: Checking company size...')
    report('checking_size')

    if (result.employeeCount !== null && result.employeeCount > MAX_COMPANY_SIZE) {
      const seekNote = seekCount !== null && seekCount !== result.employeeCount
        ? ` (Seek showed ${lead.companyEmployeeCount}, but LinkedIn data is more accurate)`
        : ''
      
      console.log('[CF] ⊗ Skipping - Company too large:', result.employeeCount, 'employees')
      result.skipReason = `${lead.companyName} has ${result.employeeCount.toLocaleString()} employees on LinkedIn${seekNote}. Limit is ${MAX_COMPANY_SIZE}.`
      result.phase = 'skipped'
      onProgress('skipped', { ...result })
      return result
    }

    console.log('[CF] ✓ Company size OK:', result.employeeCount ?? 'unknown', 'employees')

    // ══ PHASE 3: Find Contact ══════════════════════════════════════════════════
    console.log('[CF] ▶ Phase 3: Finding contact person...')
    report('finding_contact')

    // Get title groups based on Apollo-verified employee count
    const groups = getTitleGroupsBySize(result.employeeCount)
    console.log('[CF] → Using', groups.length, 'title groups (priority order)')

    let foundPerson: {
      id: string
      name: string
      title: string
      linkedinUrl: string | null
    } | null = null

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i]
      console.log(`[CF] → Trying group ${i + 1}/${groups.length}: ${group.label}`)
      console.log('[CF]   Titles:', group.titles.slice(0, 3).join(', '), '...')

      try {
        const people = await searchPeopleByTitles({
          companyName: lead.companyName,
          domain: domain ?? null,
          organizationId: result.apolloOrgId,
          titles: group.titles,
          seniorities: group.seniorities,
        })

        if (people.length > 0) {
          console.log('[CF] ✓ Found', people.length, 'people in this group')

          // Filter for people at the right company
          const companyWords = lead.companyName
            .toLowerCase()
            .split(' ')
            .filter(w => w.length > 3)

          const atRightCompany = people.filter(p => {
            const match = companyWords.some(w => p.orgName?.toLowerCase().includes(w))
            if (match) {
              console.log('[CF]   ✓', p.name, '-', p.title, '(org match)')
            }
            return match
          })

          const chosen = atRightCompany[0] ?? people[0]

          foundPerson = {
            id: chosen.id,
            name: chosen.name,
            title: chosen.title,
            linkedinUrl: chosen.linkedinUrl,
          }

          console.log('[CF] ✓ Selected:', chosen.name, '-', chosen.title)
          break
        } else {
          console.log('[CF]   ⊗ No people found')
        }
      } catch (err) {
        console.error(`[CF] ⊗ People search failed for ${group.label}:`, err instanceof Error ? err.message : err)
      }
    }

    if (!foundPerson) {
      console.log('[CF] ⊗ No matching contact found on Apollo')
      result.skipReason = 'No matching contact found on Apollo for this company'
      result.phase = 'done'
      onProgress('done', { ...result })
      return result
    }

    result.contactName = foundPerson.name
    result.contactTitle = foundPerson.title
    result.contactLinkedinUrl = foundPerson.linkedinUrl
    report('finding_contact')

    // ══ PHASE 4: Get Email ═════════════════════════════════════════════════════
    console.log('[CF] ▶ Phase 4: Getting email address...')
    report('finding_email')

    // Try Apollo email reveal first
    console.log('[CF] → Trying Apollo email reveal for person ID:', foundPerson.id)
    try {
      const enriched = await enrichPersonById(foundPerson.id)
      result.creditsUsed += 1
      console.log('[CF]   Credits used: 1')

      if (enriched?.email) {
        console.log('[CF] ✓ Got email from Apollo:', enriched.email)
        result.contactEmail = enriched.email
        result.emailStatus = enriched.emailStatus
        result.emailSource = 'apollo'
        if (enriched.linkedinUrl && !result.contactLinkedinUrl) {
          result.contactLinkedinUrl = enriched.linkedinUrl
        }
      } else {
        console.log('[CF] ⊗ No email from Apollo')
      }
    } catch (err) {
      console.error('[CF] ⊗ Apollo email reveal failed:', err instanceof Error ? err.message : err)
    }

    // Try Hunter fallback if no email yet
    if (!result.contactEmail && domain && result.contactName) {
      console.log('[CF] → Trying Hunter.io fallback...')
      console.log('[CF]   Name:', result.contactName)
      console.log('[CF]   Domain:', domain)

      try {
        const nameParts = result.contactName.trim().split(/\s+/)
        const firstName = nameParts[0]
        const lastName = nameParts.slice(1).join(' ') || nameParts[0]

        const hunterResult = await findEmail(firstName, lastName, domain)
        
        if (hunterResult?.email) {
          console.log('[CF] ✓ Got email from Hunter:', hunterResult.email)
          result.contactEmail = hunterResult.email
          result.emailSource = 'hunter'
          if (hunterResult.linkedin && !result.contactLinkedinUrl) {
            result.contactLinkedinUrl = hunterResult.linkedin
          }
        } else {
          console.log('[CF] ⊗ No email from Hunter')
        }
      } catch (err) {
        console.error('[CF] ⊗ Hunter fallback failed:', err instanceof Error ? err.message : err)
      }
    }

    // Done
    result.phase = 'done'
    console.log('\n[CF] ═══════════════════════════════════════════════════════════')
    console.log('[CF] DONE:', lead.companyName)
    console.log('[CF]   Contact:', result.contactName ?? 'Not found')
    console.log('[CF]   Email:', result.contactEmail ?? 'Not found')
    console.log('[CF]   Source:', result.emailSource ?? 'N/A')
    console.log('[CF]   Credits used:', result.creditsUsed)
    console.log('[CF]   Credits saved:', result.creditsSaved)
    console.log('[CF] ═══════════════════════════════════════════════════════════\n')

    onProgress('done', { ...result })
    return result

  } catch (err) {
    console.error('[CF] ⊗⊗⊗ FATAL ERROR:', err)
    result.error = err instanceof Error ? err.message : 'An unexpected error occurred'
    result.phase = 'error'
    onProgress('error', { ...result })
    return result
  }
}