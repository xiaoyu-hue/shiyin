/**
 * 导入管线（三端共用）：File 数组 → 配对同名歌词 → 解析标签 → 持久化 → 入库播放。
 *
 * 入口有四处，处理逻辑只有这一份：
 * - 网页：ImportButton 的 <input type="file">；
 * - 安卓：ImportButton 走系统文件选择器（nativeFiles）；
 * - 桌面：ImportButton 走 Tauri 对话框（tauriFiles）；
 * - 桌面拖放与 CI 测试钩子：tauriDesktop 直接调用本函数（无 UI 状态回调）。
 *
 * 行为与 1.2.x 的 ImportButton 内嵌实现完全一致（2026-11 抽取，未改语义）：
 * 重复音频跳过但同名歌词仍补挂；外挂歌词优先于内嵌歌词；
 * 持久化失败不阻断本次导入；导入成功后自动播放第一首新增曲目。
 */
import { buildLocalTrack, fileKey, isAudioFile } from '../lib/localAudio'
import { isLyricFileName, pairLyricFiles, readLyricFile } from '../lib/lyricFile'
import type { LyricLine } from '../data/types'
import { attachLyricsToTrack, nextLocalId, persistTrack } from './bootstrap'
import { useStore } from './index'

export type ImportResult =
  | { kind: 'no-audio'; lyricOnly: boolean }
  | { kind: 'done'; added: number; skipped: number; lrc: number }

export async function importTracks(
  all: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<ImportResult> {
  const audioFiles = all.filter(isAudioFile)
  const lyricFiles = all.filter((f) => isLyricFileName(f.name))

  if (!audioFiles.length) {
    return { kind: 'no-audio', lyricOnly: lyricFiles.length > 0 }
  }

  // 外挂歌词按「与音频同名」配对（行业惯例），解析结果缓存避免重复读
  const pairs = pairLyricFiles(
    audioFiles.map((f) => f.name),
    lyricFiles.map((f) => f.name),
  )
  const lyricCache = new Map<number, LyricLine[]>()
  const getLyrics = async (li: number): Promise<LyricLine[]> => {
    const hit = lyricCache.get(li)
    if (hit) return hit
    const lines = await readLyricFile(lyricFiles[li])
    lyricCache.set(li, lines)
    return lines
  }
  let lrcAttached = 0

  const existing = new Set(
    useStore
      .getState()
      .tracks.map((t) => t.localKey)
      .filter((k): k is string => Boolean(k)),
  )

  const added = []
  let skipped = 0
  let id = nextLocalId()

  for (let i = 0; i < audioFiles.length; i += 1) {
    const file = audioFiles[i]
    const key = fileKey(file)
    const lyricIdx = pairs.get(i)
    if (existing.has(key)) {
      // 音频是重复导入，但同名歌词仍可补挂到已在库中的那首
      if (lyricIdx !== undefined) {
        const lines = await getLyrics(lyricIdx)
        const at = useStore.getState().tracks.findIndex((t) => t.localKey === key)
        if (lines.length && at >= 0) {
          await attachLyricsToTrack(at, lines)
          lrcAttached += 1
        }
      }
      skipped += 1
      onProgress?.(i + 1, audioFiles.length)
      continue
    }
    try {
      const track = await buildLocalTrack(file, id)
      id += 1
      track.localKey = key
      // 同名外挂歌词优先于内嵌歌词（用户显式带来的文件说了算）
      if (lyricIdx !== undefined) {
        const lines = await getLyrics(lyricIdx)
        if (lines.length) {
          track.lyrics = lines
          lrcAttached += 1
        }
      }
      try {
        await persistTrack(file, track, key)
      } catch {
        // 持久化失败不阻断本次导入，仅影响刷新后是否保留
      }
      added.push(track)
    } catch {
      skipped += 1
    }
    onProgress?.(i + 1, audioFiles.length)
  }

  if (added.length) {
    useStore.getState().addTracks(added)
    useStore.getState().play(useStore.getState().tracks.length - added.length)
  }
  return { kind: 'done', added: added.length, skipped, lrc: lrcAttached }
}
