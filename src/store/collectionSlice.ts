import type { StateCreator } from 'zustand'
import { songs } from '../data/sample'
import type { AppState, CollectionSlice } from './types'

export const createCollectionSlice: StateCreator<AppState, [], [], CollectionSlice> = (set) => ({
  tracks: [...songs],
  liked: new Set<number>(),
  history: [],

  toggleLike: (id) =>
    set((s) => {
      const liked = new Set(s.liked)
      if (liked.has(id)) liked.delete(id)
      else liked.add(id)
      return { liked }
    }),

  addTracks: (list) =>
    set((s) => (list.length ? { tracks: [...s.tracks, ...list] } : s)),
})
