import type { Song } from '../data/types'

const AUDIO_EXT = /\.(mp3|m4a|m4b|aac|wav|flac|ogg|oga|opus|weba|webm|aif|aiff)$/i

/** 封面渐变色池，与内置主题色系保持一致 */
const COVER_COLORS = ['#7B5738', '#B83D5A', '#9B4E10', '#127C77', '#365FA3', '#7C4DA1', '#8C6239', '#4A6FA5']

export function isAudioFile(file: File): boolean {
  if (file.type.startsWith('audio/')) return true
  return AUDIO_EXT.test(file.name)
}

export function stripExtension(name: string): string {
  return name.replace(AUDIO_EXT, '')
}

const hasCJK = (s: string) => /[\u4e00-\u9fa5]/.test(s)

/**
 * 从文件名推断曲名与歌手。
 * 约定（与主流标签工具一致）：
 * - 带空格的连字符一律视为分隔符，"Simon - Garfunkel" → 歌手 Simon / 歌名 Garfunkel；
 * - 不带空格的连字符，仅当两侧至少一侧含中文时才拆分，避免误伤 "Lo-Fi" 这类名称；
 * - 其余情况整段作为歌名，歌手记为「本地音乐」。
 */
export function parseTrackName(raw: string): { name: string; artist: string } {
  const base = stripExtension(raw)
    .replace(/^\s*\d{1,3}\s*[.、_-]\s*/, '')
    .trim()

  const spaced = base.split(/\s+[-–—]\s+/)
  if (spaced.length >= 2) {
    const artist = spaced[0].trim()
    const name = spaced.slice(1).join(' - ').trim()
    if (artist && name) return { name, artist }
  }

  const tight = base.match(/^(.{1,40}?)\s*[-–—]\s*(.{1,80})$/)
  if (tight) {
    const left = tight[1].trim()
    const right = tight[2].trim()
    if (left && right && (hasCJK(left) || hasCJK(right))) return { artist: left, name: right }
  }

  return { name: base || stripExtension(raw), artist: '本地音乐' }
}

/** 读取音频真实时长（秒）；失败或超时返回 0，不阻塞导入 */
export function readDuration(src: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio()
    let settled = false
    const done = (value: number) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      audio.removeAttribute('src')
      audio.load()
      resolve(value)
    }
    const timer = window.setTimeout(() => done(0), 8000)
    audio.preload = 'metadata'
    audio.addEventListener('loadedmetadata', () => {
      done(Number.isFinite(audio.duration) ? Math.round(audio.duration) : 0)
    })
    audio.addEventListener('error', () => done(0))
    audio.src = src
  })
}

/** 由文件名稳定取色，保证同一首歌每次导入封面一致 */
export function pickCover(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 100000
  return COVER_COLORS[hash % COVER_COLORS.length]
}

/** 同一文件的稳定标识，用于去重与持久化主键 */
export function fileKey(file: File): string {
  return `${file.name}::${file.size}::${file.lastModified}`
}

/** 把用户选择的音频文件转成曲目（含 blob URL 与真实时长） */
export async function buildLocalTrack(file: File, id: number): Promise<Song> {
  const { name, artist } = parseTrackName(file.name)
  const audioSrc = URL.createObjectURL(file)
  const dur = await readDuration(audioSrc)
  return {
    id,
    name,
    artist,
    album: '本地音乐',
    dur,
    color: pickCover(name),
    lyrics: [],
    audioSrc,
    source: 'local',
  }
}
