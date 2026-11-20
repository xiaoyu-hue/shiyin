import { describe, it, expect } from 'vitest'
import { clamp01, ratioFromClientX, secondsAtRatio, ratioOfSeconds } from './seekbar'

describe('seekbar 换算（1.4.0）', () => {
  it('clamp01 钳制并处理非有限值', () => {
    expect(clamp01(-0.5)).toBe(0)
    expect(clamp01(0.4)).toBe(0.4)
    expect(clamp01(2)).toBe(1)
    expect(clamp01(Number.NaN)).toBe(0)
  })

  it('ratioFromClientX 按轨道位置换算，越界钳制', () => {
    const rect = { left: 100, width: 200 }
    expect(ratioFromClientX(100, rect)).toBe(0)
    expect(ratioFromClientX(200, rect)).toBe(0.5)
    expect(ratioFromClientX(400, rect)).toBe(1)
    expect(ratioFromClientX(50, rect)).toBe(0)
    expect(ratioFromClientX(150, { left: 0, width: 0 })).toBe(0)
  })

  it('secondsAtRatio / ratioOfSeconds 互逆且时长异常回 0', () => {
    expect(secondsAtRatio(0.25, 240)).toBe(60)
    expect(ratioOfSeconds(60, 240)).toBe(0.25)
    expect(secondsAtRatio(0.5, 0)).toBe(0)
    expect(ratioOfSeconds(10, Number.NaN)).toBe(0)
    expect(ratioOfSeconds(999, 240)).toBe(1)
  })
})
