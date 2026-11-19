/**
 * 睡眠定时的纯逻辑：预设、剩余时间计算与到期判断。
 * 状态存在 store（sleepEndsAt / sleepAfterTrack），这里只做计算。
 */

/** 分钟预设（菜单展示用） */
export const SLEEP_PRESETS_MIN = [15, 30, 45, 60] as const

/** 由分钟数算到期时间戳 */
export function endsAtFromMinutes(min: number, now: number): number {
  return now + min * 60_000
}

/** 剩余毫秒（无定时返回 null；已到期返回 0） */
export function remainingMs(endsAt: number | null, now: number): number | null {
  if (endsAt === null) return null
  return Math.max(0, endsAt - now)
}

/** 是否已到期（无定时为 false） */
export function isSleepDue(endsAt: number | null, now: number): boolean {
  return endsAt !== null && now >= endsAt
}

/** 剩余时间显示 mm:ss（向上取秒，避免显示 00:00 还没停） */
export function formatRemaining(ms: number): string {
  const totalSec = Math.ceil(Math.max(0, ms) / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
