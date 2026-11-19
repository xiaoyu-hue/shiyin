import { describe, expect, it } from 'vitest'
import { shouldShowOnboarding } from './onboarding'

describe('shouldShowOnboarding 首启引导触发判断', () => {
  it('恢复完成 + 空库 + 未引导过 → 显示', () => {
    expect(shouldShowOnboarding({ restored: true, trackCount: 0, onboarded: false })).toBe(true)
  })

  it('恢复尚未完成 → 不显示（避免恢复途中误判空库）', () => {
    expect(shouldShowOnboarding({ restored: false, trackCount: 0, onboarded: false })).toBe(false)
  })

  it('曲库非空 → 不显示', () => {
    expect(shouldShowOnboarding({ restored: true, trackCount: 3, onboarded: false })).toBe(false)
  })

  it('已引导过 → 不再显示', () => {
    expect(shouldShowOnboarding({ restored: true, trackCount: 0, onboarded: true })).toBe(false)
  })
})
