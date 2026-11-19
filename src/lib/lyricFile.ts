/**
 * 外挂歌词文件（.lrc / .txt）的纯逻辑：编码探测解码、同名配对、文本转歌词行。
 * 行业惯例：歌词文件与音频文件同名（仅扩展名不同）。文件读取动作在调用方，
 * 这里只处理字节与字符串，便于单测。
 */
import type { LyricLine } from '../data/types'
import { lyricsFromText } from './audioTags'

const LYRIC_EXTS = ['.lrc', '.txt']

/** 是否歌词文件（按文件名扩展名判断，大小写不敏感） */
export function isLyricFileName(name: string): boolean {
  const lower = name.toLowerCase()
  return LYRIC_EXTS.some((ext) => lower.endsWith(ext))
}

/** 配对键：去掉最后一个扩展名、去首尾空白、转小写（中英文大小写差异不影响配对） */
export function matchKeyOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  const base = dot > 0 ? fileName.slice(0, dot) : fileName
  return base.trim().toLowerCase()
}

/**
 * 把歌词文件字节解码为文本。国内歌词文件常见 GBK/GB18030 与 UTF-16，
 * 策略：BOM 优先 → UTF-8 严格试解（失败说明不是 UTF-8）→ 回退 GB18030。
 * TextDecoder 原生支持这些编码，无需第三方库。
 */
export function decodeLyricBytes(bytes: Uint8Array): string {
  let text: string
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    text = new TextDecoder('utf-8').decode(bytes)
  } else if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    text = new TextDecoder('utf-16le').decode(bytes)
  } else if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    text = new TextDecoder('utf-16be').decode(bytes)
  } else {
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    } catch {
      text = new TextDecoder('gb18030').decode(bytes)
    }
  }
  return text.replace(/^\uFEFF/, '')
}

/** 歌词文件文本 → 歌词行（含时间戳按同步解析，否则按纯文本；空文本返回空数组） */
export function lyricsFromFileText(text: string): LyricLine[] {
  return lyricsFromText(text)
}

/** 读取一个歌词文件并解析为歌词行（解码失败或无有效歌词时返回空数组） */
export async function readLyricFile(file: File): Promise<LyricLine[]> {
  try {
    const buf = await file.arrayBuffer()
    return lyricsFromFileText(decodeLyricBytes(new Uint8Array(buf)))
  } catch {
    return []
  }
}

/**
 * 同名配对：给每个音频文件名找同名的歌词文件下标。
 * 返回 Map<音频下标, 歌词文件下标>；同名歌词有多个时取第一个，未命中不入表。
 */
export function pairLyricFiles(audioNames: readonly string[], lyricNames: readonly string[]): Map<number, number> {
  const byKey = new Map<string, number>()
  lyricNames.forEach((name, i) => {
    const key = matchKeyOf(name)
    if (!byKey.has(key)) byKey.set(key, i)
  })
  const pairs = new Map<number, number>()
  audioNames.forEach((name, i) => {
    const hit = byKey.get(matchKeyOf(name))
    if (hit !== undefined) pairs.set(i, hit)
  })
  return pairs
}
