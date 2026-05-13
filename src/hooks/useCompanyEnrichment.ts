// src/hooks/useCompanyEnrichment.ts
import { useState, useCallback, useRef } from 'react'
import type { Lead } from '@/types'
import {
  searchLinkedInCompany,
  type LinkedInCompanyMatch,
} from '@/services/linkedinCompanySearch'

export type CompanyEnrichPhase = 'idle' | 'searching' | 'done' | 'error' | 'skipped'

export interface CompanyEnrichEntry {
  lead: Lead
  phase: CompanyEnrichPhase
  match: LinkedInCompanyMatch | null
  error: string | null
  accepted: boolean
}

export interface CompanyEnrichState {
  entries: CompanyEnrichEntry[]
  activeIndex: number
  isRunning: boolean
  isDone: boolean
}

export function useCompanyEnrichment() {
  const [state, setState] = useState<CompanyEnrichState>({
    entries:     [],
    activeIndex: -1,
    isRunning:   false,
    isDone:      false,
  })

  const abortRef = useRef(false)

  const runForLeads = useCallback(async (leads: Lead[]) => {
    if (!leads.length) return
    abortRef.current = false

    // Initialize entries
    const initial: CompanyEnrichEntry[] = leads.map(lead => ({
      lead,
      phase:    'idle',
      match:    null,
      error:    null,
      accepted: false,
    }))

    setState({ entries: initial, activeIndex: 0, isRunning: true, isDone: false })

    for (let i = 0; i < leads.length; i++) {
      if (abortRef.current) break

      const lead = leads[i]

      // Set this entry as 'searching'
      setState(prev => {
        const updated = [...prev.entries]
        updated[i] = { ...updated[i], phase: 'searching' }
        return { ...prev, entries: updated, activeIndex: i }
      })

      try {
        const match = await searchLinkedInCompany(lead.companyName, lead.city)

        if (abortRef.current) break

        setState(prev => {
          const updated = [...prev.entries]
          updated[i] = {
            ...updated[i],
            phase:    'done',
            match,
            accepted: !!match, // auto-accept if found
          }
          return { ...prev, entries: updated }
        })
      } catch (err) {
        if (abortRef.current) break

        const error = err instanceof Error ? err.message : 'Unexpected error'
        setState(prev => {
          const updated = [...prev.entries]
          updated[i] = { ...updated[i], phase: 'error', error }
          return { ...prev, entries: updated }
        })
      }

      // Small throttle between leads
      if (i < leads.length - 1 && !abortRef.current) {
        await new Promise(r => setTimeout(r, 800))
      }
    }

    setState(prev => ({ ...prev, isRunning: false, isDone: true, activeIndex: -1 }))
  }, [])

  const toggleAccepted = useCallback((leadId: string) => {
    setState(prev => ({
      ...prev,
      entries: prev.entries.map(e =>
        e.lead.id === leadId ? { ...e, accepted: !e.accepted } : e,
      ),
    }))
  }, [])

  const acceptAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      entries: prev.entries.map(e => ({ ...e, accepted: !!e.match })),
    }))
  }, [])

  const skipAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      entries: prev.entries.map(e => ({ ...e, accepted: false })),
    }))
  }, [])

  const stop = useCallback(() => {
    abortRef.current = true
  }, [])

  const reset = useCallback(() => {
    abortRef.current = false
    setState({ entries: [], activeIndex: -1, isRunning: false, isDone: false })
  }, [])

  const acceptedCount = state.entries.filter(e => e.accepted).length
  const foundCount    = state.entries.filter(e => e.match).length
  const errorCount    = state.entries.filter(e => e.phase === 'error').length
  const completedCount = state.entries.filter(e => !['idle', 'searching'].includes(e.phase)).length

  return {
    ...state,
    acceptedCount,
    foundCount,
    errorCount,
    completedCount,
    runForLeads,
    toggleAccepted,
    acceptAll,
    skipAll,
    stop,
    reset,
  }
}