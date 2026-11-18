import { describe, it, expect, vi } from 'vitest'
import { stepIndex, shuffleIndex, onTail } from './player'

describe('stepIndex 环形前后切', () => {
  it('向后一步', () => {
    expect(stepIndex(5, 0, 1)).toBe(1)
    expect(stepIndex(5, 4, 1)).toBe(0)
  })
  it('向前一步（含负索引回绕）', () => {
    expect(stepIndex(5, 0, -1)).toBe(4)
    expect(stepIndex(5, 2, -1)).toBe(1)
  })
  it('空集合返回 0', () => expect(stepIndex(0, 0, 1)).toBe(0))
})

describe('shuffleIndex 随机不越界', () => {
  it('集合为 1 时恒返回 0', () => expect(shuffleIndex(1, 0)).toBe(0))
  it('结果在 [0, len) 内', () => {
    for (let i = 0; i < 100; i += 1) {
      const r = shuffleIndex(8, 3)
      expect(r).toBeGreaterThanOrEqual(0)
      expect(r).toBeLessThan(8)
    }
  })
  it('大于 1 时排除当前曲', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    expect(shuffleIndex(8, 3)).not.toBe(3)
    vi.restoreAllMocks()
  })
})

describe('onTail 尾曲处理', () => {
  it('单曲重播', () => expect(onTail('repeat', 8, 7)).toEqual({ kind: 'replay' }))
  it('列表模式切到下一首（环形）', () => expect(onTail('list', 8, 7)).toEqual({ kind: 'next', index: 0 }))
  it('随机模式产出 shuffle 动作且不越界', () => {
    const r = onTail('shuffle', 8, 7)
    expect(r.kind).toBe('shuffle')
    if (r.kind === 'shuffle') {
      expect(r.index).toBeGreaterThanOrEqual(0)
      expect(r.index).toBeLessThan(8)
    }
  })
})
