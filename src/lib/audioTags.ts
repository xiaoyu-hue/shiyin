import type { LyricLine } from '../data/types'
import { fmtTime } from './format'

/**
 * 音频内嵌标签（ID3 / Vorbis Comment / MP4 等）→ 诗音曲目字段的转换层。
 * 纯函数在前（可单测），真正读文件的 extractAudioTags 在文件末尾，
 * 通过动态 import 加载 music-metadata，避免首屏背上解析库的体积。
 */

export interface ExtractedTags {
  title?: string
  artist?: string
  album?: string
  /** 时长（秒），来自文件头信息；不可靠时为 undefined，调用方回退实测 */
  duration?: number
  lyrics: LyricLine[]
  coverBlob: Blob | null
}

const clean = (v?: string | null): string | undefined => {
  const s = v?.trim()
  return s ? s : undefined
}

/** 标签字段优先、文件名推断兜底，合并出最终展示信息 */
export function mergeTrackMeta(
  fallback: { name: string; artist: string },
  tags: Pick<ExtractedTags, 'title' | 'artist' | 'album'> | null,
): { name: string; artist: string; album: string } {
  return {
    name: clean(tags?.title) ?? fallback.name,
    artist: clean(tags?.artist) ?? fallback.artist,
    album: clean(tags?.album) ?? '本地音乐',
  }
}

/** 毫秒 → 歌词时间字符串（mm:ss，带厘秒时保留两位小数，与 toSeconds 兼容） */
export function formatLyricTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '00:00'
  const total = Math.floor(ms)
  const cs = Math.floor((total % 1000) / 10)
  const base = fmtTime(Math.floor(total / 1000))
  return cs > 0 ? `${base}.${String(cs).padStart(2, '0')}` : base
}

const LRC_STAMP = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g

function stampToMs(min: string, sec: string, frac?: string): number {
  let ms = Number(min) * 60000 + Number(sec) * 1000
  if (frac) {
    const n = Number(frac)
    ms += frac.length === 1 ? n * 100 : frac.length === 2 ? n * 10 : n
  }
  return ms
}

/**
 * 解析 LRC 文本为逐行歌词。一行多时间戳会展开为多行；
 * [ti:] / [ar:] 等元信息行与无时间戳行忽略。结果按时间升序。
 */
export function parseLrcText(text: string): LyricLine[] {
  const out: { ms: number; text: string }[] = []
  for (const raw of text.split(/\r?\n/)) {
    const stamps = [...raw.matchAll(LRC_STAMP)]
    if (!stamps.length) continue
    const lyric = raw.replace(LRC_STAMP, '').trim()
    if (!lyric) continue
    for (const m of stamps) out.push({ ms: stampToMs(m[1], m[2], m[3]), text: lyric })
  }
  return out.sort((a, b) => a.ms - b.ms).map((l) => ({ t: formatLyricTime(l.ms), text: l.text }))
}

/** 无时间戳的纯文本歌词：逐行保留，时间统一记 00:00（lyricIndex 会识别为未同步歌词不高亮） */
export function plainTextLyrics(text: string): LyricLine[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((lineText) => ({ t: '00:00', text: lineText }))
}

/** 内嵌歌词原文 → 逐行歌词：含 LRC 时间戳按同步歌词解析，否则按纯文本处理 */
export function lyricsFromText(text?: string | null): LyricLine[] {
  if (!text?.trim()) return []
  const synced = parseLrcText(text)
  return synced.length ? synced : plainTextLyrics(text)
}

/** 同步歌词条目（毫秒时间戳）→ 逐行歌词；时间戳非法或文本为空的条目丢弃 */
export function lyricsFromSyncText(items: { text: string; timestamp?: number }[]): LyricLine[] {
  return items
    .filter((i) => i.text?.trim() && typeof i.timestamp === 'number' && Number.isFinite(i.timestamp) && i.timestamp >= 0)
    .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
    .map((i) => ({ t: formatLyricTime(i.timestamp ?? 0), text: i.text.trim() }))
}

/**
 * 读取音频文件的内嵌标签。解析失败、格式不支持或无标签时返回 null，
 * 调用方据此回退到文件名推断，绝不因标签问题阻断导入。
 * music-metadata 在此处动态加载，Vite 会将其拆为独立分块，仅导入时才下载。
 */
export async function extractAudioTags(file: File): Promise<ExtractedTags | null> {
  try {
    const { parseBlob, selectCover } = await import('music-metadata')
    const md = await parseBlob(file)
    const common = md.common

    let lyrics: LyricLine[] = []
    const lyricTag = common.lyrics?.find((l) => l.syncText?.length || l.text?.trim())
    if (lyricTag) {
      // 时间戳格式 2 = 毫秒（ID3 SYLT / LRC 转换结果）；1 = MPEG 帧号，无真实时间意义，不采用
      if (lyricTag.syncText?.length && lyricTag.timeStampFormat === 2) {
        lyrics = lyricsFromSyncText(lyricTag.syncText)
      }
      if (!lyrics.length) lyrics = lyricsFromText(lyricTag.text)
    }

    // 兜底：个别工具（如 ffmpeg）把歌词写进非标准帧（TXXX:USLT 等），
    // 不会进入 common.lyrics，此时从原生标签里再找一遍歌词文本
    if (!lyrics.length) {
      outer: for (const list of Object.values(md.native)) {
        for (const tag of list) {
          const id = tag.id.toUpperCase()
          if (id === 'USLT' || id === 'ULT' || id === '©LYR' || id === 'LYRICS' || /^TXXX:(USLT|LYRICS)$/.test(id)) {
            const v: unknown = tag.value
            const text = typeof v === 'string' ? v : (v as { text?: string } | null)?.text
            const found = lyricsFromText(text)
            if (found.length) {
              lyrics = found
              break outer
            }
          }
        }
      }
    }

    const pic = selectCover(common.picture)
    const coverBlob = pic ? new Blob([new Uint8Array(pic.data)], { type: pic.format || 'image/jpeg' }) : null

    const duration = md.format.duration
    const result: ExtractedTags = {
      title: clean(common.title),
      artist: clean(common.artist) ?? clean(common.artists?.join('、')),
      album: clean(common.album),
      duration: typeof duration === 'number' && Number.isFinite(duration) && duration > 0 ? duration : undefined,
      lyrics,
      coverBlob,
    }
    // 什么都没读到（无标签或文件损坏但未抛错）与解析失败同等对待，调用方整体回退
    if (!result.title && !result.artist && !result.album && !result.duration && !result.lyrics.length && !result.coverBlob) {
      return null
    }
    return result
  } catch {
    return null
  }
}
