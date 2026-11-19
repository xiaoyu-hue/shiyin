import { describe, expect, it, vi } from 'vitest'
import { createBackDispatcher } from './backStack'

describe('createBackDispatcher（返回分发栈）', () => {
  it('没有登记时 dispatch 返回 false', () => {
    const d = createBackDispatcher()
    expect(d.dispatch()).toBe(false)
    expect(d.size()).toBe(0)
  })

  it('后登记的先被问：最上层处理后不再往下问', () => {
    const d = createBackDispatcher()
    const lower = vi.fn(() => true)
    const upper = vi.fn(() => true)
    d.register(lower)
    d.register(upper)
    expect(d.dispatch()).toBe(true)
    expect(upper).toHaveBeenCalledTimes(1)
    expect(lower).not.toHaveBeenCalled()
  })

  it('上层返回 false 时继续问下层', () => {
    const d = createBackDispatcher()
    const lower = vi.fn(() => true)
    const upper = vi.fn(() => false)
    d.register(lower)
    d.register(upper)
    expect(d.dispatch()).toBe(true)
    expect(upper).toHaveBeenCalledTimes(1)
    expect(lower).toHaveBeenCalledTimes(1)
  })

  it('全部返回 false 时 dispatch 返回 false', () => {
    const d = createBackDispatcher()
    d.register(() => false)
    d.register(() => false)
    expect(d.dispatch()).toBe(false)
  })

  it('注销后不再被问；重复注销无副作用', () => {
    const d = createBackDispatcher()
    const handler = vi.fn(() => true)
    const off = d.register(handler)
    off()
    off()
    expect(d.size()).toBe(0)
    expect(d.dispatch()).toBe(false)
    expect(handler).not.toHaveBeenCalled()
  })

  it('处理器在处理中注销自己不影响本次分发结果', () => {
    const d = createBackDispatcher()
    let off: () => void = () => undefined
    off = d.register(() => {
      off()
      return true
    })
    expect(d.dispatch()).toBe(true)
    expect(d.size()).toBe(0)
  })
})
