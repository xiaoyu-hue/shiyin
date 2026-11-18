/**
 * 统一动效配置（架构任务 4.4）。
 * 集中管理转场参数，保证全应用动画风格一致，避免各处硬编码。
 */

/** 覆盖层（全屏播放器）上滑转场 */
export const sheetTransition = { type: 'spring', stiffness: 320, damping: 34 } as const

/** 通用淡入淡出 */
export const fadeTransition = { duration: 0.2, ease: 'easeOut' } as const
