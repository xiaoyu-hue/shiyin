import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from './index'

/** 切片组装后对外 API 与新增内存态行为的测试 */
describe('store 切片组装与状态动作', () => {
  beforeEach(() => {
    const s = useStore.getState()
    s.setTab('home')
    s.setPlayerOpen(false)
    s.setLyricOpen(false)
    s.setQuery('')
    while (useStore.getState().mode !== 'list') useStore.getState().cycleMode()
    useStore.setState({ liked: new Set(), history: [], pos: 0, playing: false, cur: 0 })
  })

  it('四个切片的初始态字段都存在', () => {
    const s = useStore.getState()
    expect(s.tab).toBe('home') // ui
    expect(s.cur).toBe(0) // player
    expect(s.liked).toBeInstanceOf(Set) // collection
    expect(s.themeIdx).toBeGreaterThanOrEqual(0) // theme
  })

  it('play 写入历史且当前曲去重前置', () => {
    useStore.getState().play(3)
    useStore.getState().play(5)
    useStore.getState().play(3)
    const { history, cur } = useStore.getState()
    expect(cur).toBe(3)
    expect(history[0]).toBe(3)
    expect(history.filter((i) => i === 3).length).toBe(1)
    expect(history).toEqual([3, 5]) // 3 去重后前置，5 保留在后
  })

  it('toggleLike 增删收藏互逆', () => {
    useStore.getState().toggleLike(2)
    expect(useStore.getState().liked.has(2)).toBe(true)
    useStore.getState().toggleLike(2)
    expect(useStore.getState().liked.has(2)).toBe(false)
  })

  it('setLyricOpen 切换歌词页状态', () => {
    expect(useStore.getState().lyricOpen).toBe(false)
    useStore.getState().setLyricOpen(true)
    expect(useStore.getState().lyricOpen).toBe(true)
  })

  it('seek 不接受负数', () => {
    useStore.getState().seek(-5)
    expect(useStore.getState().pos).toBe(0)
  })
})
