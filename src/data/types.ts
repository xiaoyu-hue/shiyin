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
  /** 本地导入曲目的音频地址（blob URL） */
  audioSrc?: string | null
  /** 内嵌封面图的运行时地址（blob URL）；无内嵌封面时为空，界面回退渐变色块 */
  coverSrc?: string | null
  /** 内嵌封面图原图数据，仅用于持久化落盘；运行时展示用 coverSrc */
  coverBlob?: Blob | null
  /** 本地曲目的文件指纹，用于去重与持久化定位 */
  localKey?: string
}

export interface Theme {
  slug: string
  name: string
  accent: string
  bg: string
  bgEnd: string
}

export type PlayMode = 'list' | 'repeat' | 'shuffle'
export type Tab = 'home' | 'search' | 'explore' | 'me'
