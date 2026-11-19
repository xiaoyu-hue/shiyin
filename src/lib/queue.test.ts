import { describe, expect, it } from 'vitest'
import {
  appendToQueue,
  insertNext,
  moveInQueue,
  naturalQueue,
  posOf,
  remapAfterRemove,
  remapCurrent,
  removeAtPos,
} from './queue'

describe('naturalQueue / posOf', () => {
  it('生成自然顺序并定位', () => {
    expect(naturalQueue(4)).toEqual([0, 1, 2, 3])
    expect(naturalQueue(0)).toEqual([])
    expect(posOf([5, 3, 9], 3)).toBe(1)
    expect(posOf([5, 3, 9], 7)).toBe(0)
    expect(posOf([], 1)).toBe(0)
  })
})

describe('insertNext 下一首播放', () => {
  it('不在队列时插入到当前之后', () => {
    expect(insertNext([0, 1, 2], 0, 9)).toEqual([0, 9, 1, 2])
  })

  it('已在队列时移动到当前之后（不重复）', () => {
    expect(insertNext([0, 1, 2, 3], 0, 3)).toEqual([0, 3, 1, 2])
    expect(insertNext([0, 1, 2, 3], 2, 0)).toEqual([1, 2, 0, 3])
  })

  it('当前就是它时保持顺序', () => {
    expect(insertNext([0, 1, 2], 1, 1)).toEqual([0, 1, 2])
  })

  it('空队列插入', () => {
    expect(insertNext([], 0, 5)).toEqual([5])
  })
})

describe('appendToQueue / moveInQueue / removeAtPos', () => {
  it('追加去重', () => {
    expect(appendToQueue([0, 1], 2)).toEqual([0, 1, 2])
    expect(appendToQueue([0, 1, 2], 0)).toEqual([1, 2, 0])
  })

  it('拖拽移动与越界保护', () => {
    expect(moveInQueue([0, 1, 2, 3], 0, 2)).toEqual([1, 2, 0, 3])
    expect(moveInQueue([0, 1, 2, 3], 3, 0)).toEqual([3, 0, 1, 2])
    expect(moveInQueue([0, 1], 5, 0)).toEqual([0, 1])
    expect(moveInQueue([0, 1], 0, 0)).toEqual([0, 1])
  })

  it('按位置移除', () => {
    expect(removeAtPos([0, 1, 2], 1)).toEqual([0, 2])
  })
})

describe('删除曲目后的重映射', () => {
  it('remapAfterRemove 剔除并左移', () => {
    expect(remapAfterRemove([0, 2, 3, 5], 2)).toEqual([0, 2, 4])
    expect(remapAfterRemove([1, 1], 0)).toEqual([0, 0])
    expect(remapAfterRemove([], 3)).toEqual([])
  })

  it('remapCurrent 三种情形', () => {
    expect(remapCurrent(5, 2, 9)).toBe(4) // 当前在被删之后
    expect(remapCurrent(2, 2, 9)).toBe(2) // 删的就是当前（顺延到下一首位置）
    expect(remapCurrent(9, 9, 9)).toBe(8) // 删的是末尾当前
    expect(remapCurrent(1, 4, 9)).toBe(1) // 当前在被删之前
    expect(remapCurrent(0, 0, 0)).toBe(0) // 删空
  })
})
