// src/hooks/useFilters.ts
import { create } from 'zustand'
import type { LeadFilters } from '@/types'

interface FiltersStore {
  filters: LeadFilters
  setFilter: <K extends keyof LeadFilters>(key: K, value: LeadFilters[K]) => void
  clearFilters: () => void
}

const defaultFilters: LeadFilters = {
  platform: 'all',
  city: 'all',
  status: 'all',
  enrichmentStatus: 'all',
  followUpOnly: false,
  search: '',
}

export const useFilters = create<FiltersStore>((set) => ({
  filters: defaultFilters,
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),
  clearFilters: () => set({ filters: defaultFilters }),
}))