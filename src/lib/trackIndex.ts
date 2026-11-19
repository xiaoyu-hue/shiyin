/**
 * 原生存储的曲目索引（纯逻辑层，不依赖任何插件，便于单测）。
 *
 * 原生环境下音频/封面存为真实文件，数据库只保留这份 JSON 索引：
 * 每条记录对应一首曲目，audioPath / coverPath 是相对 App 数据目录的路径，
 * audioSize / coverSize 在落盘时记录，设置页的占用统计直接累加这两个字段。
 * 序列化/反序列化沿用歌单与偏好的防御式清洗风格：坏数据一律丢弃，不抛错。
 */
import type { LyricLine } from '../data/types'

export interface TrackIndexEntry {
  /** 曲目文件指纹（与网页版 IndexedDB 的主键一致） */
  key: string
  id: number
  name: string
  artist: string
  album: string
  color: string
  dur: number
  addedAt: number
  lyrics: LyricLine[]
  /** 音频文件相对路径，如 tracks/ab12cd34.mp3 */
  audioPath: string
  /** 音频文件字节数（落盘时实测） */
  audioSize: number
  /** 封面文件相对路径；无封面时为 null */
  coverPath: string | null
  /** 封面文件字节数；无封面时为 0 */
  coverSize: number
  /** 封面缩略图（≤128px）相对路径（1.1.0 起，旧索引无此字段）；无缩略图时为 null */
  thumbPath?: string | null
  /** 缩略图文件字节数；无缩略图时为 0 */
  thumbSize?: number
  /** 封面中图（≤512px）相对路径（1.1.0 起，旧索引无此字段）；无中图时为 null */
  midCoverPath?: string | null
  /** 中图文件字节数；无中图时为 0 */
  midCoverSize?: number
  /** 缩略图是否已生成/确认过（1.1.0 起）；旧索引无此字段视为未确认，恢复时补图 */
  thumbDone?: boolean
}

const AUDIO_DIR = 'tracks'
const COVER_DIR = 'covers'
const THUMB_DIR = 'thumbs'
const MIDCOVER_DIR = 'midcovers'

/** FNV-1a 32 位哈希 → 8 位十六进制。同一 key 永远得到同一文件名，避免 key 中的特殊字符进路径 */
export function keyHash(key: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

/** 取文件名扩展名（小写，不含点）；无扩展名时返回 fallback */
export function extOfFileName(name: string, fallback = 'bin'): string {
  const m = /\.([a-z0-9]{1,10})$/i.exec(name.trim())
  return m ? m[1].toLowerCase() : fallback
}

/** 由 MIME 类型推扩展名（封面落盘用），如 image/jpeg → jpeg；未知返回 fallback */
export function extOfMime(mime: string, fallback = 'jpg'): string {
  const m = /^image\/([a-z0-9.+-]+)$/i.exec(mime.trim())
  if (!m) return fallback
  const sub = m[1].toLowerCase()
  return sub === 'jpeg' ? 'jpg' : sub
}

/** 音频文件相对路径：tracks/<哈希>.<扩展名> */
export function audioRelPath(key: string, fileName: string): string {
  return `${AUDIO_DIR}/${keyHash(key)}.${extOfFileName(fileName)}`
}

/** 封面文件相对路径：covers/<哈希>.<扩展名> */
export function coverRelPath(key: string, mime: string): string {
  return `${COVER_DIR}/${keyHash(key)}.${extOfMime(mime)}`
}

/** 缩略图文件相对路径：thumbs/<哈希>.jpg（生成产物固定 JPEG） */
export function thumbRelPath(key: string): string {
  return `${THUMB_DIR}/${keyHash(key)}.jpg`
}

/** 中图文件相对路径：midcovers/<哈希>.jpg（生成产物固定 JPEG） */
export function midCoverRelPath(key: string): string {
  return `${MIDCOVER_DIR}/${keyHash(key)}.jpg`
}

export const TRACKS_DIR = AUDIO_DIR
export const COVERS_DIR = COVER_DIR
export const THUMBS_DIR = THUMB_DIR
export const MIDCOVERS_DIR = MIDCOVER_DIR
export const INDEX_FILE = 'tracks-index.json'

function cleanString(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function cleanNumber(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0
}

function cleanLyrics(v: unknown): LyricLine[] {
  if (!Array.isArray(v)) return []
  const out: LyricLine[] = []
  for (const item of v) {
    if (item && typeof item === 'object') {
      const t = (item as { t?: unknown }).t
      const text = (item as { text?: unknown }).text
      if (typeof t === 'string' && typeof text === 'string') out.push({ t, text })
    }
  }
  return out
}

function cleanEntry(v: unknown): TrackIndexEntry | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const key = cleanString(o.key)
  const audioPath = cleanString(o.audioPath)
  // key 与音频路径是定位文件的命脉，缺一即视为坏记录丢弃
  if (!key || !audioPath) return null
  const coverPath = typeof o.coverPath === 'string' && o.coverPath ? o.coverPath : null
  const thumbPath = typeof o.thumbPath === 'string' && o.thumbPath ? o.thumbPath : null
  const midCoverPath = typeof o.midCoverPath === 'string' && o.midCoverPath ? o.midCoverPath : null
  return {
    key,
    id: cleanNumber(o.id),
    name: cleanString(o.name),
    artist: cleanString(o.artist),
    album: cleanString(o.album),
    color: cleanString(o.color),
    dur: cleanNumber(o.dur),
    addedAt: cleanNumber(o.addedAt),
    lyrics: cleanLyrics(o.lyrics),
    audioPath,
    audioSize: cleanNumber(o.audioSize),
    coverPath,
    coverSize: coverPath ? cleanNumber(o.coverSize) : 0,
    thumbPath,
    thumbSize: thumbPath ? cleanNumber(o.thumbSize) : 0,
    midCoverPath,
    midCoverSize: midCoverPath ? cleanNumber(o.midCoverSize) : 0,
    thumbDone: o.thumbDone === true,
  }
}

/** 索引 → JSON 文本（写入 tracks-index.json） */
export function serializeTrackIndex(entries: TrackIndexEntry[]): string {
  return JSON.stringify({ version: 1, tracks: entries })
}

/** JSON 文本 → 索引；解析失败或结构不对时返回空数组（按无曲目处理，不抛错） */
export function parseTrackIndex(raw: string | null | undefined): TrackIndexEntry[] {
  if (!raw) return []
  try {
    const data: unknown = JSON.parse(raw)
    const list = (data as { tracks?: unknown })?.tracks
    if (!Array.isArray(list)) return []
    const out: TrackIndexEntry[] = []
    const seen = new Set<string>()
    for (const item of list) {
      const entry = cleanEntry(item)
      if (entry && !seen.has(entry.key)) {
        seen.add(entry.key)
        out.push(entry)
      }
    }
    return out.sort((a, b) => a.addedAt - b.addedAt)
  } catch {
    return []
  }
}

/** 索引内全部文件的总字节数（设置页占用统计用；含 1.1.0 起的缩略图/中图） */
export function totalIndexSize(entries: TrackIndexEntry[]): number {
  return entries.reduce((sum, e) => sum + e.audioSize + e.coverSize + (e.thumbSize ?? 0) + (e.midCoverSize ?? 0), 0)
}
