import type { StateCreator } from 'zustand'
import type { AppState, CollectionSlice } from './types'
import {
  addTrackToList,
  addTracksToList,
  newPlaylist,
  purgeTrackFromAll,
  removeFromList,
  removeTrackFromList,
  renameInList,
} from '../lib/playlists'
import { naturalQueue, posOf, remapAfterRemove, remapCurrent } from '../lib/queue'

export const createCollectionSlice: StateCreator<AppState, [], [], CollectionSlice> = (set, get) => ({
  tracks: [],
  liked: new Set<number>(),
  history: [],
  playlists: [],

  toggleLike: (id) =>
    set((s) => {
      const liked = new Set(s.liked)
      if (liked.has(id)) liked.delete(id)
      else liked.add(id)
      return { liked }
    }),

  addTracks: (list) =>
    set((s) => {
      if (!list.length) return s
      // 队列非空时把新曲目按自然顺序追加到队尾（队列为空时由播放逻辑按需生成）
      const appended = naturalQueue(list.length).map((i) => s.tracks.length + i)
      return {
        tracks: [...s.tracks, ...list],
        queue: s.queue.length ? [...s.queue, ...appended] : s.queue,
      }
    }),

  removeTrack: (index) =>
    set((s) => {
      const track = s.tracks[index]
      if (!track) return s
      const tracks = s.tracks.filter((_, i) => i !== index)
      const liked = new Set(s.liked)
      liked.delete(track.id)
      const wasCurrent = s.cur === index
      const cur = remapCurrent(s.cur, index, tracks.length)
      const queue = remapAfterRemove(s.queue, index)
      return {
        tracks,
        liked,
        history: remapAfterRemove(s.history, index),
        playlists: purgeTrackFromAll(s.playlists, track.id),
        queue,
        queuePos: posOf(queue, cur),
        cur,
        playing: wasCurrent ? false : s.playing,
        pos: wasCurrent ? 0 : s.pos,
        // 多选中的下标同属一套坐标，一并重映射，避免删歌后选中错位
        selection: s.selection === null ? null : remapAfterRemove(s.selection, index),
        selectionScope: remapAfterRemove(s.selectionScope, index),
      }
    }),

  removeTracks: (indices) => {
    // 从大到小逐个删：每次单删内部完成全部重映射，后续下标不受前面删除影响
    const sorted = [...new Set(indices)].sort((a, b) => b - a)
    for (const i of sorted) get().removeTrack(i)
  },

  createPlaylist: (name) => {
    const p = newPlaylist(name, Date.now())
    if (!p.name) return null
    set((s) => ({ playlists: [...s.playlists, p] }))
    return p
  },

  renamePlaylist: (id, name) => set((s) => ({ playlists: renameInList(s.playlists, id, name) })),

  deletePlaylist: (id) => set((s) => ({ playlists: removeFromList(s.playlists, id) })),

  addToPlaylist: (id, trackId) => set((s) => ({ playlists: addTrackToList(s.playlists, id, trackId) })),

  addManyToPlaylist: (id, trackIds) => set((s) => ({ playlists: addTracksToList(s.playlists, id, trackIds) })),

  removeFromPlaylist: (id, trackId) => set((s) => ({ playlists: removeTrackFromList(s.playlists, id, trackId) })),
})
