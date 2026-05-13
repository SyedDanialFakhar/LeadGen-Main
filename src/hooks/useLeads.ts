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
  bulkUpdateResponse,
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
    queryFn:  () => getLeads(filters),
    // Keep previous data while refetching to avoid flicker
    placeholderData: (prev) => prev,
  })

  const statsQuery = useQuery({
    queryKey:           [STATS_KEY],
    queryFn:            getLeadStats,
    staleTime:          0,
    refetchOnMount:     true,
    refetchOnWindowFocus: true,
  })

  const invalidateStats = () =>
    queryClient.invalidateQueries({ queryKey: [STATS_KEY] })

  // Patch ALL leads caches in-place (preserves row order)
  const patchLeadsInCache = (id: string, updates: Partial<Lead>) => {
    queryClient.setQueriesData(
      { queryKey: [LEADS_KEY], exact: false },
      (oldData: Lead[] | undefined) => {
        if (!oldData) return oldData
        return oldData.map(lead =>
          lead.id === id ? { ...lead, ...updates } : lead,
        )
      },
    )
  }

  // ── Update single lead — patches in-place, no position change ──────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Lead> }) =>
      updateLead(id, updates),
    // Optimistic update — instant UI, no position shift
    onMutate: async ({ id, updates }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: [LEADS_KEY] })
      // Snapshot previous values for rollback
      const snapshot = queryClient.getQueriesData<Lead[]>({ queryKey: [LEADS_KEY] })
      patchLeadsInCache(id, updates)
      return { snapshot }
    },
    onSuccess: (updatedLead, { id, updates }) => {
      // Confirm optimistic update with server data
      patchLeadsInCache(id, updatedLead)
      invalidateStats()
    },
    onError: (err: Error, _, context) => {
      // Roll back optimistic update on error
      if (context?.snapshot) {
        context.snapshot.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      showToast(err.message, 'error')
    },
  })

  // ── Delete — remove from cache without refetch (avoids reorder) ────────────
  const deleteMutation = useMutation({
    mutationFn: deleteLead,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: [LEADS_KEY] })
      const snapshot = queryClient.getQueriesData<Lead[]>({ queryKey: [LEADS_KEY] })
      // Remove from all caches immediately
      queryClient.setQueriesData(
        { queryKey: [LEADS_KEY], exact: false },
        (oldData: Lead[] | undefined) =>
          oldData ? oldData.filter(l => l.id !== id) : oldData,
      )
      return { snapshot }
    },
    onSuccess: () => {
      invalidateStats()
      showToast('Lead deleted successfully', 'success')
    },
    onError: (err: Error, _, context) => {
      if (context?.snapshot) {
        context.snapshot.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      showToast(err.message, 'error')
    },
  })

  // ── Bulk status — patch in-place ───────────────────────────────────────────
  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: LeadStatus }) =>
      bulkUpdateStatus(ids, status),
    onMutate: async ({ ids, status }) => {
      await queryClient.cancelQueries({ queryKey: [LEADS_KEY] })
      const snapshot = queryClient.getQueriesData<Lead[]>({ queryKey: [LEADS_KEY] })
      queryClient.setQueriesData(
        { queryKey: [LEADS_KEY], exact: false },
        (oldData: Lead[] | undefined) => {
          if (!oldData) return oldData
          return oldData.map(lead =>
            ids.includes(lead.id) ? { ...lead, status } : lead,
          )
        },
      )
      return { snapshot }
    },
    onSuccess: (_, { ids, status }) => {
      invalidateStats()
      showToast(`${ids.length} lead(s) marked as ${status}`, 'success')
    },
    onError: (err: Error, _, context) => {
      if (context?.snapshot) {
        context.snapshot.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      showToast(err.message, 'error')
    },
  })

  // ── Bulk response — patch in-place ─────────────────────────────────────────
  const bulkResponseMutation = useMutation({
    mutationFn: ({ ids, response }: { ids: string[]; response: 'positive' | 'negative' | null }) =>
      bulkUpdateResponse(ids, response),
    onMutate: async ({ ids, response }) => {
      await queryClient.cancelQueries({ queryKey: [LEADS_KEY] })
      const snapshot = queryClient.getQueriesData<Lead[]>({ queryKey: [LEADS_KEY] })
      queryClient.setQueriesData(
        { queryKey: [LEADS_KEY], exact: false },
        (oldData: Lead[] | undefined) => {
          if (!oldData) return oldData
          return oldData.map(lead =>
            ids.includes(lead.id) ? { ...lead, response } : lead,
          )
        },
      )
      return { snapshot }
    },
    onSuccess: (_, { ids, response }) => {
      invalidateStats()
      const label =
        response === 'positive' ? 'Positive' :
        response === 'negative' ? 'Negative' : 'No Response'
      showToast(`${ids.length} lead(s) marked as ${label}`, 'success')
    },
    onError: (err: Error, _, context) => {
      if (context?.snapshot) {
        context.snapshot.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      showToast(err.message, 'error')
    },
  })

  // ── Create — new leads prepended so they appear at top ─────────────────────
  const createMutation = useMutation({
    mutationFn: createLeads,
    onSuccess: (created, variables) => {
      // Prepend new leads to all caches
      if (created?.length) {
        queryClient.setQueriesData(
          { queryKey: [LEADS_KEY], exact: false },
          (oldData: Lead[] | undefined) =>
            oldData ? [...created, ...oldData] : created,
        )
      }
      invalidateStats()

      const newCount       = created?.length || 0
      const totalCount     = variables.length
      const duplicateCount = totalCount - newCount

      if (duplicateCount > 0 && newCount > 0) {
        showToast(`${newCount} new lead(s) added. ${duplicateCount} duplicate(s) skipped.`, 'success')
      } else if (duplicateCount > 0 && newCount === 0) {
        showToast(`All ${duplicateCount} lead(s) already exist. Nothing added.`, 'info')
      } else if (newCount > 0) {
        showToast(`${newCount} lead(s) added`, 'success')
      }
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  })

  // ── Bulk update (e.g. from ContactFinder / CompanyEnrichment) ─────────────
  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates: Array<{ id: string; updates: Partial<Lead> }>) => {
      const results: Lead[] = []
      for (const item of updates) {
        const result = await updateLead(item.id, item.updates)
        results.push(result)
      }
      return results
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: [LEADS_KEY] })
      const snapshot = queryClient.getQueriesData<Lead[]>({ queryKey: [LEADS_KEY] })
      // Optimistically apply all updates in-place
      updates.forEach(({ id, updates: u }) => patchLeadsInCache(id, u))
      return { snapshot }
    },
    onSuccess: (results) => {
      // Confirm with server data
      const updatedMap = new Map(results.map(r => [r.id, r]))
      queryClient.setQueriesData(
        { queryKey: [LEADS_KEY], exact: false },
        (oldData: Lead[] | undefined) => {
          if (!oldData) return oldData
          return oldData.map(lead =>
            updatedMap.has(lead.id) ? { ...lead, ...updatedMap.get(lead.id) } : lead,
          )
        },
      )
      invalidateStats()
      showToast('Leads updated successfully', 'success')
    },
    onError: (err: Error, _, context) => {
      if (context?.snapshot) {
        context.snapshot.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      showToast(err.message, 'error')
    },
  })

  return {
    leads:            leadsQuery.data ?? [],
    isLoading:        leadsQuery.isLoading,
    error:            leadsQuery.error,
    stats:            statsQuery.data,
    statsLoading:     statsQuery.isLoading,
    updateLead:       updateMutation.mutate,
    deleteLead:       deleteMutation.mutate,
    bulkUpdateStatus: bulkStatusMutation.mutate,
    bulkUpdateResponse: bulkResponseMutation.mutate,
    bulkUpdate:       bulkUpdateMutation.mutate,
    createLeads:      createMutation.mutate,
    isUpdating:       updateMutation.isPending,
    isDeleting:       deleteMutation.isPending,
    isCreating:       createMutation.isPending,
    isBulkUpdating:   bulkUpdateMutation.isPending,
    exportToCSV:      () => exportLeadsToCSV(filters),
    getLead,
  }
}