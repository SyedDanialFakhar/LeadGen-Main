// src/services/leadsService.ts

import { supabase } from '@/lib/supabaseClient'
import type { Lead, NewLead, LeadFilters, LeadStats, LeadStatus } from '@/types'
import { dbRowToLead, newLeadToDbRow, leadUpdatesToDbRow } from '@/utils/mappers'
import { leadsToCSV, downloadCSV } from '@/utils/csvExport'
import { getTodayISO } from '@/utils/dateUtils'

// Helper function to build city filter with substring matching
function buildCityFilter(query: any, city: string | undefined) {
  if (!city || city === 'all') return query
  
  // Use ilike with wildcards to match any location containing the city name
  // This handles "Arndell Park, Sydney NSW" matching "Sydney"
  return query.ilike('city', `%${city}%`)
}

export async function getLeads(filters?: LeadFilters): Promise<Lead[]> {
  let query = supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.platform && filters.platform !== 'all') {
    query = query.eq('platform', filters.platform)
  }
  
  // UPDATED: City filter now uses substring matching
  if (filters?.city && filters.city !== 'all') {
    query = buildCityFilter(query, filters.city)
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
  const rows = leads.map(newLeadToDbRow)

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

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .update({
      status: 'deleted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(`Failed to delete lead: ${error.message}`)
}

export async function getLeadStats(): Promise<LeadStats> {
  const { data, error } = await supabase
    .from('leads')
    .select('status, enrichment_status, follow_up_required, created_at')

  if (error) throw new Error(`Failed to fetch stats: ${error.message}`)

  const today = getTodayISO()
  const leads = data ?? []

  return {
    total: leads.filter((l) => l.status !== 'deleted').length,
    newToday: leads.filter(
      (l) => l.created_at?.startsWith(today) && l.status === 'new'
    ).length,
    awaitingEnrichment: leads.filter(
      (l) => l.enrichment_status === 'pending' && l.status !== 'deleted'
    ).length,
    followUpNeeded: leads.filter(
      (l) => l.follow_up_required === true && l.status !== 'deleted'
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
    .neq('status', 'deleted')
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
    .neq('status', 'deleted')
    .not('contact_email', 'is', null)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch follow-up leads: ${error.message}`)

  return (data ?? []).map(dbRowToLead)
}