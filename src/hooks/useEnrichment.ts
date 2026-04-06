// src/hooks/useEnrichment.ts
import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Lead, EnrichmentResult } from '@/types'
import { getPendingEnrichmentLeads, updateLead } from '@/services/leadsService'
import { findEmail, getHunterCredits } from '@/services/hunterApi'
import { searchPeople } from '@/services/apolloApi'
import { extractDomain } from '@/utils/filterUtils'
import { useToast } from './useToast'

const PENDING_KEY = 'pending-enrichment'
const HUNTER_CREDITS_KEY = 'hunter-credits'

export function useEnrichment() {
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [enrichingId, setEnrichingId] = useState<string | null>(null)

  const pendingQuery = useQuery({
    queryKey: [PENDING_KEY],
    queryFn: getPendingEnrichmentLeads,
  })

  const hunterCreditsQuery = useQuery({
    queryKey: [HUNTER_CREDITS_KEY],
    queryFn: getHunterCredits,
    staleTime: 1000 * 60 * 10,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [PENDING_KEY] })
    queryClient.invalidateQueries({ queryKey: ['leads'] })
    queryClient.invalidateQueries({ queryKey: [HUNTER_CREDITS_KEY] })
  }

  const enrichWithHunter = useCallback(
    async (lead: Lead): Promise<EnrichmentResult | null> => {
      if (!lead.contactName) {
        showToast('No contact name — cannot search Hunter', 'warning')
        return null
      }
      if (!lead.companyWebsite && !lead.companyName) {
        showToast('No company domain or website', 'warning')
        return null
      }

      const parts = lead.contactName.trim().split(' ')
      const firstName = parts[0]
      const lastName = parts.slice(1).join(' ') || parts[0]
      const domain =
        extractDomain(lead.companyWebsite) ??
        lead.companyName.toLowerCase().replace(/\s+/g, '') + '.com.au'

      try {
        const result = await findEmail(firstName, lastName, domain)
        if (!result) return null

        return {
          contactName: lead.contactName,
          contactJobTitle: lead.contactJobTitle,
          contactEmail: result.email,
          contactPhone: null,
          contactLinkedinUrl: result.linkedin,
          source: 'hunter',
          confidence: result.score,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Hunter error'
        showToast(message, 'error')
        return null
      }
    },
    [showToast]
  )

  const enrichWithApollo = useCallback(
    async (lead: Lead): Promise<EnrichmentResult | null> => {
      try {
        const results = await searchPeople({
          name: lead.contactName ?? undefined,
          company: lead.companyName,
          title: lead.contactJobTitle ?? undefined,
          location: lead.city,
        })

        if (!results.length) return null

        const top = results[0]
        return {
          contactName: top.name,
          contactJobTitle: top.title,
          contactEmail: top.email,
          contactPhone: top.phone,
          contactLinkedinUrl: top.linkedinUrl,
          source: 'apollo',
          confidence: 80,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Apollo error'
        showToast(message, 'error')
        return null
      }
    },
    [showToast]
  )

  const applyEnrichment = useCallback(
    async (lead: Lead, result: EnrichmentResult) => {
      await updateLead(lead.id, {
        contactName: result.contactName ?? lead.contactName,
        contactJobTitle: result.contactJobTitle ?? lead.contactJobTitle,
        contactEmail: result.contactEmail,
        contactPhone: result.contactPhone,
        contactLinkedinUrl: result.contactLinkedinUrl,
        enrichmentStatus: 'enriched',
      })
      invalidate()
      showToast('Contact enriched successfully', 'success')
    },
    [showToast]
  )

  const enrichLead = useCallback(
    async (lead: Lead, source: 'hunter' | 'apollo') => {
      setEnrichingId(lead.id)
      try {
        const result =
          source === 'hunter'
            ? await enrichWithHunter(lead)
            : await enrichWithApollo(lead)

        if (result) {
          await applyEnrichment(lead, result)
        } else {
          showToast('No contact details found', 'warning')
        }
      } finally {
        setEnrichingId(null)
      }
    },
    [enrichWithHunter, enrichWithApollo, applyEnrichment, showToast]
  )

  const skipLead = useCallback(
    async (lead: Lead) => {
      await updateLead(lead.id, { enrichmentStatus: 'not_found' })
      invalidate()
      showToast('Lead skipped', 'info')
    },
    [showToast]
  )

  const enrichAll = useCallback(async () => {
    const pending = pendingQuery.data ?? []
    let enriched = 0

    for (const lead of pending) {
      if (!lead.contactName) continue
      setEnrichingId(lead.id)
      const result = await enrichWithHunter(lead)
      if (result) {
        await applyEnrichment(lead, result)
        enriched++
      }
      await new Promise((r) => setTimeout(r, 800))
    }

    setEnrichingId(null)
    showToast(`Enriched ${enriched} leads`, 'success')
  }, [pendingQuery.data, enrichWithHunter, applyEnrichment, showToast])

  return {
    pendingLeads: pendingQuery.data ?? [],
    isLoading: pendingQuery.isLoading,
    enrichingId,
    enrichLead,
    skipLead,
    enrichAll,
    hunterCredits: hunterCreditsQuery.data ?? { used: 0, total: 25 },
  }
}