// src/stores/leadStore.ts (the relevant part)
interface FiltersState {
    search: string | null
    platform: string | null  // 'seek', 'linkedin', or 'all'
    city: string | null      // city name or 'all'
    status: string | null    // lead status or 'all'
    enrichmentStatus: string | null  // enrichment status or 'all'
    followUpOnly: boolean
  }
  
  // In your store actions:
  setFilter: (key: keyof FiltersState, value: any) => {
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value === 'all' ? null : value, // Convert 'all' to null for filtering
      },
    }))
  },
  
  clearFilters: () => {
    set({
      filters: {
        search: null,
        platform: null,
        city: null,
        status: null,
        enrichmentStatus: null,
        followUpOnly: false,
      },
    })
  },