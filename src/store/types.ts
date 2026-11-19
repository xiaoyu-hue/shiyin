import type { Appearance, Playlist, PlayMode, Song, Tab } from '../data/types'
import type { SortDir, SortKey } from '../lib/library'

/** 播放切片：当前曲目、进度、模式、播放队列与播放动作（架构 §4.4） */
export interface PlayerSlice {
  cur: number
  playing: boolean
  pos: number
  mode: PlayMode
  /** 音频播放错误提示；无错误为 null */
  audioError: string | null
  /** 播放队列：曲目下标的排列（不重复）；queuePos 为当前曲目在队列中的位置 */
  queue: number[]
  queuePos: number
  /** 睡眠定时：分钟模式的到期时间戳（null 为未设）；sleepAfterTrack 为「播完这首停」 */
  sleepEndsAt: number | null
  sleepAfterTrack: boolean
  /** 设置分钟定时（null 取消分钟定时）；与「播完这首」互斥 */
  setSleepMinutes: (min: number | null) => void
  /** 设置「播完这首停」；与分钟定时互斥 */
  setSleepAfterTrack: (v: boolean) => void
  /** 清除全部睡眠定时 */
  clearSleep: () => void
  /** 播放某曲；context 给出时以该列表顺序重建队列（如从专辑页播放） */
  play: (index: number, context?: number[]) => void
  toggle: () => void
  next: () => void
  prev: () => void
  seek: (sec: number) => void
  cycleMode: () => void
  /** 由音频引擎 timeupdate 回调写入实时进度 */
  applyAudioPos: (sec: number) => void
  /** 由音频引擎 ended 回调触发，按播放模式收尾 */
  handleTrackEnd: () => void
  setAudioError: (message: string | null) => void
  /** 把曲目排到当前之后（下一首播放） */
  playNext: (trackIndex: number) => void
  /** 把曲目追加到队列末尾 */
  enqueue: (trackIndex: number) => void
  /** 播放队列中某位置的曲目 */
  playQueueAt: (pos: number) => void
  /** 移除队列中某位置（当前位置不可移除，调用无效果） */
  removeQueueAt: (pos: number) => void
  /** 拖拽重排队列 */
  moveQueue: (from: number, to: number) => void
  /** 整体设置队列顺序（拖拽组件回调用，需与当前队列同元素集） */
  setQueueOrder: (queue: number[]) => void
  /** 清空队列只保留当前曲目 */
  clearQueue: () => void
}

/** 音乐库分段视图 */
export type LibraryView = 'songs' | 'albums' | 'artists' | 'playlists'

/** 音乐库二级详情页：专辑/歌手以名称为键，歌单以 id 为键 */
export interface LibraryDetail {
  kind: 'album' | 'artist' | 'playlist'
  key: string
}

/** 界面切片：导航、覆盖层、搜索关键词、音乐库视图状态 */
export interface UiSlice {
  tab: Tab
  playerOpen: boolean
  lyricOpen: boolean
  query: string
  libraryView: LibraryView
  libraryDetail: LibraryDetail | null
  sortKey: SortKey
  sortDir: SortDir
  /** 单曲操作菜单的目标曲目下标；null 表示菜单关闭 */
  menuTrack: number | null
  queueOpen: boolean
  /** 「我的」二级页面：收藏 / 历史 / 设置；null 为主页 */
  mePage: 'favorites' | 'history' | 'settings' | null
  setTab: (t: Tab) => void
  setPlayerOpen: (v: boolean) => void
  setLyricOpen: (v: boolean) => void
  setQuery: (q: string) => void
  setLibraryView: (v: LibraryView) => void
  setLibraryDetail: (d: LibraryDetail | null) => void
  setSort: (key: SortKey, dir: SortDir) => void
  setMenuTrack: (index: number | null) => void
  setQueueOpen: (v: boolean) => void
  setMePage: (p: 'favorites' | 'history' | 'settings' | null) => void
}

/** 集合切片：曲目列表、收藏、最近播放历史与自建歌单 */
export interface CollectionSlice {
  /** 统一曲目源：全部为用户导入的本地曲目（启动时从 IndexedDB 恢复） */
  tracks: Song[]
  liked: Set<number>
  history: number[]
  playlists: Playlist[]
  toggleLike: (id: number) => void
  addTracks: (list: Song[]) => void
  /** 删除一首曲目并完成全部连带清理（队列/历史下标重映射、收藏/歌单剔除）；持久化删除在 bootstrap 包装 */
  removeTrack: (index: number) => void
  /** 新建歌单，返回新建的歌单（名称为空时返回 null） */
  createPlaylist: (name: string) => Playlist | null
  renamePlaylist: (id: string, name: string) => void
  deletePlaylist: (id: string) => void
  addToPlaylist: (id: string, trackId: number) => void
  removeFromPlaylist: (id: string, trackId: number) => void
}

/** 主题切片：当前主题索引、外观与流畅模式 */
export interface ThemeSlice {
  themeIdx: number
  appearance: Appearance
  /** 流畅模式（1.1.0）：开启时全局关实时毛玻璃走假玻璃，低端机保帧率 */
  smoothMode: boolean
  setTheme: (i: number) => void
  setAppearance: (a: Appearance) => void
  setSmoothMode: (v: boolean) => void
}

export type AppState = PlayerSlice & UiSlice & CollectionSlice & ThemeSlice
