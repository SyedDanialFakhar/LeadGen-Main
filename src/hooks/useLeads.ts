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

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Lead> }) =>
      updateLead(id, updates),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: [LEADS_KEY] })
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
      invalidate()
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

  // Bulk update for enrichment
  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates: Array<{ id: string; updates: Partial<Lead> }>) => {
      const results = []
      for (const item of updates) {
        const result = await updateLead(item.id, item.updates)
        results.push(result)
      }
      return results
    },
    onSuccess: () => {
      invalidate()
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