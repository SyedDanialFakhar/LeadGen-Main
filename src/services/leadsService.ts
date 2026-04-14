// src/services/leadsService.ts

import { supabase } from '@/lib/supabaseClient'
import type { Lead, NewLead, LeadFilters, LeadStats, LeadStatus } from '@/types'
import { dbRowToLead, newLeadToDbRow, leadUpdatesToDbRow } from '@/utils/mappers'
import { leadsToCSV, downloadCSV } from '@/utils/csvExport'
import { getTodayISO } from '@/utils/dateUtils'

export async function getLeads(filters?: LeadFilters): Promise<Lead[]> {
  let query = supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.platform && filters.platform !== 'all') {
    query = query.eq('platform', filters.platform)
  }
  
  if (filters?.city && filters.city !== 'all') {
    query = query.ilike('city', `%${filters.city}%`)
  }
  
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }
  
  if (filters?.enrichmentStatus && filters.enrichmentStatus !== 'all') {
    query = query.eq('enrichment_status', filters.enrichmentStatus)
  }
  
  if (filters?.followUpOnly) {
    query = query.eq('follow_up_required', true)
  }
  
  if (filters?.dateFrom) {
    query = query.gte('date_posted', filters.dateFrom)
  }
  
  if (filters?.dateTo) {
    query = query.lte('date_posted', filters.dateTo)
  }
  
  if (filters?.search) {
    query = query.or(
      `company_name.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%,job_title.ilike.%${filters.search}%`
    )
  }
  
  if (filters?.matchAssessment && filters.matchAssessment !== 'all') {
    if (filters.matchAssessment === 'null') {
      query = query.is('match_assessment', null)
    } else {
      query = query.eq('match_assessment', filters.matchAssessment)
    }
  }
  
  // Response filter - now using the dedicated column
  if (filters?.response && filters.response !== 'all') {
    query = query.eq('response', filters.response)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to fetch leads: ${error.message}`)

  return (data ?? []).map(dbRowToLead)
}

export async function getLead(id: string): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(`Failed to fetch lead: ${error.message}`)

  return dbRowToLead(data)
}

export async function createLeads(leads: NewLead[]): Promise<Lead[]> {
  if (leads.length === 0) return []
  
  const jobUrls = leads.map(lead => lead.jobAdUrl)
  
  const { data: existingLeads, error: fetchError } = await supabase
    .from('leads')
    .select('job_ad_url')
    .in('job_ad_url', jobUrls)
  
  if (fetchError) throw new Error(`Failed to check existing leads: ${fetchError.message}`)
  
  const existingUrls = new Set(existingLeads?.map(lead => lead.job_ad_url) || [])
  
  const newLeadsToInsert = leads.filter(lead => !existingUrls.has(lead.jobAdUrl))
  const duplicateCount = leads.length - newLeadsToInsert.length
  
  if (duplicateCount > 0) {
    console.log(`Skipping ${duplicateCount} duplicate lead(s) - already in database`)
  }
  
  if (newLeadsToInsert.length === 0) {
    console.log('All leads already exist, nothing to insert')
    return []
  }
  
  const rows = newLeadsToInsert.map(newLeadToDbRow)
  const now = new Date().toISOString()
  rows.forEach(row => {
    row.created_at = now
    row.updated_at = now
  })
  
  const { data, error } = await supabase
    .from('leads')
    .insert(rows)
    .select()
  
  if (error) throw new Error(`Failed to create leads: ${error.message}`)
  
  return (data ?? []).map(dbRowToLead)
}

export async function updateLead(
  id: string,
  updates: Partial<Lead>
): Promise<Lead> {
  const dbRow = leadUpdatesToDbRow(updates)

  const { data, error } = await supabase
    .from('leads')
    .update(dbRow)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update lead: ${error.message}`)

  return dbRowToLead(data)
}

export async function bulkUpdateStatus(
  ids: string[],
  status: LeadStatus
): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .in('id', ids)

  if (error) throw new Error(`Failed to bulk update status: ${error.message}`)
}

// Permanently delete the lead
export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete lead: ${error.message}`)
}

// Bulk update response for multiple leads
export async function bulkUpdateResponse(
  ids: string[],
  response: string
): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .update({
      response,
      updated_at: new Date().toISOString(),
    })
    .in('id', ids)

  if (error) throw new Error(`Failed to bulk update response: ${error.message}`)
}

export async function getLeadStats(): Promise<LeadStats> {
  const { data, error } = await supabase
    .from('leads')
    .select('status, enrichment_status, follow_up_required, created_at, response')

  if (error) throw new Error(`Failed to fetch stats: ${error.message}`)

  const today = getTodayISO()
  const leads = data ?? []

  return {
    total: leads.length,
    newToday: leads.filter(
      (l) => l.created_at?.startsWith(today) && l.status === 'Not Sent'
    ).length,
    awaitingEnrichment: leads.filter(
      (l) => l.enrichment_status === 'pending'
    ).length,
    followUpNeeded: leads.filter(
      (l) => l.follow_up_required === true
    ).length,
    converted: leads.filter((l) => l.status === 'converted').length,
    called: leads.filter((l) => l.status === 'called').length,
  }
}

export async function exportLeadsToCSV(filters?: LeadFilters): Promise<void> {
  const leads = await getLeads(filters)
  const csv = leadsToCSV(leads)
  const filename = `leadflow-export-${getTodayISO()}.csv`
  downloadCSV(csv, filename)
}

export async function getPendingEnrichmentLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('enrichment_status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch pending leads: ${error.message}`)

  return (data ?? []).map(dbRowToLead)
}

export async function getFollowUpLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('follow_up_required', true)
    .eq('email_sent', false)
    .not('contact_email', 'is', null)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch follow-up leads: ${error.message}`)

  return (data ?? []).map(dbRowToLead)
}