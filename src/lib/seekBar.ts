/** 进度条纯逻辑（1.4.0）：指针位置 ↔ 播放秒数的换算，组件只管渲染 */

export function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(1, v))
}

/** 指针横坐标 → 轨道比例（0–1，已钳制；轨道宽度为 0 时回 0） */
export function ratioFromClientX(clientX: number, rect: { left: number; width: number }): number {
  if (!rect.width) return 0
  return clamp01((clientX - rect.left) / rect.width)
}

/** 比例 → 秒数 */
export function secondsAtRatio(ratio: number, duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0
  return clamp01(ratio) * duration
}

/** 秒数 → 比例（时长未知/为 0 时回 0） */
export function ratioOfSeconds(seconds: number, duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0
  return clamp01(seconds / duration)
}
