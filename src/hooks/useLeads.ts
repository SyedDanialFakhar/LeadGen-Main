// src/hooks/useLeads.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { LeadFilters, LeadStatus, Lead } from '@/types'
import {
  getLeads,
  getLead,
  createLeads,
  updateLead,
  deleteLead,
  bulkUpdateStatus,
  getLeadStats,
  exportLeadsToCSV,
} from '@/services/leadsService'
import { useToast } from './useToast'

const LEADS_KEY = 'leads'
const STATS_KEY = 'lead-stats'

export function useLeads(filters?: LeadFilters) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const leadsQuery = useQuery({
    queryKey: [LEADS_KEY, filters],
    queryFn: () => getLeads(filters),
  })

  const statsQuery = useQuery({
    queryKey: [STATS_KEY],
    queryFn: getLeadStats,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [LEADS_KEY] })
    queryClient.invalidateQueries({ queryKey: [STATS_KEY] })
  }

  // Helper to get the current query key (handles filter reference issues)
  const getCurrentQueryKey = () => {
    // Get all queries that start with [LEADS_KEY]
    const allQueries = queryClient.getQueryCache().getAll()
    const leadsQueryKey = allQueries.find(q => 
      q.queryKey[0] === LEADS_KEY && Array.isArray(q.queryKey[1])
    )?.queryKey
    return leadsQueryKey || [LEADS_KEY, filters]
  }

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Lead> }) =>
      updateLead(id, updates),
    onSuccess: (updatedLead, variables) => {
      // Method 1: Update all leads queries in the cache
      queryClient.setQueriesData(
        { queryKey: [LEADS_KEY], exact: false },
        (oldData: Lead[] | undefined) => {
          if (!oldData) return oldData
          return oldData.map(lead => 
            lead.id === variables.id ? { ...lead, ...variables.updates } : lead
          )
        }
      )
      showToast('Lead updated successfully', 'success')
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      invalidate()
      showToast('Lead deleted successfully', 'success')
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  })

  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: LeadStatus }) =>
      bulkUpdateStatus(ids, status),
    onSuccess: (_, variables) => {
      // Update all leads queries in the cache
      queryClient.setQueriesData(
        { queryKey: [LEADS_KEY], exact: false },
        (oldData: Lead[] | undefined) => {
          if (!oldData) return oldData
          return oldData.map(lead => 
            variables.ids.includes(lead.id) ? { ...lead, status: variables.status } : lead
          )
        }
      )
      showToast(`${variables.ids.length} lead(s) marked as ${variables.status}`, 'success')
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  })

  const createMutation = useMutation({
    mutationFn: createLeads,
    onSuccess: (created, variables) => {
      invalidate()
      const newCount = created?.length || 0
      const totalCount = variables.length
      const duplicateCount = totalCount - newCount
      
      if (duplicateCount > 0 && newCount > 0) {
        showToast(
          `${newCount} new lead(s) added. ${duplicateCount} duplicate(s) skipped.`,
          'success'
        )
      } else if (duplicateCount > 0 && newCount === 0) {
        showToast(
          `All ${duplicateCount} lead(s) already exist. Nothing added.`,
          'info'
        )
      } else if (newCount > 0) {
        showToast(`${newCount} lead(s) added`, 'success')
      }
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  })

  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates: Array<{ id: string; updates: Partial<Lead> }>) => {
      const results = []
      for (const item of updates) {
        const result = await updateLead(item.id, item.updates)
        results.push(result)
      }
      return results
    },
    onSuccess: (results) => {
      // Update all leads queries in the cache
      const updatedMap = new Map(results.map(r => [r.id, r]))
      queryClient.setQueriesData(
        { queryKey: [LEADS_KEY], exact: false },
        (oldData: Lead[] | undefined) => {
          if (!oldData) return oldData
          return oldData.map(lead => 
            updatedMap.has(lead.id) ? { ...lead, ...updatedMap.get(lead.id) } : lead
          )
        }
      )
      showToast('Leads enriched successfully', 'success')
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  })

  return {
    leads: leadsQuery.data ?? [],
    isLoading: leadsQuery.isLoading,
    error: leadsQuery.error,
    stats: statsQuery.data,
    statsLoading: statsQuery.isLoading,
    updateLead: updateMutation.mutate,
    deleteLead: deleteMutation.mutate,
    bulkUpdateStatus: bulkStatusMutation.mutate,
    bulkUpdate: bulkUpdateMutation.mutate,
    createLeads: createMutation.mutate,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isCreating: createMutation.isPending,
    isBulkUpdating: bulkUpdateMutation.isPending,
    exportToCSV: () => exportLeadsToCSV(filters),
    getLead,
  }
}