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

/** 时长阶梯（秒）：微反馈 / 常规 / 从容 */
export const durationFast = 0.15
export const durationBase = 0.2
export const durationSlow = 0.35

/** 弹层遮罩淡入淡出：全站统一 */
export const scrimTransition = { duration: 0.18, ease: 'easeOut' } as const

/** 通用淡入淡出 */
export const fadeTransition = { duration: durationBase, ease: 'easeOut' } as const

/** 主标签页切换 */
export const pageTransition = { duration: 0.22, ease: 'easeOut' } as const

/** Toast 统一停留时长（毫秒）：所有轻反馈一个节奏 */
export const TOAST_DURATION_MS = 2200
