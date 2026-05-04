import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ViewMode = 'auto' | 'mobile' | 'desktop'

interface AppSettingsState {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
}

export const useAppSettings = create<AppSettingsState>()(
  persist(
    (set) => ({
      viewMode: 'auto',
      setViewMode: (mode) => set({ viewMode: mode }),
    }),
    { name: 'stadiumbite-settings' }
  )
)
