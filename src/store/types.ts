import type { PlayMode, Tab } from '../data/types'

/** 播放切片：当前曲目、进度、模式与播放动作（架构 §4.4） */
export interface PlayerSlice {
  cur: number
  playing: boolean
  pos: number
  mode: PlayMode
  play: (index: number) => void
  toggle: () => void
  next: () => void
  prev: () => void
  tick: () => void
  seek: (sec: number) => void
  cycleMode: () => void
}

/** 界面切片：导航、覆盖层、搜索关键词 */
export interface UiSlice {
  tab: Tab
  playerOpen: boolean
  lyricOpen: boolean
  query: string
  setTab: (t: Tab) => void
  setPlayerOpen: (v: boolean) => void
  setLyricOpen: (v: boolean) => void
  setQuery: (q: string) => void
}

/** 集合切片：收藏与最近播放历史 */
export interface CollectionSlice {
  liked: Set<number>
  history: number[]
  toggleLike: (id: number) => void
}

/** 主题切片：当前主题索引 */
export interface ThemeSlice {
  themeIdx: number
  setTheme: (i: number) => void
}

export type AppState = PlayerSlice & UiSlice & CollectionSlice & ThemeSlice
