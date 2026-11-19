import type { StateCreator } from 'zustand'
import { stepIndex, shuffleIndex, onTail } from '../lib/player'
import { HISTORY_LIMIT } from '../lib/prefs'
import { platform } from '../platform/instance'
import type { AppState, PlayerSlice } from './types'

const engine = platform.audio

/** 让音频引擎与 store 保持一致：当前曲目交由引擎播放，无曲目时引擎停止。 */
function syncEngine(state: AppState) {
  const track = state.tracks[state.cur]
  if (!track?.audioSrc) {
    engine.pause()
    return
  }
  if (state.playing) void engine.play(track.audioSrc).catch(() => undefined)
  else engine.pause()
}

export const createPlayerSlice: StateCreator<AppState, [], [], PlayerSlice> = (set, get) => ({
  cur: 0,
  playing: false,
  pos: 0,
  mode: 'list',
  audioError: null,

  play: (index) => {
    set((s) => ({
      cur: index,
      pos: 0,
      playing: true,
      audioError: null,
      history: [index, ...s.history.filter((i) => i !== index)].slice(0, HISTORY_LIMIT),
    }))
    syncEngine(get())
  },

  toggle: () => {
    set((s) => ({ playing: !s.playing, audioError: null }))
    syncEngine(get())
  },

  next: () => {
    const s = get()
    const len = s.tracks.length
    set({
      cur: s.mode === 'shuffle' ? shuffleIndex(len, s.cur) : stepIndex(len, s.cur, 1),
      pos: 0,
      playing: true,
      audioError: null,
    })
    syncEngine(get())
  },

  prev: () => {
    const s = get()
    const len = s.tracks.length
    set({
      cur: s.mode === 'shuffle' ? shuffleIndex(len, s.cur) : stepIndex(len, s.cur, -1),
      pos: 0,
      playing: true,
      audioError: null,
    })
    syncEngine(get())
  },

  seek: (sec) => {
    const target = Math.max(0, sec)
    set({ pos: target })
    if (get().tracks[get().cur]?.audioSrc) engine.seek(target)
  },

  cycleMode: () =>
    set((s) => ({ mode: s.mode === 'list' ? 'repeat' : s.mode === 'repeat' ? 'shuffle' : 'list' })),

  applyAudioPos: (sec) => {
    if (!get().playing) return
    set({ pos: Number.isFinite(sec) ? sec : 0 })
  },

  handleTrackEnd: () => {
    const s = get()
    const action = onTail(s.mode, s.tracks.length, s.cur)
    if (action.kind === 'replay') {
      const track = s.tracks[s.cur]
      if (track?.audioSrc) {
        engine.seek(0)
        void engine.play(track.audioSrc).catch(() => undefined)
      }
      set({ pos: 0 })
      return
    }
    set({ cur: action.index, pos: 0, playing: true })
    syncEngine(get())
  },

  setAudioError: (message) => set({ audioError: message }),
})
