// src/hooks/useSettings.ts
import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAllSettings, setSetting } from '@/services/settingsService'
import { useToast } from './useToast'

const SETTINGS_KEY = 'settings'

export function useSettings() {
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: [SETTINGS_KEY],
    queryFn: getAllSettings,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const mutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      setSetting(key, value),
    onSuccess: (_, variables) => {
      // Invalidate and refetch settings
      queryClient.invalidateQueries({ queryKey: [SETTINGS_KEY] })
      showToast(`${variables.key} saved successfully`, 'success')
    },
    onError: (err: Error) => {
      console.error('Save setting error:', err)
      showToast(err.message || 'Failed to save setting', 'error')
    },
  })

  const saveSetting = useCallback(
    (key: string, value: string) => {
      if (!value.trim()) {
        showToast('Please enter a value', 'warning')
        return
      }
      mutation.mutate({ key, value })
    },
    [mutation, showToast]
  )

  return {
    settings: query.data ?? {},
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    saveSetting,
    isSaving: mutation.isPending,
  }
}