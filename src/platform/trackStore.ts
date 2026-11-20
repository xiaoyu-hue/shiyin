/**
 * 曲目持久化的平台分流出口（1.0.0 起）。
 *
 * bootstrap 只依赖这里的 trackStore 接口，不感知运行平台：
 * - 网页环境 → webTrackStore（IndexedDB 存 Blob，行为与 0.x 完全一致）；
 * - Capacitor 环境 → nativeTrackStore（音频/封面落真实文件 + JSON 索引）；
 * - Tauri 桌面环境 → tauriTrackStore（与安卓同构：文件 + JSON 索引，
 *   绝不复用 IDB，理由见 tauriTrackStore 文件头）。
 *
 * LoadedTrack 是「恢复完成、可直接组装 Song」的记录：
 * audioSrc / coverSrc 已是当前环境可直接播放/展示的地址。
 */
import { getRuntimeEnv } from './env'
import { webTrackStore } from './webTrackStore'
import { nativeTrackStore } from './nativeTrackStore'
import { tauriTrackStore } from './tauriTrackStore'
import type { TrackStore } from './trackTypes'

export type { LoadedTrack, TrackStore } from './trackTypes'

const runtimeEnv = getRuntimeEnv()

export const trackStore: TrackStore =
  runtimeEnv === 'capacitor' ? nativeTrackStore : runtimeEnv === 'tauri' ? tauriTrackStore : webTrackStore
