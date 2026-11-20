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
/** [offset:+123] / [offset:-123] 全局偏移（毫秒） */
const LRC_OFFSET = /\[offset:\s*([+-]?\d+)\s*\]/i
/** 宽松版时间戳（容忍括号内空格），只用于剥离文本中的残留，不用于解析时间 */
const LRC_STAMP_LOOSE = /\[\s*\d{1,3}:\d{2}(?:\s*[.:]\s*\d{1,3})?\s*\]/g
const LRC_WORD_STAMP_LOOSE = /<\s*\d{1,3}:\d{2}(?:\s*[.:]\s*\d{1,3})?\s*>/g

function stampToMs(min: string, sec: string, frac?: string): number {
  let ms = Number(min) * 60000 + Number(sec) * 1000
  if (frac) {
    const n = Number(frac)
    ms += frac.length === 1 ? n * 100 : frac.length === 2 ? n * 10 : n
  }
  return ms
}

/**
 * 剥净歌词文本里的一切时间戳残留（方括号 [mm:ss.xx] 与尖括号 <mm:ss.xx> 两种逐词格式）。
 * 有些工具把逐词歌词写进同步歌词帧/歌词文本，逐词时间戳会夹在字间漏进展示文本，统一在此清理。
 */
export function stripLyricStamps(text: string): string {
  return text.replace(LRC_STAMP_LOOSE, '').replace(LRC_WORD_STAMP_LOOSE, '').replace(/ {2,}/g, ' ').trim()
}

/** 清洗已成行的歌词：剥净每行文本的时间戳残留，丢弃变空的行（用于已存数据自愈） */
export function sanitizeLyricLines(lines: LyricLine[]): LyricLine[] {
  return lines.map((l) => ({ t: l.t, text: stripLyricStamps(l.text) })).filter((l) => l.text)
}

/**
 * 解析 LRC 文本为逐行歌词。
 * - 行首连续的时间戳是「行时间戳」：一行多戳会展开为多行（重复段落共用一行文本的写法）；
 * - 夹在文字中间的时间戳是逐词时间戳：只剥离、不展开，行时间取行首戳（行首无戳时取第一个戳）；
 * - [ti:] / [ar:] 等元信息行与无时间戳行忽略；[offset:] 全局偏移按主流约定应用
 *   （正偏移使歌词提前显示，即时间戳减去偏移量）。结果按时间升序。
 */
/** 歌词行数上限（审计 A-61）：防异常巨大的歌词文件拖垮解析与内存，正常歌词远低于此 */
const MAX_LRC_RAW_LINES = 20000
const MAX_LRC_LINES = 5000

export function parseLrcText(text: string): LyricLine[] {
  const offsetMs = Number(text.match(LRC_OFFSET)?.[1] ?? 0)
  const out: { ms: number; text: string }[] = []
  for (const raw of text.split(/\r?\n/).slice(0, MAX_LRC_RAW_LINES)) {
    const stamps = [...raw.matchAll(LRC_STAMP)]
    if (!stamps.length) continue
    const lyric = stripLyricStamps(raw)
    if (!lyric) continue
    // 行首连续戳（其间只有空白）算行时间戳；一旦文字出现，后面的戳都是逐词戳
    const leading: RegExpMatchArray[] = []
    let cursor = 0
    for (const m of stamps) {
      if (raw.slice(cursor, m.index).trim() !== '') break
      leading.push(m)
      cursor = (m.index ?? 0) + m[0].length
    }
    const lineStamps = leading.length ? leading : [stamps[0]]
    for (const m of lineStamps) {
      out.push({ ms: Math.max(0, stampToMs(m[1], m[2], m[3]) - offsetMs), text: lyric })
    }
  }
  return out
    .sort((a, b) => a.ms - b.ms)
    .slice(0, MAX_LRC_LINES)
    .map((l) => ({ t: formatLyricTime(l.ms), text: l.text }))
}

/** 无时间戳的纯文本歌词：逐行保留并剥净时间戳残留，时间统一记 00:00（lyricIndex 会识别为未同步歌词不高亮） */
export function plainTextLyrics(text: string): LyricLine[] {
  return text
    .split(/\r?\n/)
    .map((l) => stripLyricStamps(l))
    .filter(Boolean)
    .map((lineText) => ({ t: '00:00', text: lineText }))
}

/** 内嵌歌词原文 → 逐行歌词：含 LRC 时间戳按同步歌词解析，否则按纯文本处理 */
export function lyricsFromText(text?: string | null): LyricLine[] {
  if (!text?.trim()) return []
  const synced = parseLrcText(text)
  return synced.length ? synced : plainTextLyrics(text)
}

/** 同步歌词条目（毫秒时间戳）→ 逐行歌词；时间戳非法、文本为空或剥净时间戳后变空的条目丢弃 */
export function lyricsFromSyncText(items: { text: string; timestamp?: number }[]): LyricLine[] {
  return items
    .filter(
      (i) => i.text?.trim() && typeof i.timestamp === 'number' && Number.isFinite(i.timestamp) && i.timestamp >= 0,
    )
    .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
    .map((i) => ({ t: formatLyricTime(i.timestamp ?? 0), text: stripLyricStamps(i.text) }))
    .filter((l) => l.text)
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
    if (
      !result.title &&
      !result.artist &&
      !result.album &&
      !result.duration &&
      !result.lyrics.length &&
      !result.coverBlob
    ) {
      return null
    }
    return result
  } catch {
    return null
  }
}
