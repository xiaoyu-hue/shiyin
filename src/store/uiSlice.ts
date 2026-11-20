import type { StateCreator } from 'zustand'
import { toggleInSelection } from '../lib/selection'
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
  selection: null,
  selectionScope: [],
  restored: false,
  toast: null,
  chromeCompact: false,

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
  enterSelection: (index, scope) =>
    set({ selection: [index], selectionScope: scope.length ? [...scope] : [index] }),
  toggleSelected: (index) =>
    set((s) => (s.selection === null ? s : { selection: toggleInSelection(s.selection, index) })),
  selectAllSelection: () =>
    set((s) => (s.selection === null ? s : { selection: [...s.selectionScope] })),
  clearSelection: () => set((s) => (s.selection === null ? s : { selection: [] })),
  exitSelection: () => set({ selection: null, selectionScope: [] }),
  setRestored: (restored) => set({ restored }),
  showToast: (message) =>
    set((s) => ({ toast: { id: (s.toast?.id ?? 0) + 1, message } })),
  clearToast: (id) => set((s) => (s.toast?.id === id ? { toast: null } : s)),
  setChromeCompact: (chromeCompact) => set({ chromeCompact }),
})
