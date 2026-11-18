import type { Song } from '../data/types'
import { platform } from '../platform/instance'
import { loadTracks, saveTrack, type StoredTrack } from '../platform/idb'
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

/** 分配本地曲目 id，与内置示例曲目（1~8）保持距离 */
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
      lyrics: [],
      audioSrc: URL.createObjectURL(rec.blob),
      source: 'local',
    }))
    useStore.getState().addTracks(restored)
  })()
  return restoring
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
  }
  await saveTrack(record)
}
