export interface LyricLine {
  t: string
  text: string
}

export interface Song {
  id: number
  name: string
  artist: string
  album: string
  /** 时长（秒）。本地导入曲目以音频文件实际时长为准，未知时为 0 */
  dur: number
  color: string
  lyrics: LyricLine[]
  /** 本地导入曲目的音频地址（blob URL）；示例曲目为空，不产生声音 */
  audioSrc?: string | null
  /** 本地曲目的文件指纹，用于去重与持久化定位 */
  localKey?: string
  /** 来源。缺省视为示例数据 */
  source?: 'sample' | 'local'
}

export interface Theme {
  slug: string
  name: string
  accent: string
  bg: string
  bgEnd: string
}

export interface PlaySet {
  name: string
  meta: string
  color: string
}

export type PlayMode = 'list' | 'repeat' | 'shuffle'
export type Tab = 'home' | 'search' | 'explore' | 'me'
