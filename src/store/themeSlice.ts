import type { StateCreator } from 'zustand'
import { DEFAULT_THEME_INDEX } from '../data/themes'
import type { AppState, ThemeSlice } from './types'

export const createThemeSlice: StateCreator<AppState, [], [], ThemeSlice> = (set) => ({
  themeIdx: DEFAULT_THEME_INDEX,
  appearance: 'system',
  smoothMode: false,
  swipeAnywhere: false,
  onboarded: false,
  setTheme: (themeIdx) => set({ themeIdx }),
  setAppearance: (appearance) => set({ appearance }),
  setSmoothMode: (smoothMode) => set({ smoothMode }),
  setSwipeAnywhere: (swipeAnywhere) => set({ swipeAnywhere }),
  setOnboarded: (onboarded) => set({ onboarded }),
})
