import type { StateCreator } from 'zustand'
import type { AppState, UiSlice } from './types'

export const createUiSlice: StateCreator<AppState, [], [], UiSlice> = (set) => ({
  tab: 'home',
  playerOpen: false,
  lyricOpen: false,
  query: '',

  setTab: (tab) => set({ tab }),
  setPlayerOpen: (playerOpen) => set({ playerOpen }),
  setLyricOpen: (lyricOpen) => set({ lyricOpen }),
  setQuery: (query) => set({ query }),
})
