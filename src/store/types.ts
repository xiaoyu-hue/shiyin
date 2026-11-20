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
  /** 批量下一首播放（1.2.0 多选）：整批移到当前之后，保持入参顺序、队列内不重复 */
  playNextMany: (trackIndices: number[]) => void
  /** 批量追加到队列末尾（1.2.0）：整批移动/追加，保持入参顺序、队列内不重复 */
  enqueueMany: (trackIndices: number[]) => void
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
  /**
   * 多选模式（1.2.0）：null 表示未进入多选；否则为已选中的曲目下标列表。
   * 状态集中放这里，各列表组件只读不各自维护。
   */
  selection: number[] | null
  /** 进入多选时所在列表的全部下标（全选与批量动作排序的依据） */
  selectionScope: number[]
  /** 本地曲目恢复是否已完成（首启引导据此避免恢复途中误判空库） */
  restored: boolean
  /** 轻反馈 Toast（1.4.0）：当前提示（id 递增，同文案连发也重新计时）；null 为无提示 */
  toast: { id: number; message: string } | null
  /** 底部导航/迷你条紧凑态（1.4.0）：列表向下滚动时收缩让位，由 App 滚动监听写入 */
  chromeCompact: boolean
  /** 「我的」二级页面：收藏 / 历史 / 设置 / 开源许可；null 为主页 */
  mePage: 'favorites' | 'history' | 'settings' | 'licenses' | null
  setTab: (t: Tab) => void
  setPlayerOpen: (v: boolean) => void
  /** 打开播放页，但多选模式下不打断多选（审计 A-31：6 处复制守卫的收口） */
  openPlayerUnlessSelecting: () => void
  setLyricOpen: (v: boolean) => void
  setQuery: (q: string) => void
  setLibraryView: (v: LibraryView) => void
  setLibraryDetail: (d: LibraryDetail | null) => void
  setSort: (key: SortKey, dir: SortDir) => void
  setMenuTrack: (index: number | null) => void
  setQueueOpen: (v: boolean) => void
  /** 长按一行进入多选并选中它；scope 为该列表的全部下标 */
  enterSelection: (index: number, scope: number[]) => void
  /** 多选模式下切换一首的选中状态（不在多选模式时无效果） */
  toggleSelected: (index: number) => void
  /** 全选当前列表（scope 全部） */
  selectAllSelection: () => void
  /** 清空已选但留在多选模式（顶部「取消全选」用） */
  clearSelection: () => void
  /** 退出多选模式 */
  exitSelection: () => void
  setRestored: (v: boolean) => void
  setMePage: (p: 'favorites' | 'history' | 'settings' | 'licenses' | null) => void
  /** 弹出一则轻反馈（静默操作的统一确认通道） */
  showToast: (message: string) => void
  /** 关掉指定 id 的 Toast（过期 id 不误关新提示） */
  clearToast: (id: number) => void
  setChromeCompact: (v: boolean) => void
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
  /** 批量删除（1.2.0 多选）：内部从大到小逐个走单删逻辑，连带清理规则与单删一致 */
  removeTracks: (indices: number[]) => void
  /** 新建歌单，返回新建的歌单（名称为空时返回 null） */
  createPlaylist: (name: string) => Playlist | null
  renamePlaylist: (id: string, name: string) => void
  deletePlaylist: (id: string) => void
  addToPlaylist: (id: string, trackId: number) => void
  /** 批量加入歌单（1.2.0）：已在歌单内的不重复添加 */
  addManyToPlaylist: (id: string, trackIds: number[]) => void
  removeFromPlaylist: (id: string, trackId: number) => void
}

/** 主题切片：当前主题索引、外观与随偏好一同落盘的开关项 */
export interface ThemeSlice {
  themeIdx: number
  appearance: Appearance
  /** 流畅模式（1.1.0）：开启时全局关实时毛玻璃走假玻璃，低端机保帧率 */
  smoothMode: boolean
  /** 播放页全屏滑动切歌（1.2.0）：开启后播放页任意处横滑也可切歌，默认关 */
  swipeAnywhere: boolean
  /** 首启导入引导是否已完成（1.2.0）：完成或跳过后不再弹引导 */
  onboarded: boolean
  setTheme: (i: number) => void
  setAppearance: (a: Appearance) => void
  setSmoothMode: (v: boolean) => void
  setSwipeAnywhere: (v: boolean) => void
  setOnboarded: (v: boolean) => void
}

export type AppState = PlayerSlice & UiSlice & CollectionSlice & ThemeSlice
