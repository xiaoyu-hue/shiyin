import { describe, it, expect, beforeAll } from 'vitest'
import { useStore } from './index'
import { bindPrefsPersistence, restorePrefs } from './bootstrap'

/** 内存版 localStorage 桩，供 node 测试环境使用 */
class MemoryStorage {
  private map = new Map<string, string>()
  getItem(key: string): string | null {
    return this.map.get(key) ?? null
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value)
  }
  removeItem(key: string): void {
    this.map.delete(key)
  }
  clear(): void {
    this.map.clear()
  }
}

const storage = new MemoryStorage()

beforeAll(() => {
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
  bindPrefsPersistence()
})

describe('偏好持久化装配', () => {
  it('收藏 / 历史 / 主题变化会写回存储', () => {
    storage.clear()
    const s = useStore.getState()
    s.toggleLike(4)
    s.play(2)
    s.setTheme(1)

    const raw = storage.getItem('shiyin:prefs:v1')
    expect(raw).toBeTruthy()
    const saved = JSON.parse(raw!) as { liked: number[]; history: number[]; themeIdx: number }
    expect(saved.liked).toEqual([4])
    expect(saved.history).toEqual([2])
    expect(saved.themeIdx).toBe(1)
  })

  it('无关状态变化不触发写入', () => {
    const before = storage.getItem('shiyin:prefs:v1')
    useStore.getState().setQuery('无关关键词')
    useStore.getState().setTab('search')
    expect(storage.getItem('shiyin:prefs:v1')).toBe(before)
  })

  it('restorePrefs 能把已保存的偏好恢复进 store', () => {
    // 先把 store 改成不同状态，再直接写入存储原文（绕过订阅回写），然后恢复
    useStore.setState({ liked: new Set(), history: [], themeIdx: 0 })
    storage.setItem('shiyin:prefs:v1', JSON.stringify({ v: 1, liked: [4], history: [2], themeIdx: 1 }))
    restorePrefs()
    const s = useStore.getState()
    expect([...s.liked]).toEqual([4])
    expect(s.history).toEqual([2])
    expect(s.themeIdx).toBe(1)
  })

  it('存储为空时 restorePrefs 不改动现有状态', () => {
    useStore.setState({ liked: new Set([9]), history: [7], themeIdx: 3 })
    storage.clear() // 在状态写入之后清空，确保恢复时读到的是空存储
    restorePrefs()
    const s = useStore.getState()
    expect([...s.liked]).toEqual([9])
    expect(s.history).toEqual([7])
    expect(s.themeIdx).toBe(3)
  })
})
