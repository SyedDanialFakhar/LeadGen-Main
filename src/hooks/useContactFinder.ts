// src/hooks/useContactFinder.ts
import { useState, useCallback, useRef } from 'react'
import type { Lead } from '@/types'
import {
  findContactForLead,
  type ContactFinderResult,
  type ContactFinderPhase,
} from '@/services/contactFinderService'

export interface LeadFinderEntry {
  lead: Lead
  result: ContactFinderResult
}

export interface ContactFinderState {
  entries: LeadFinderEntry[]
  activeIndex: number
  isRunning: boolean
  isDone: boolean
  totalCreditsUsed: number
  totalCreditsSaved: number
}

function makeInitialResult(lead: Lead): ContactFinderResult {
  return {
    leadId:             lead.id,
    companyName:        lead.companyName,
    phase:              'idle',
    apolloOrgId:        null,
    employeeCount:      null,
    seekEmployeeCount:  lead.companyEmployeeCount ?? null,
    companyLinkedinUrl: lead.companyLinkedinUrl ?? null,
    companyWebsite:     lead.companyWebsite ?? null,
    companyDomain:      null,
    industry:           null,
    contactName:        null,
    contactTitle:       null,
    contactLinkedinUrl: null,
    contactEmail:       null,
    emailStatus:        null,
    skipReason:         null,
    error:              null,
    emailSource:        null,
    creditsUsed:        0,
    creditsSaved:       0,
    companyPhone:       null,        // Added missing property
    candidateScore:     0,           // Added missing property
  }
}

export function useContactFinder() {
  const [state, setState] = useState<ContactFinderState>({
    entries:           [],
    activeIndex:       -1,
    isRunning:         false,
    isDone:            false,
    totalCreditsUsed:  0,
    totalCreditsSaved: 0,
  })

  const abortRef = useRef(false)

  const runForLeads = useCallback(async (leads: Lead[]) => {
    if (!leads.length) return
    abortRef.current = false

    setState({
      entries:           leads.map(lead => ({ lead, result: makeInitialResult(lead) })),
      activeIndex:       0,
      isRunning:         true,
      isDone:            false,
      totalCreditsUsed:  0,
      totalCreditsSaved: 0,
    })

    let totalCredits = 0
    let totalSaved   = 0

    for (let i = 0; i < leads.length; i++) {
      if (abortRef.current) break

      const finalResult = await findContactForLead(leads[i], (phase, partial) => {
        if (abortRef.current) return
        setState(prev => {
          const updated = [...prev.entries]
          updated[i] = { ...updated[i], result: { ...updated[i].result, ...partial, phase } }
          return { ...prev, entries: updated, activeIndex: i }
        })
      })

      if (abortRef.current) break

      totalCredits += finalResult.creditsUsed
      totalSaved   += finalResult.creditsSaved

      setState(prev => {
        const updated = [...prev.entries]
        updated[i] = { ...updated[i], result: finalResult }
        return { ...prev, entries: updated, totalCreditsUsed: totalCredits, totalCreditsSaved: totalSaved }
      })

      // Throttle between leads — Apollo rate limit on free tier
      if (i < leads.length - 1) await new Promise(r => setTimeout(r, 900))
    }

    setState(prev => ({ ...prev, isRunning: false, isDone: true }))
  }, [])

  const stop = useCallback(() => { abortRef.current = true }, [])

  const reset = useCallback(() => {
    abortRef.current = false
    setState({ entries: [], activeIndex: -1, isRunning: false, isDone: false, totalCreditsUsed: 0, totalCreditsSaved: 0 })
  }, [])

  return { ...state, runForLeads, stop, reset }
}