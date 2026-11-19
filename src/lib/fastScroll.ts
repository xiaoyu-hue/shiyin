/**
 * 快速滚动条的纯映射逻辑（1.2.0）：拇指位置比例 ↔ 滚动位置 ↔ 目标条目索引。
 * 全部做钳制与非法值兜底，组件只负责 DOM 读写与手势。
 */

/** 把任意数钳到 [0,1]；非有限数按 0 处理 */
export function clamp01(v: number): number {
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0
}

/** 当前滚动位置对应的比例；内容不可滚动（高度不足）时为 0 */
export function fractionForScroll(scrollTop: number, scrollHeight: number, clientHeight: number): number {
  const range = scrollHeight - clientHeight
  if (range <= 0) return 0
  return clamp01(scrollTop / range)
}

/** 比例 → 应写入的 scrollTop */
export function scrollTopForFraction(fraction: number, scrollHeight: number, clientHeight: number): number {
  const range = Math.max(0, scrollHeight - clientHeight)
  return clamp01(fraction) * range
}

/** 比例 → 目标条目索引（0..count-1）；列表为空返回 -1 */
export function indexForFraction(fraction: number, count: number): number {
  if (count <= 0) return -1
  return Math.min(count - 1, Math.floor(clamp01(fraction) * count))
}

/** 指针在轨道内的纵向位置 → 比例 */
export function fractionForPointer(clientY: number, trackTop: number, trackHeight: number): number {
  if (trackHeight <= 0) return 0
  return clamp01((clientY - trackTop) / trackHeight)
}

/**
 * 拖动气泡的文案：只有按歌名排序时才报目标歌曲首字母——那是真实的位置信息；
 * 其余排序（导入时间 / 歌手 / 歌单内顺序）报百分比，不拿字母糊弄用户。
 */
export function bubbleLabel(
  sortKey: 'addedAt' | 'name' | 'artist' | null,
  targetName: string | undefined,
  fraction: number,
): string {
  if (sortKey === 'name' && targetName) {
    const ch = targetName.trim().charAt(0)
    if (ch) return ch.toUpperCase()
  }
  return `${Math.round(clamp01(fraction) * 100)}%`
}
