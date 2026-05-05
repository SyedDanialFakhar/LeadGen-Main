/**
 * CONTACT FINDER SERVICE — PRODUCTION PIPELINE
 * ─────────────────────────────────────────────────────────────────────────────
 * ARCHITECTURE (layered, not coupled):
 *
 *   Phase 1 – finding_company   companyResolver.ts  → domain/name enrichment
 *   Phase 2 – checking_size     size gate           → skip if >500 employees
 *   Phase 3 – finding_contact   Apollo search (FREE) → contactScorer ranks candidates
 *   Phase 4 – finding_email     Multi-provider waterfall (Apollo ID → name+domain → Hunter)
 *
 * KEY IMPROVEMENTS VS ORIGINAL:
 *   - Contact scorer uses FREE `has_email` data before spending any credits
 *   - Only enriches candidates where Apollo signals email is available
 *   - Multi-attempt email waterfall (ID → name+domain → Hunter)
 *   - Phone captured from Apollo enrichment (direct dial, no webhook needed)
 *   - Proper company resolution separated into its own layer
 *   - Full console logging for every decision
 */

import { resolveCompany, extractDomain, parseEmpCount } from './companyResolver'
import { searchPeopleByTitles, enrichPersonById, enrichPersonByNameDomain } from './apolloApi'
import { scoreCandidates, pickBestCandidate } from './contactScorer'
import { findEmail } from './hunterApi'
import { getTitleGroupsBySize } from '@/utils/contactPicker'
import type { Lead } from '@/types'

export const MAX_COMPANY_SIZE = 500

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ContactFinderPhase =
  | 'idle' | 'finding_company' | 'checking_size'
  | 'finding_contact' | 'finding_email' | 'done' | 'skipped' | 'error'

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
  contactPhone: string | null       // Direct dial/office — from Apollo enrichment
  emailStatus: string | null
  skipReason: string | null
  error: string | null
  emailSource: 'apollo' | 'hunter' | null
  creditsUsed: number
  creditsSaved: number
  candidateScore: number | null     // Score of selected candidate (for transparency)
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

export function estimateCredits(leads: Lead[]): { min: number; max: number; label: string } {
  let min = 0, max = 0

  for (const lead of leads) {
    const seekMax = parseEmpCount(lead.companyEmployeeCount)
    if (seekMax !== null && seekMax > MAX_COMPANY_SIZE) continue

    const hasDomain = !!extractDomain(lead.companyWebsite)
    const hasCount  = lead.companyEmployeeCount != null

    // Org enrichment credit (skippable if we already have domain+count+linkedin)
    if (!hasDomain || !hasCount || !lead.companyLinkedinUrl) { min += 1; max += 1 }

    // Email reveal — only if person found (not guaranteed)
    max += 1
  }

  return {
    min, max,
    label: `${min}–${max} Apollo credit${max !== 1 ? 's' : ''} (${leads.length} lead${leads.length !== 1 ? 's' : ''})`,
  }
}

// ─── Main pipeline ─────────────────────────────────────────────────────────────

export async function findContactForLead(
  lead: Lead,
  onProgress: (phase: ContactFinderPhase, partial: Partial<ContactFinderResult>) => void,
): Promise<ContactFinderResult> {
  console.log(`\n[CF] ═══ START: ${lead.companyName} ═══`)

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
    candidateScore: null,
  }

  const report = (phase: ContactFinderPhase) => {
    result.phase = phase
    onProgress(phase, { ...result })
  }

  try {
    // ── Early skip: Seek already says too large ──────────────────────────────
    if (seekCount !== null && seekCount > MAX_COMPANY_SIZE) {
      console.log(`[CF] ⊗ Early skip — Seek says ${seekCount} employees`)
      result.skipReason = `Seek says ${lead.companyEmployeeCount} employees — over ${MAX_COMPANY_SIZE} limit (1 credit saved)`
      result.creditsSaved = 1
      result.phase = 'skipped'
      onProgress('skipped', { ...result })
      return result
    }

    // ════ PHASE 1: Company Resolution ═════════════════════════════════════
    report('finding_company')
    console.log('[CF] Phase 1: Company resolution')

    const { company } = await resolveCompany(lead)

    result.apolloOrgId        = company.apolloOrgId
    result.employeeCount      = company.estimatedNumEmployees ?? seekCount
    result.companyLinkedinUrl = company.linkedinUrl ?? result.companyLinkedinUrl
    result.companyWebsite     = company.websiteUrl ?? result.companyWebsite
    result.companyDomain      = company.domain ?? result.companyDomain
    result.industry           = company.industry ?? result.industry
    result.creditsUsed       += company.creditsUsed
    result.creditsSaved      += company.creditsSaved

    console.log(`[CF] Company resolved via "${company.source}" | emp=${result.employeeCount} | domain=${result.companyDomain}`)
    report('finding_company')

    // ════ PHASE 2: Size Gate ══════════════════════════════════════════════
    report('checking_size')
    console.log(`[CF] Phase 2: Size check — ${result.employeeCount ?? 'unknown'} employees`)

    if (result.employeeCount !== null && result.employeeCount > MAX_COMPANY_SIZE) {
      const note = seekCount !== null && seekCount !== result.employeeCount
        ? ` (Seek said ${lead.companyEmployeeCount} — LinkedIn data is more accurate)`
        : ''
      result.skipReason = `${lead.companyName} has ${result.employeeCount.toLocaleString()} employees on LinkedIn${note}. Limit is ${MAX_COMPANY_SIZE}.`
      result.phase = 'skipped'
      onProgress('skipped', { ...result })
      return result
    }

    console.log(`[CF] ✓ Size OK (${result.employeeCount ?? 'unknown'} employees)`)

    // ════ PHASE 3: Find Contact (FREE) ═══════════════════════════════════
    report('finding_contact')
    console.log('[CF] Phase 3: People search (free)')

    const groups = getTitleGroupsBySize(result.employeeCount)
    let bestCandidate: ReturnType<typeof pickBestCandidate> = null

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i]
      console.log(`[CF] Trying group ${i + 1}/${groups.length}: "${group.label}"`)

      try {
        // First pass: require email status filter to get pre-qualified candidates
        let people = await searchPeopleByTitles({
          companyName: lead.companyName,
          domain: result.companyDomain,
          organizationId: result.apolloOrgId,
          titles: group.titles,
          seniorities: group.seniorities,
          requireEmail: true,   // only return people Apollo knows have emails
        })

        // If no results with email filter, try without (might still get phone)
        if (!people.length) {
          console.log('[CF] No results with email filter — trying without')
          people = await searchPeopleByTitles({
            companyName: lead.companyName,
            domain: result.companyDomain,
            organizationId: result.apolloOrgId,
            titles: group.titles,
            seniorities: group.seniorities,
            requireEmail: false,
          })
        }

        if (!people.length) {
          console.log(`[CF] No people found for group "${group.label}"`)
          continue
        }

        // Score all candidates using FREE metadata — no credits
        const scored = scoreCandidates(people, lead.companyName)
        console.log(`[CF] Scored ${scored.length} candidates. Top score: ${scored[0]?.score}`)

        // Pick best above threshold
        const candidate = pickBestCandidate(scored, 15)
        if (candidate) {
          bestCandidate = candidate
          break
        }

        // If best didn't meet threshold but it's the last group, take it anyway
        if (i === groups.length - 1 && scored.length > 0) {
          console.log('[CF] Taking best candidate despite low score (last group)')
          bestCandidate = scored[0]
        }
      } catch (err) {
        console.error(`[CF] People search error (${group.label}):`, err instanceof Error ? err.message : err)
      }
    }

    if (!bestCandidate) {
      console.log('[CF] ⊗ No contact found on Apollo')
      result.phase = 'done'
      onProgress('done', { ...result })
      return result
    }

    const { person, score } = bestCandidate
    result.contactName        = `${person.firstName} ${person.lastName}`.trim()
    result.contactTitle       = person.title
    result.contactLinkedinUrl = person.linkedinUrl
    result.candidateScore     = score

    console.log(`[CF] ✓ Selected: "${result.contactName}" — "${result.contactTitle}" (score=${score})`)
    report('finding_contact')

    // ════ PHASE 4: Get Email + Phone ══════════════════════════════════════
    report('finding_email')
    console.log('[CF] Phase 4: Email + phone enrichment')

    // Attempt A: Apollo enrichment by person ID (1 credit — most reliable)
    console.log(`[CF] → Apollo enrich by ID: ${person.id}`)
    try {
      const enriched = await enrichPersonById(person.id)
      result.creditsUsed += 1

      if (enriched) {
        if (enriched.email) {
          result.contactEmail = enriched.email
          result.emailStatus  = enriched.emailStatus
          result.emailSource  = 'apollo'
          console.log(`[CF] ✓ Email (Apollo ID): ${enriched.email} [${enriched.emailStatus}]`)
        }
        if (enriched.phone) {
          result.contactPhone = enriched.phone
          console.log(`[CF] ✓ Phone (Apollo ID): ${enriched.phone}`)
        }
        if (enriched.linkedinUrl && !result.contactLinkedinUrl) {
          result.contactLinkedinUrl = enriched.linkedinUrl
        }
        // Update name from enriched data (more complete)
        if (enriched.name && enriched.name.trim()) result.contactName = enriched.name
        if (enriched.title && enriched.title.trim()) result.contactTitle = enriched.title
      }
    } catch (err) {
      console.error('[CF] Apollo ID enrich failed:', err instanceof Error ? err.message : err)
    }

    // Attempt B: Apollo by name + domain (1 credit — only if no email yet)
    if (!result.contactEmail && result.companyDomain && result.contactName) {
      console.log('[CF] → Apollo name+domain fallback')
      try {
        const parts = result.contactName.trim().split(/\s+/)
        const enriched = await enrichPersonByNameDomain(
          parts[0],
          parts.slice(1).join(' ') || parts[0],
          result.companyDomain,
          lead.companyName,
        )
        result.creditsUsed += 1

        if (enriched) {
          if (enriched.email) {
            result.contactEmail = enriched.email
            result.emailStatus  = enriched.emailStatus
            result.emailSource  = 'apollo'
            console.log(`[CF] ✓ Email (Apollo name+domain): ${enriched.email}`)
          }
          if (enriched.phone && !result.contactPhone) {
            result.contactPhone = enriched.phone
            console.log(`[CF] ✓ Phone (Apollo name+domain): ${enriched.phone}`)
          }
        }
      } catch (err) {
        console.error('[CF] Apollo name+domain failed:', err instanceof Error ? err.message : err)
      }
    }

    // Attempt C: Hunter.io fallback (no Apollo credits — uses Hunter quota)
    if (!result.contactEmail && result.companyDomain && result.contactName) {
      console.log('[CF] → Hunter.io fallback')
      try {
        const parts = result.contactName.trim().split(/\s+/)
        const hunterResult = await findEmail(
          parts[0],
          parts.slice(1).join(' ') || parts[0],
          result.companyDomain,
        )
        if (hunterResult?.email) {
          result.contactEmail = hunterResult.email
          result.emailSource  = 'hunter'
          console.log(`[CF] ✓ Email (Hunter): ${hunterResult.email}`)
          if (hunterResult.linkedin && !result.contactLinkedinUrl) {
            result.contactLinkedinUrl = hunterResult.linkedin
          }
        } else {
          console.log('[CF] ⊗ Hunter: no email found')
        }
      } catch (err) {
        console.error('[CF] Hunter failed:', err instanceof Error ? err.message : err)
      }
    }

    result.phase = 'done'
    console.log(`[CF] ═══ DONE: ${lead.companyName}`)
    console.log(`[CF]   Contact : ${result.contactName ?? 'none'}`)
    console.log(`[CF]   Title   : ${result.contactTitle ?? 'none'}`)
    console.log(`[CF]   Email   : ${result.contactEmail ?? 'none'} [${result.emailSource ?? 'n/a'}]`)
    console.log(`[CF]   Phone   : ${result.contactPhone ?? 'none'}`)
    console.log(`[CF]   Credits : ${result.creditsUsed} used, ${result.creditsSaved} saved`)

    onProgress('done', { ...result })
    return result
  } catch (err) {
    console.error('[CF] FATAL ERROR:', err)
    result.error = err instanceof Error ? err.message : 'Unexpected error occurred'
    result.phase = 'error'
    onProgress('error', { ...result })
    return result
  }
}