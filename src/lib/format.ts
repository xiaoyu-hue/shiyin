/** 解析 "mm:ss" 为秒；非法输入返回 0 */
export function toSeconds(t: string): number {
  if (typeof t !== 'string') return 0
  const parts = t.split(':')
  if (parts.length !== 2) return 0
  const m = Number(parts[0])
  const s = Number(parts[1])
  if (!Number.isFinite(m) || !Number.isFinite(s)) return 0
  return Math.max(0, m * 60 + s)
}

/** 秒 → mm:ss；非法 / 负数按 0 处理 */
export function fmtTime(sec: number): string {
  if (!Number.isFinite(sec)) return '00:00'
  const s = Math.max(0, Math.floor(sec))
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** 进度百分比（0–100）；除零兜底返回 0 */
export function pct(pos: number, dur: number): number {
  if (!Number.isFinite(dur) || dur <= 0) return 0
  return Math.min(100, Math.max(0, (pos / dur) * 100))
}
