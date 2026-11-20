import { describe, expect, it, vi } from 'vitest'
import { PromiseCache } from './promiseCache'

describe('PromiseCache 有界缓存（审计 A-38）', () => {
  it('同键并发共享同一次计算，create 只调用一次', async () => {
    const cache = new PromiseCache<string>(8)
    const create = vi.fn(async () => 'v1')
    const p1 = cache.getOrCreate('k', create)
    const p2 = cache.getOrCreate('k', create)
    expect(p1).toBe(p2)
    await expect(p1).resolves.toBe('v1')
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('异键各自计算', async () => {
    const cache = new PromiseCache<number>(8)
    await expect(cache.getOrCreate('a', async () => 1)).resolves.toBe(1)
    await expect(cache.getOrCreate('b', async () => 2)).resolves.toBe(2)
    expect(cache.size).toBe(2)
  })

  it('超容量按插入顺序淘汰最旧键，被淘汰键重新计算', async () => {
    const cache = new PromiseCache<string>(2)
    const mk = (v: string) => vi.fn(async () => v)
    const a1 = mk('a1')
    await cache.getOrCreate('a', a1)
    await cache.getOrCreate('b', mk('b'))
    await cache.getOrCreate('c', mk('c'))
    expect(cache.size).toBe(2)
    expect(cache.has('a')).toBe(false)
    expect(cache.has('b')).toBe(true)
    expect(cache.has('c')).toBe(true)
    const a2 = mk('a2')
    await expect(cache.getOrCreate('a', a2)).resolves.toBe('a2')
    expect(a2).toHaveBeenCalledTimes(1)
  })

  it('失败结果同样占位缓存，不自动重试', async () => {
    const cache = new PromiseCache<string>(8)
    const create = vi.fn(async (): Promise<string> => {
      throw new Error('boom')
    })
    await expect(cache.getOrCreate('x', create)).rejects.toThrow('boom')
    await expect(cache.getOrCreate('x', create)).rejects.toThrow('boom')
    expect(create).toHaveBeenCalledTimes(1)
  })
})
