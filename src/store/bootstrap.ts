import type { Song } from '../data/types'
import { DEFAULT_THEME_INDEX, themes } from '../data/themes'
import { parsePrefs, serializePrefs } from '../lib/prefs'
import { platform } from '../platform/instance'
import { clearTracks, deleteTrack as deleteStoredTrack, loadTracks, saveTrack, type StoredTrack } from '../platform/idb'
import { naturalQueue } from '../lib/queue'
import { loadPlaylistsRaw, loadPrefsRaw, savePlaylistsRaw, savePrefsRaw } from '../platform/prefs'
import { parsePlaylists, serializePlaylists } from '../lib/playlists'
import { useStore } from './index'

let bound = false

/** 把音频引擎事件接入 store，应用生命周期内只绑定一次 */
export function bindAudioEngine(): void {
  if (bound) return
  bound = true
  const { audio } = platform
  audio.onProgress((sec) => useStore.getState().applyAudioPos(sec))
  audio.onEnded(() => useStore.getState().handleTrackEnd())
  audio.onError((message) => {
    const state = useStore.getState()
    state.setAudioError(message)
    // 引擎已无法出声时同步界面状态，避免显示"播放中"却无声
    if (state.playing) useStore.setState({ playing: false })
  })
}

/** 分配本地曲目 id，从 1000 起与历史数据保持距离 */
export function nextLocalId(): number {
  const max = useStore.getState().tracks.reduce((m, t) => Math.max(m, t.id), 1000)
  return max + 1
}

let restoring: Promise<void> | null = null

/** 从 IndexedDB 恢复本地曲目（blob URL 每次启动重新生成） */
export function restoreLocalTracks(): Promise<void> {
  if (restoring) return restoring
  restoring = (async () => {
    const records = await loadTracks().catch(() => [] as StoredTrack[])
    if (!records.length) return
    const restored: Song[] = records.map((rec) => ({
      id: rec.id,
      name: rec.name,
      artist: rec.artist,
      album: rec.album,
      dur: rec.dur,
      color: rec.color,
      lyrics: rec.lyrics ?? [],
      audioSrc: URL.createObjectURL(rec.blob),
      coverSrc: rec.cover ? URL.createObjectURL(rec.cover) : null,
      coverBlob: rec.cover ?? null,
      localKey: rec.key,
      addedAt: rec.addedAt,
    }))
    useStore.getState().addTracks(restored)
    // 恢复后队列初始化为自然顺序（与曲目列表一致）
    const len = useStore.getState().tracks.length
    useStore.setState({ queue: naturalQueue(len), queuePos: 0 })
  })()
  return restoring
}

/**
 * 彻底删除一首曲目：store 连带清理 + 释放 blob URL + 删除 IndexedDB 记录。
 * 删的正是正在播放的曲目时停播。
 */
export async function deleteTrackEverywhere(index: number): Promise<void> {
  const state = useStore.getState()
  const track = state.tracks[index]
  if (!track) return
  const wasCurrent = state.cur === index
  state.removeTrack(index)
  if (track.audioSrc?.startsWith('blob:')) URL.revokeObjectURL(track.audioSrc)
  if (track.coverSrc?.startsWith('blob:')) URL.revokeObjectURL(track.coverSrc)
  if (wasCurrent) platform.audio.pause()
  if (track.localKey) await deleteStoredTrack(track.localKey).catch(() => undefined)
}

/**
 * 清除全部本地音乐（设置页数据管理）：删 IndexedDB 全部记录并重置相关状态。
 * 歌单保留名字但清空曲目；主题等偏好不动。
 */
export async function clearAllMusic(): Promise<void> {
  const s = useStore.getState()
  for (const t of s.tracks) {
    if (t.audioSrc?.startsWith('blob:')) URL.revokeObjectURL(t.audioSrc)
    if (t.coverSrc?.startsWith('blob:')) URL.revokeObjectURL(t.coverSrc)
  }
  platform.audio.pause()
  await clearTracks().catch(() => undefined)
  useStore.setState({
    tracks: [],
    queue: [],
    queuePos: 0,
    cur: 0,
    playing: false,
    pos: 0,
    history: [],
    liked: new Set<number>(),
    playlists: s.playlists.map((p) => ({ ...p, trackIds: [] })),
  })
}

/** 读取浏览器为本站分配的存储占用（字节）；API 不可用时返回 null */
export async function storageUsage(): Promise<number | null> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null
    const est = await navigator.storage.estimate()
    return typeof est.usage === 'number' ? est.usage : null
  } catch {
    return null
  }
}

/** 从本地存储恢复收藏、历史与主题（同步读取，应在首帧渲染前调用） */
export function restorePrefs(): void {
  const prefs = parsePrefs(loadPrefsRaw(), themes.length, DEFAULT_THEME_INDEX)
  if (prefs) {
    useStore.setState({
      liked: new Set(prefs.liked),
      history: prefs.history,
      themeIdx: prefs.themeIdx,
    })
  }
  useStore.setState({ playlists: parsePlaylists(loadPlaylistsRaw()) })
}

let prefsBound = false

/** 订阅收藏 / 历史 / 主题变化并写回本地存储，应用生命周期内只绑定一次 */
export function bindPrefsPersistence(): void {
  if (prefsBound) return
  prefsBound = true
  useStore.subscribe((state, prev) => {
    if (state.playlists !== prev.playlists) {
      savePlaylistsRaw(serializePlaylists(state.playlists))
    }
    if (state.liked === prev.liked && state.history === prev.history && state.themeIdx === prev.themeIdx) {
      return
    }
    savePrefsRaw(
      serializePrefs({
        liked: [...state.liked],
        history: state.history,
        themeIdx: state.themeIdx,
      }),
    )
  })
}

/** 持久化一首已导入曲目 */
export async function persistTrack(file: File, track: Song, key: string): Promise<void> {
  const record: StoredTrack = {
    key,
    id: track.id,
    name: track.name,
    artist: track.artist,
    album: track.album,
    color: track.color,
    dur: track.dur,
    blob: file,
    addedAt: Date.now(),
    lyrics: track.lyrics,
    cover: track.coverBlob ?? null,
  }
  await saveTrack(record)
}
