import type { StateCreator } from 'zustand'
import { songs } from '../data/sample'
import { stepIndex, shuffleIndex, onTail } from '../lib/player'
import type { AppState, PlayerSlice } from './types'

const N = songs.length

export const createPlayerSlice: StateCreator<AppState, [], [], PlayerSlice> = (set) => ({
  cur: 0,
  playing: false,
  pos: 0,
  mode: 'list',

  play: (index) =>
    set((s) => ({
      cur: index,
      pos: 0,
      playing: true,
      history: [index, ...s.history.filter((i) => i !== index)],
    })),
  toggle: () => set((s) => ({ playing: !s.playing })),
  next: () =>
    set((s) => ({
      cur: s.mode === 'shuffle' ? shuffleIndex(N, s.cur) : stepIndex(N, s.cur, 1),
      pos: 0,
      playing: true,
    })),
  prev: () =>
    set((s) => ({
      cur: s.mode === 'shuffle' ? shuffleIndex(N, s.cur) : stepIndex(N, s.cur, -1),
      pos: 0,
      playing: true,
    })),
  tick: () =>
    set((s) => {
      if (!s.playing) return s
      const dur = songs[s.cur].dur
      if (s.pos + 1 >= dur) {
        const action = onTail(s.mode, N, s.cur)
        if (action.kind === 'replay') return { pos: 0 }
        return { cur: action.index, pos: 0 }
      }
      return { pos: s.pos + 1 }
    }),
  seek: (sec) => set({ pos: Math.max(0, sec) }),
  cycleMode: () =>
    set((s) => ({ mode: s.mode === 'list' ? 'repeat' : s.mode === 'repeat' ? 'shuffle' : 'list' })),
})
