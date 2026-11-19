import type { StateCreator } from 'zustand'
import { stepIndex, shuffleIndex } from '../lib/player'
import { appendToQueue, insertNext, moveInQueue, naturalQueue, posOf, removeAtPos } from '../lib/queue'
import { endsAtFromMinutes } from '../lib/sleepTimer'
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

/**
 * 取有效队列：状态中的队列为空、越界或不含当前曲目时（旧状态/测试直接改 tracks），
 * 回退为自然顺序，保证 next/prev 永远有定义良好的行为。
 */
function effectiveQueue(s: AppState): number[] {
  const q = s.queue
  if (q.length && q.includes(s.cur) && q.every((i) => i >= 0 && i < s.tracks.length)) return q
  return naturalQueue(s.tracks.length)
}

export const createPlayerSlice: StateCreator<AppState, [], [], PlayerSlice> = (set, get) => ({
  cur: 0,
  playing: false,
  pos: 0,
  mode: 'list',
  audioError: null,
  queue: [],
  queuePos: 0,
  sleepEndsAt: null,
  sleepAfterTrack: false,

  setSleepMinutes: (min) =>
    set({
      sleepEndsAt: min === null ? null : endsAtFromMinutes(min, Date.now()),
      sleepAfterTrack: min === null ? get().sleepAfterTrack : false,
    }),

  setSleepAfterTrack: (v) => set({ sleepAfterTrack: v, sleepEndsAt: v ? null : get().sleepEndsAt }),

  clearSleep: () => set({ sleepEndsAt: null, sleepAfterTrack: false }),

  play: (index, context) => {
    set((s) => {
      let queue: number[]
      if (context && context.length) {
        queue = context.includes(index) ? [...context] : [...context, index]
      } else if (s.queue.length && s.queue.every((i) => i >= 0 && i < s.tracks.length)) {
        queue = s.queue.includes(index) ? s.queue : [...s.queue, index]
      } else {
        queue = naturalQueue(s.tracks.length)
        if (!queue.includes(index) && index >= 0) queue = [...queue, index]
      }
      return {
        cur: index,
        queue,
        queuePos: posOf(queue, index),
        pos: 0,
        playing: true,
        audioError: null,
        history: [index, ...s.history.filter((i) => i !== index)].slice(0, HISTORY_LIMIT),
      }
    })
    syncEngine(get())
  },

  toggle: () => {
    set((s) => ({ playing: !s.playing, audioError: null }))
    syncEngine(get())
  },

  next: () => {
    const s = get()
    const q = effectiveQueue(s)
    if (!q.length) return
    const pos = s.mode === 'shuffle' ? shuffleIndex(q.length, posOf(q, s.cur)) : stepIndex(q.length, posOf(q, s.cur), 1)
    set({ cur: q[pos], queue: q, queuePos: pos, pos: 0, playing: true, audioError: null })
    syncEngine(get())
  },

  prev: () => {
    const s = get()
    const q = effectiveQueue(s)
    if (!q.length) return
    const pos = s.mode === 'shuffle' ? shuffleIndex(q.length, posOf(q, s.cur)) : stepIndex(q.length, posOf(q, s.cur), -1)
    set({ cur: q[pos], queue: q, queuePos: pos, pos: 0, playing: true, audioError: null })
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
    // 睡眠定时「播完这首」优先于一切播放模式：停播并清除定时
    if (s.sleepAfterTrack) {
      set({ playing: false, pos: 0, sleepAfterTrack: false, sleepEndsAt: null })
      syncEngine(get())
      return
    }
    if (s.mode === 'repeat') {
      const track = s.tracks[s.cur]
      if (track?.audioSrc) {
        engine.seek(0)
        void engine.play(track.audioSrc).catch(() => undefined)
      }
      set({ pos: 0 })
      return
    }
    const q = effectiveQueue(s)
    if (!q.length) return
    const pos =
      s.mode === 'shuffle' ? shuffleIndex(q.length, posOf(q, s.cur)) : stepIndex(q.length, posOf(q, s.cur), 1)
    set({ cur: q[pos], queue: q, queuePos: pos, pos: 0, playing: true })
    syncEngine(get())
  },

  setAudioError: (message) => set({ audioError: message }),

  playNext: (trackIndex) =>
    set((s) => {
      const q = effectiveQueue(s)
      const queue = insertNext(q, posOf(q, s.cur), trackIndex)
      return { queue, queuePos: posOf(queue, s.cur) }
    }),

  enqueue: (trackIndex) =>
    set((s) => {
      const q = effectiveQueue(s)
      const queue = appendToQueue(q, trackIndex)
      return { queue, queuePos: posOf(queue, s.cur) }
    }),

  playQueueAt: (pos) => {
    const s = get()
    const q = effectiveQueue(s)
    const trackIndex = q[pos]
    if (trackIndex === undefined) return
    set({
      cur: trackIndex,
      queue: q,
      queuePos: pos,
      pos: 0,
      playing: true,
      audioError: null,
      history: [trackIndex, ...s.history.filter((i) => i !== trackIndex)].slice(0, HISTORY_LIMIT),
    })
    syncEngine(get())
  },

  removeQueueAt: (pos) =>
    set((s) => {
      const q = effectiveQueue(s)
      if (pos === posOf(q, s.cur) || pos < 0 || pos >= q.length) return s
      const queue = removeAtPos(q, pos)
      return { queue, queuePos: posOf(queue, s.cur) }
    }),

  moveQueue: (from, to) =>
    set((s) => {
      const q = effectiveQueue(s)
      const queue = moveInQueue(q, from, to)
      return { queue, queuePos: posOf(queue, s.cur) }
    }),

  setQueueOrder: (queue) =>
    set((s) => {
      const q = effectiveQueue(s)
      if (queue.length !== q.length || !queue.every((i) => q.includes(i))) return s
      return { queue, queuePos: posOf(queue, s.cur) }
    }),

  clearQueue: () =>
    set((s) => {
      const q = effectiveQueue(s)
      if (!q.length) return s
      return { queue: [s.cur], queuePos: 0 }
    }),
})
