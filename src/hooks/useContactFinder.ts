// src/hooks/useContactFinder.ts
import { useState, useCallback, useRef } from 'react'
import type { Lead } from '@/types'
import {
  findContactForLead,
  type ContactFinderResult,
  type ContactFinderPhase,
} from '@/services/contactFinderService'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface LeadFinderEntry {
  lead: Lead
  result: ContactFinderResult
}

export interface ContactFinderState {
  entries: LeadFinderEntry[]
  activeIndex: number
  activePhase: ContactFinderPhase
  isRunning: boolean
  isDone: boolean
}

// ─── Initial result factory ───────────────────────────────────────────────────

function makeInitialResult(lead: Lead): ContactFinderResult {
  return {
    leadId: lead.id,
    companyName: lead.companyName,
    phase: 'idle',
    employeeCount: null,
    companyLinkedinUrl: lead.companyLinkedinUrl ?? null,
    companyWebsite: lead.companyWebsite ?? null,
    companyDomain: null,
    contactName: null,
    contactTitle: null,
    contactLinkedinUrl: null,
    contactEmail: null,
    skipReason: null,
    error: null,
    emailSource: null,
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useContactFinder() {
  const [state, setState] = useState<ContactFinderState>({
    entries: [],
    activeIndex: -1,
    activePhase: 'idle',
    isRunning: false,
    isDone: false,
  })

  // Use a ref so the abort flag doesn't cause re-renders
  const abortRef = useRef(false)

  const runForLeads = useCallback(async (leads: Lead[]) => {
    if (!leads.length) return
    abortRef.current = false

    // Set up initial state with placeholder results
    setState({
      entries: leads.map(lead => ({
        lead,
        result: makeInitialResult(lead),
      })),
      activeIndex: 0,
      activePhase: 'idle',
      isRunning: true,
      isDone: false,
    })

    for (let i = 0; i < leads.length; i++) {
      if (abortRef.current) break

      const lead = leads[i]

      const finalResult = await findContactForLead(
        lead,
        (phase, partial) => {
          if (abortRef.current) return
          setState(prev => {
            const updated = [...prev.entries]
            updated[i] = {
              ...updated[i],
              result: { ...updated[i].result, ...partial, phase },
            }
            return {
              ...prev,
              entries: updated,
              activeIndex: i,
              activePhase: phase,
            }
          })
        }
      )

      if (abortRef.current) break

      // Commit the final result for this lead
      setState(prev => {
        const updated = [...prev.entries]
        updated[i] = { ...updated[i], result: finalResult }
        return { ...prev, entries: updated }
      })

      // Respect Apollo / Hunter rate limits between leads
      if (i < leads.length - 1) {
        await new Promise(r => setTimeout(r, 700))
      }
    }

    setState(prev => ({
      ...prev,
      isRunning: false,
      isDone: true,
      activePhase: 'done',
    }))
  }, [])

  /** Stop after the current lead finishes */
  const stop = useCallback(() => {
    abortRef.current = true
  }, [])

  /** Reset everything back to empty state */
  const reset = useCallback(() => {
    abortRef.current = false
    setState({
      entries: [],
      activeIndex: -1,
      activePhase: 'idle',
      isRunning: false,
      isDone: false,
    })
  }, [])

  return { ...state, runForLeads, stop, reset }
}