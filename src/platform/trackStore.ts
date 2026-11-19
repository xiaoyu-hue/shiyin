/**
 * 曲目持久化的平台分流出口（1.0.0 起）。
 *
 * bootstrap 只依赖这里的 trackStore 接口，不感知运行平台：
 * - 网页环境 → webTrackStore（IndexedDB 存 Blob，行为与 0.x 完全一致）；
 * - 原生环境 → nativeTrackStore（音频/封面落真实文件 + JSON 索引）。
 *
 * LoadedTrack 是「恢复完成、可直接组装 Song」的记录：
 * audioSrc / coverSrc 已是当前环境可直接播放/展示的地址。
 */
import type { LyricLine } from '../data/types'
import type { StoredTrack } from './idb'
import { isNativePlatform } from './env'
import { webTrackStore } from './webTrackStore'
import { nativeTrackStore } from './nativeTrackStore'

export interface LoadedTrack {
  key: string
  id: number
  name: string
  artist: string
  album: string
  color: string
  dur: number
  addedAt: number
  lyrics: LyricLine[]
  /** 可直接播放的音频地址（网页为 blob URL，原生为本地文件服务地址） */
  audioSrc: string
  /** 可直接展示的封面地址；无封面为 null */
  coverSrc: string | null
  /** 封面原图数据（持久化落盘用）；无封面为 null */
  coverBlob: Blob | null
  /** 封面缩略图地址（≤128px，1.1.0）；未生成时为 null，界面回退 coverSrc */
  thumbSrc: string | null
  /** 封面中图地址（≤512px，1.1.0）；未生成时为 null，界面回退 coverSrc */
  midCoverSrc: string | null
  /** 缩略图是否已生成/确认过；false 且有封面时恢复后异步补图 */
  thumbDone: boolean
}

export interface TrackStore {
  /** 持久化一首已导入曲目（rec.blob 为音频原文件） */
  saveTrack(rec: StoredTrack): Promise<void>
  /** 恢复全部曲目，按导入时间升序 */
  loadTracks(): Promise<LoadedTrack[]>
  /** 删除一首曲目的全部持久化数据 */
  deleteTrack(key: string): Promise<void>
  /** 只更新某首曲目的歌词（外挂歌词补挂用）；记录不存在时静默跳过 */
  updateTrackLyrics(key: string, lyrics: LyricLine[]): Promise<void>
  /** 只更新某首曲目的缩略图/中图并标记已确认（导入生成与老歌库补图用）；记录不存在时静默跳过 */
  updateTrackCovers(key: string, covers: { thumb: Blob | null; coverMid: Blob | null }): Promise<void>
  /** 清除全部曲目的持久化数据 */
  clearTracks(): Promise<void>
  /** 本地音乐占用的存储字节数；无法统计时返回 null */
  storageUsage(): Promise<number | null>
}

export const trackStore: TrackStore = isNativePlatform() ? nativeTrackStore : webTrackStore
