import type { StateCreator } from 'zustand'
import { DEFAULT_THEME_INDEX } from '../data/themes'
import type { AppState, ThemeSlice } from './types'

export const createThemeSlice: StateCreator<AppState, [], [], ThemeSlice> = (set) => ({
  themeIdx: DEFAULT_THEME_INDEX,
  setTheme: (themeIdx) => set({ themeIdx }),
})
