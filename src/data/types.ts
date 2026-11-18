export interface LyricLine {
  t: string
  text: string
}

export interface Song {
  id: number
  name: string
  artist: string
  album: string
  dur: number
  color: string
  lyrics: LyricLine[]
  audioSrc?: string | null
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
