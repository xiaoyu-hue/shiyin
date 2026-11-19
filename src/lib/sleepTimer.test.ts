import { describe, expect, it } from 'vitest'
import { endsAtFromMinutes, formatRemaining, isSleepDue, remainingMs, SLEEP_PRESETS_MIN } from './sleepTimer'

describe('sleepTimer 睡眠定时纯逻辑', () => {
  it('预设为 15/30/45/60 分钟', () => {
    expect([...SLEEP_PRESETS_MIN]).toEqual([15, 30, 45, 60])
  })

  it('到期时间与剩余计算', () => {
    const now = 1_000_000
    const ends = endsAtFromMinutes(30, now)
    expect(ends).toBe(now + 30 * 60_000)
    expect(remainingMs(ends, now)).toBe(30 * 60_000)
    expect(remainingMs(ends, ends + 5000)).toBe(0)
    expect(remainingMs(null, now)).toBeNull()
  })

  it('到期判断', () => {
    expect(isSleepDue(null, 100)).toBe(false)
    expect(isSleepDue(200, 199)).toBe(false)
    expect(isSleepDue(200, 200)).toBe(true)
  })

  it('剩余显示向上取秒', () => {
    expect(formatRemaining(0)).toBe('00:00')
    expect(formatRemaining(1)).toBe('00:01')
    expect(formatRemaining(59_000)).toBe('00:59')
    expect(formatRemaining(59_500)).toBe('01:00')
    expect(formatRemaining(15 * 60_000)).toBe('15:00')
  })
})
