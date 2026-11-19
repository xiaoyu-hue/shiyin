/**
 * 网页环境曲目存储：IndexedDB 实现（0.x 行为原样保留）。
 * blob URL 不持久化，每次启动由本模块重新生成。
 */
import {
  clearTracks as idbClearTracks,
  deleteTrack as idbDeleteTrack,
  loadTracks as idbLoadTracks,
  saveTrack as idbSaveTrack,
  updateTrackCovers as idbUpdateTrackCovers,
  updateTrackLyrics as idbUpdateTrackLyrics,
  type StoredTrack,
} from './idb'
import type { LoadedTrack, TrackStore } from './trackStore'

export const webTrackStore: TrackStore = {
  async saveTrack(rec: StoredTrack): Promise<void> {
    await idbSaveTrack(rec)
  },

  async loadTracks(): Promise<LoadedTrack[]> {
    const records = await idbLoadTracks()
    return records.map((rec) => ({
      key: rec.key,
      id: rec.id,
      name: rec.name,
      artist: rec.artist,
      album: rec.album,
      color: rec.color,
      dur: rec.dur,
      addedAt: rec.addedAt,
      lyrics: rec.lyrics ?? [],
      audioSrc: URL.createObjectURL(rec.blob),
      coverSrc: rec.cover ? URL.createObjectURL(rec.cover) : null,
      coverBlob: rec.cover ?? null,
      thumbSrc: rec.thumb ? URL.createObjectURL(rec.thumb) : null,
      midCoverSrc: rec.coverMid ? URL.createObjectURL(rec.coverMid) : null,
      thumbDone: rec.thumbDone === true,
    }))
  },

  async deleteTrack(key: string): Promise<void> {
    await idbDeleteTrack(key)
  },

  async updateTrackLyrics(key, lyrics): Promise<void> {
    await idbUpdateTrackLyrics(key, lyrics)
  },

  async updateTrackCovers(key, covers): Promise<void> {
    await idbUpdateTrackCovers(key, covers)
  },

  async clearTracks(): Promise<void> {
    await idbClearTracks()
  },

  /** 浏览器为本站分配的存储占用；API 不可用时返回 null（与 0.x 设置页口径一致） */
  async storageUsage(): Promise<number | null> {
    try {
      if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null
      const est = await navigator.storage.estimate()
      return typeof est.usage === 'number' ? est.usage : null
    } catch {
      return null
    }
  },
}
