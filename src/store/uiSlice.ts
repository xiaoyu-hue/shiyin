import type { StateCreator } from 'zustand'
import type { AppState, UiSlice } from './types'

export const createUiSlice: StateCreator<AppState, [], [], UiSlice> = (set) => ({
  tab: 'home',
  playerOpen: false,
  lyricOpen: false,
  query: '',
  libraryView: 'songs',
  libraryDetail: null,
  sortKey: 'addedAt',
  sortDir: 'asc',
  menuTrack: null,
  queueOpen: false,
  mePage: null,

  setTab: (tab) => set({ tab }),
  setPlayerOpen: (playerOpen) => set({ playerOpen }),
  setLyricOpen: (lyricOpen) => set({ lyricOpen }),
  setQuery: (query) => set({ query }),
  setLibraryView: (libraryView) => set({ libraryView, libraryDetail: null }),
  setLibraryDetail: (libraryDetail) => set({ libraryDetail }),
  setSort: (sortKey, sortDir) => set({ sortKey, sortDir }),
  setMenuTrack: (menuTrack) => set({ menuTrack }),
  setQueueOpen: (queueOpen) => set({ queueOpen }),
  setMePage: (mePage) => set({ mePage }),
})
