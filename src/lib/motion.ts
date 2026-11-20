/**
 * 统一动效配置（架构任务 4.4；1.4.0 令牌收口）。
 * 全站动画只许引用这里的弹簧 / 时长 / 曲线，禁止各组件再手写魔法数——
 * 同一语义（全屏层、底部抽屉、浮动条、遮罩）在任何界面必须同一手感。
 * 此前同种抽屉并存 320/34、300/30、320/30 三组参数、遮罩 0.18s 四处
 * 硬编码，就是从这里开始收口的（审计-UIUX现状 维度五-1）。
 */

/** 全屏覆盖层（播放页）：整页上滑，稍硬朗 */
export const springSheet = { type: 'spring', stiffness: 320, damping: 34 } as const

/** 底部抽屉（队列 / 单曲菜单 / 睡眠菜单 / 海报）：全站统一一组 */
export const springDrawer = { type: 'spring', stiffness: 300, damping: 30 } as const

/** 浮动操作条（多选批量条入场） */
export const springBar = { type: 'spring', stiffness: 320, damping: 30 } as const

/** 轻量浮动元素（Toast、提示气泡）：柔和一些 */
export const springGentle = { type: 'spring', stiffness: 260, damping: 26 } as const

/** 小元素回弹（封面呼吸、拇指放大后的回落） */
export const springSnappy = { type: 'spring', stiffness: 420, damping: 32 } as const

/** 常规时长（秒）：通用淡入淡出等（审计 A-33：未被引用的 fast/slow 两档已删） */
export const durationBase = 0.2

/** 手势阈值收口（审计 A-49）：全站同类手势共用同一组数，禁止组件内再写魔法数 */
/** 列表行右滑「下一首播放」触发位移（px） */
export const SWIPE_NEXT_PX = 72
/** 横滑切歌触发位移（px）：迷你条与播放页封面区共用 */
export const SWIPE_TRACK_PX = 60
/** 下拉关闭的位移阈值（px）：抽屉与全屏播放页共用 */
export const SHEET_CLOSE_OFFSET_PX = 110
/** 抽屉下拉关闭的速度阈值（px/s） */
export const SHEET_CLOSE_VELOCITY = 550
/** 全屏播放页下拉关闭的速度阈值（px/s）：面积大、误关代价高，略高于抽屉 */
export const PAGE_CLOSE_VELOCITY = 600

/** 弹层遮罩淡入淡出：全站统一 */
export const scrimTransition = { duration: 0.18, ease: 'easeOut' } as const

/** 通用淡入淡出 */
export const fadeTransition = { duration: durationBase, ease: 'easeOut' } as const

/** 主标签页切换 */
export const pageTransition = { duration: 0.22, ease: 'easeOut' } as const

/** 氛围背景交叉淡化（切歌时新旧氛围图叠化，从容一些） */
export const crossfadeTransition = { duration: 0.6, ease: 'easeOut' } as const

/** Toast 统一停留时长（毫秒）：所有轻反馈一个节奏 */
export const TOAST_DURATION_MS = 2200
