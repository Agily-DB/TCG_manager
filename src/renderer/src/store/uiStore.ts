import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIStore {
  viewMode: 'grid' | 'list'
  sidebarOpen: boolean
  setViewMode: (mode: 'grid' | 'list') => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      viewMode: 'grid',
      sidebarOpen: true,
      setViewMode: (mode) => set({ viewMode: mode }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    { name: 'ui-store' }
  )
)
