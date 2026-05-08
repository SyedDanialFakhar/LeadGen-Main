/**
 * CONTACT FINDER SERVICE — PRODUCTION PIPELINE
 * ══════════════════════════════════════════════════════════════════════════════
 * Complete 4-phase pipeline using all Apollo endpoints correctly.
 *
 * PHASE 1 – finding_company
 *   companyResolver → domain enrichment OR name search
 *   Gets: org ID, LinkedIn employee count, domain, HQ phone, industry
 *
 * PHASE 2 – checking_size
 *   Skip if >1500 employees (saves all remaining credits for this lead)
 *   NOTE: Seek employee counts are NOT trusted for early skipping — they are
 *   often inaccurate (inflated or deflated). We always verify via Apollo/LinkedIn
 *   first, then gate on the LinkedIn-verified count.
 *
 * PHASE 3 – finding_contact  [FREE — no credits]
 *   searchPeopleByTitles → priority groups by company size
 *   Uses: has_email + has_direct_phone scoring BEFORE spending any credit
 *   Filters: contact_email_status[], organization_num_employees_ranges[],
 *            include_similar_titles=true
 *
 * PHASE 4 – finding_email
 *   enrichPersonById (1 credit) → enrichPersonByNameDomain (1 credit) → Hunter
 *   Bulk enrichment available when processing multiple people
 */

import { resolveCompany, extractDomain, parseEmpCount } from './companyResolver'
import {
  searchPeopleByTitles,
  enrichPersonById,
  enrichPersonByNameDomain,
  type ApolloPersonSearchResult,
} from './apolloApi'
import { scoreCandidates, pickBestCandidate } from './contactScorer'
import { findEmail } from './hunterApi'
import { getTitleGroupsBySize } from '@/utils/contactPicker'
import type { Lead } from '@/types'

/**
 * Maximum LinkedIn-verified employee count we will process.
 * Companies above this threshold are skipped AFTER Apollo confirms the count.
 * Seek data is intentionally NOT used for this gate — it is frequently wrong.
 */
export const MAX_COMPANY_SIZE = 1500

// ─── Types ──────────────────────────────────────────────────────────────────────

export type ContactFinderPhase =
  | 'idle' | 'finding_company' | 'checking_size'
  | 'finding_contact' | 'finding_email'
  | 'done' | 'skipped' | 'error'

export interface ContactFinderResult {
  leadId: string
  companyName: string
  phase: ContactFinderPhase
  // Company data
  apolloOrgId: string | null
  employeeCount: number | null
  seekEmployeeCount: string | null
  companyLinkedinUrl: string | null
  companyWebsite: string | null
  companyDomain: string | null
  companyPhone: string | null       // Corporate/HQ phone from org enrichment (free)
  industry: string | null
  // Contact data
  contactName: string | null
  contactTitle: string | null
  contactLinkedinUrl: string | null
  contactEmail: string | null
  emailStatus: string | null
  emailSource: 'apollo' | 'hunter' | null
  // Meta
  skipReason: string | null
  error: string | null
  creditsUsed: number
  creditsSaved: number
  candidateScore: number | null
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
  companyPhone: string | null
  industry: string | null
}

// ─── Credit estimator ────────────────────────────────────────────────────────────

export function estimateCredits(leads: Lead[]): { min: number; max: number; label: string } {
  let min = 0, max = 0

  for (const lead of leads) {
    // NOTE: We no longer skip based on Seek count here either — estimate conservatively.
    // Only obvious extreme outliers (e.g. Seek says 50,000) are worth excluding from
    // the estimate, but even then we verify via Apollo before actually skipping.
    const seekMax = parseEmpCount(lead.companyEmployeeCount)
    if (seekMax !== null && seekMax > MAX_COMPANY_SIZE * 5) {
      // Only exclude from estimate if Seek says enormously over limit (likely correct)
      continue
    }

    const hasDomain   = !!extractDomain(lead.companyWebsite)
    const hasCount    = lead.companyEmployeeCount != null
    const hasLinkedin = !!lead.companyLinkedinUrl

    // Org enrichment (skippable if domain + count + linkedin all present)
    if (!hasDomain || !hasCount || !hasLinkedin) { min += 1; max += 1 }

    // Email reveal (only if person found — not guaranteed)
    max += 1
  }

  return {
    min, max,
    label: `${min}–${max} Apollo credit${max !== 1 ? 's' : ''} for ${leads.length} lead${leads.length !== 1 ? 's' : ''}`,
  }
}

// ─── Main pipeline ────────────────────────────────────────────────────────────────

export async function findContactForLead(
  lead: Lead,
  onProgress: (phase: ContactFinderPhase, partial: Partial<ContactFinderResult>) => void,
): Promise<ContactFinderResult> {
  console.log(`\n[CF] ═══ START: "${lead.companyName}" ═══`)

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
    companyDomain: extractDomain(lead.companyWebsite),
    companyPhone: null,
    industry: lead.companyIndustry ?? null,
    contactName: null,
    contactTitle: null,
    contactLinkedinUrl: null,
    contactEmail: null,
    emailStatus: null,
    emailSource: null,
    skipReason: null,
    error: null,
    creditsUsed: 0,
    creditsSaved: 0,
    candidateScore: null,
  }

  const report = (phase: ContactFinderPhase) => {
    result.phase = phase
    onProgress(phase, { ...result })
  }

  try {
    // ── NO EARLY SEEK-BASED SKIP ───────────────────────────────────────────
    // Seek employee counts are frequently inaccurate — a company listed as
    // "1,001–5,000" on Seek may actually have 800 employees on LinkedIn, or
    // vice versa. We always resolve via Apollo/LinkedIn before deciding whether
    // to skip. The only size gate is in Phase 2 using the LinkedIn-verified count.
    //
    // We log a note if Seek says very large, just for debugging transparency.
    if (seekCount !== null && seekCount > MAX_COMPANY_SIZE) {
      console.log(
        `[CF] ℹ Seek reports ${seekCount} employees — above limit, but NOT skipping. ` +
        `Will verify via Apollo/LinkedIn first (Seek data is often inaccurate).`,
      )
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 1: COMPANY RESOLUTION
    // ═══════════════════════════════════════════════════════════════════════
    report('finding_company')
    console.log('[CF] Phase 1: Company resolution')

    const { company } = await resolveCompany(lead)

    result.apolloOrgId        = company.apolloOrgId
    result.employeeCount      = company.estimatedNumEmployees ?? seekCount
    result.companyLinkedinUrl = company.linkedinUrl ?? result.companyLinkedinUrl
    result.companyWebsite     = company.websiteUrl  ?? result.companyWebsite
    result.companyDomain      = company.domain      ?? result.companyDomain
    result.companyPhone       = company.phone       // Corporate HQ phone — FREE from org enrichment
    result.industry           = company.industry    ?? result.industry
    result.creditsUsed       += company.creditsUsed
    result.creditsSaved      += company.creditsSaved

    console.log(
      `[CF] Company resolved via "${company.source}" | emp=${result.employeeCount}` +
      ` | domain=${result.companyDomain} | phone=${result.companyPhone ?? 'none'}`,
    )

    // Log if LinkedIn count differs significantly from Seek
    if (
      seekCount !== null &&
      result.employeeCount !== null &&
      Math.abs(seekCount - result.employeeCount) > 50
    ) {
      console.log(
        `[CF] ⚠ Count mismatch: Seek=${seekCount} vs LinkedIn/Apollo=${result.employeeCount}. ` +
        `Using LinkedIn count as source of truth.`,
      )
    }

    report('finding_company')

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 2: SIZE GATE — LinkedIn-verified count only
    // ═══════════════════════════════════════════════════════════════════════
    report('checking_size')
    console.log(`[CF] Phase 2: Size check — ${result.employeeCount ?? 'unknown'} employees (LinkedIn/Apollo)`)

    if (result.employeeCount !== null && result.employeeCount > MAX_COMPANY_SIZE) {
      // Include a note if Seek said something different (useful context for the user)
      let seekNote = ''
      if (seekCount !== null && seekCount !== result.employeeCount) {
        seekNote = seekCount <= MAX_COMPANY_SIZE
          ? ` (Seek showed ${lead.companyEmployeeCount} — LinkedIn count is more accurate)`
          : ` (Seek also showed ${lead.companyEmployeeCount})`
      }

      result.skipReason =
        `${lead.companyName} has ${result.employeeCount.toLocaleString()} employees ` +
        `on LinkedIn${seekNote}. Limit is ${MAX_COMPANY_SIZE.toLocaleString()}.`
      result.phase = 'skipped'
      onProgress('skipped', { ...result })
      return result
    }

    console.log(`[CF] ✓ Size OK — ${result.employeeCount ?? 'unknown'} employees ≤ ${MAX_COMPANY_SIZE.toLocaleString()}`)

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 3: FIND CONTACT — FREE (no credits)
    // Tries priority title groups in order.
    // Uses FREE has_email + has_direct_phone scoring before enriching.
    // ═══════════════════════════════════════════════════════════════════════
    report('finding_contact')
    console.log('[CF] Phase 3: People search (FREE)')

    const groups = getTitleGroupsBySize(result.employeeCount)
    let bestCandidate: ReturnType<typeof pickBestCandidate> = null
    let allCandidatesFromLastGroup: ReturnType<typeof scoreCandidates> = []

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i]
      console.log(`[CF] → Trying group ${i + 1}/${groups.length}: "${group.label}"`)

      try {
        // First pass: filter to people Apollo knows have emails (free filter)
        let people: ApolloPersonSearchResult[] = await searchPeopleByTitles({
          companyName: lead.companyName,
          domain: result.companyDomain,
          organizationId: result.apolloOrgId,
          titles: group.titles,
          seniorities: group.seniorities,
          emailStatusFilter: ['verified', 'likely to engage', 'unverified'],
          maxEmployees: MAX_COMPANY_SIZE,
        })

        // Second pass: if no results with email filter, try without
        if (!people.length) {
          console.log(`[CF]   No results with email filter — trying without`)
          people = await searchPeopleByTitles({
            companyName: lead.companyName,
            domain: result.companyDomain,
            organizationId: result.apolloOrgId,
            titles: group.titles,
            seniorities: group.seniorities,
            maxEmployees: MAX_COMPANY_SIZE,
          })
        }

        if (!people.length) {
          console.log(`[CF]   No people found for group "${group.label}"`)
          continue
        }

        const scored = scoreCandidates(people, lead.companyName)
        console.log(`[CF]   Scored ${scored.length} candidates. Top: "${scored[0]?.person.title}" score=${scored[0]?.score}`)

        // Try to pick best above threshold
        const candidate = pickBestCandidate(scored, 15)
        if (candidate) {
          bestCandidate = candidate
          break
        }

        // Store results from this group in case it's our last option
        allCandidatesFromLastGroup = scored
      } catch (err) {
        console.error(`[CF]   Search error (${group.label}):`, err instanceof Error ? err.message : err)
      }
    }

    // If no candidate above threshold, take best available from last group
    if (!bestCandidate && allCandidatesFromLastGroup.length > 0) {
      console.log('[CF] Taking best candidate despite low score (only option)')
      bestCandidate = allCandidatesFromLastGroup[0]
    }

    if (!bestCandidate) {
      console.log('[CF] ⊗ No contact found on Apollo for this company')
      result.phase = 'done'
      onProgress('done', { ...result })
      return result
    }

    const { person, score } = bestCandidate
    result.contactName        = `${person.firstName} ${person.lastName}`.trim()
    result.contactTitle       = person.title
    result.contactLinkedinUrl = person.linkedinUrl
    result.candidateScore     = score

    console.log(`[CF] ✓ Selected: "${result.contactName}" — "${result.contactTitle}" (score=${score}, hasEmail=${person.hasEmail})`)
    report('finding_contact')

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 4: GET EMAIL (3-attempt waterfall)
    // Attempt A: Apollo by person ID    (1 credit)
    // Attempt B: Apollo by name+domain  (1 credit — only if A failed)
    // Attempt C: Hunter.io fallback     (Hunter quota — not Apollo credits)
    // ═══════════════════════════════════════════════════════════════════════
    report('finding_email')
    console.log('[CF] Phase 4: Email enrichment')

    // Attempt A: Enrich by Apollo person ID — most reliable
    console.log(`[CF] → Attempt A: Apollo enrich by ID (${person.id})`)
    try {
      const enriched = await enrichPersonById(person.id)
      result.creditsUsed += 1

      if (enriched) {
        // Update contact details with enriched data (more complete)
        if (enriched.name?.trim())     result.contactName  = enriched.name
        if (enriched.title?.trim())    result.contactTitle = enriched.title
        if (enriched.linkedinUrl && !result.contactLinkedinUrl) {
          result.contactLinkedinUrl = enriched.linkedinUrl
        }

        if (enriched.email) {
          result.contactEmail = enriched.email
          result.emailStatus  = enriched.emailStatus
          result.emailSource  = 'apollo'
          console.log(`[CF] ✓ Email from Apollo ID: ${enriched.email} [${enriched.emailStatus}]`)
        } else {
          console.log('[CF] ⊗ Apollo ID match returned no email')
        }
      }
    } catch (err) {
      console.error('[CF] Attempt A failed:', err instanceof Error ? err.message : err)
    }

    // Attempt B: Apollo by name + domain (only if no email yet)
    if (!result.contactEmail && result.companyDomain && result.contactName) {
      console.log('[CF] → Attempt B: Apollo name+domain fallback')
      try {
        const parts     = result.contactName.trim().split(/\s+/)
        const firstName = parts[0]
        const lastName  = parts.slice(1).join(' ') || parts[0]

        const enriched = await enrichPersonByNameDomain(
          firstName,
          lastName,
          result.companyDomain,
          lead.companyName,
        )
        result.creditsUsed += 1

        if (enriched?.email) {
          result.contactEmail = enriched.email
          result.emailStatus  = enriched.emailStatus
          result.emailSource  = 'apollo'
          console.log(`[CF] ✓ Email from Apollo name+domain: ${enriched.email}`)
          if (enriched.linkedinUrl && !result.contactLinkedinUrl) {
            result.contactLinkedinUrl = enriched.linkedinUrl
          }
        } else {
          console.log('[CF] ⊗ Apollo name+domain returned no email')
        }
      } catch (err) {
        console.error('[CF] Attempt B failed:', err instanceof Error ? err.message : err)
      }
    }

    // Attempt C: Hunter.io (does not use Apollo credits — uses Hunter quota)
    if (!result.contactEmail && result.companyDomain && result.contactName) {
      console.log('[CF] → Attempt C: Hunter.io fallback')
      try {
        const parts     = result.contactName.trim().split(/\s+/)
        const firstName = parts[0]
        const lastName  = parts.slice(1).join(' ') || parts[0]

        const hunterResult = await findEmail(firstName, lastName, result.companyDomain)

        if (hunterResult?.email) {
          result.contactEmail = hunterResult.email
          result.emailSource  = 'hunter'
          console.log(`[CF] ✓ Email from Hunter: ${hunterResult.email}`)
          if (hunterResult.linkedin && !result.contactLinkedinUrl) {
            result.contactLinkedinUrl = hunterResult.linkedin
          }
        } else {
          console.log('[CF] ⊗ Hunter returned no email')
        }
      } catch (err) {
        console.error('[CF] Attempt C (Hunter) failed:', err instanceof Error ? err.message : err)
      }
    }

    // ─── Done ────────────────────────────────────────────────────────────────
    result.phase = 'done'

    console.log(`[CF] ═══ DONE: "${lead.companyName}"`)
    console.log(`[CF]   Contact  : ${result.contactName ?? 'not found'}`)
    console.log(`[CF]   Title    : ${result.contactTitle ?? 'n/a'}`)
    console.log(`[CF]   LinkedIn : ${result.contactLinkedinUrl ?? 'n/a'}`)
    console.log(`[CF]   Email    : ${result.contactEmail ?? 'not found'} [${result.emailSource ?? 'n/a'}]`)
    console.log(`[CF]   HQ Phone : ${result.companyPhone ?? 'n/a'} (from org enrichment)`)
    console.log(`[CF]   Credits  : ${result.creditsUsed} used, ${result.creditsSaved} saved`)

    onProgress('done', { ...result })
    return result
  } catch (err) {
    console.error('[CF] FATAL ERROR:', err)
    result.error = err instanceof Error ? err.message : 'Unexpected error'
    result.phase = 'error'
    onProgress('error', { ...result })
    return result
  }
}