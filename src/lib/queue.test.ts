import { describe, expect, it } from 'vitest'
import {
  appendManyToQueue,
  appendToQueue,
  insertManyNext,
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

describe('insertManyNext / appendManyToQueue 批量防重（1.2.0）', () => {
  it('整批插到当前之后并保持批内顺序', () => {
    expect(insertManyNext([0, 1, 2, 3, 4], 0, [3, 2])).toEqual([0, 3, 2, 1, 4])
    expect(insertManyNext([0, 1, 2], 1, [8, 9])).toEqual([0, 1, 8, 9, 2])
  })

  it('已在队列的成员先摘出再插入，不产生重复', () => {
    const out = insertManyNext([0, 1, 2, 3], 0, [2, 3])
    expect(out).toEqual([0, 2, 3, 1])
    expect(new Set(out).size).toBe(out.length)
  })

  it('批内含当前曲目：当前留原位，其余排到其后，当前下标不变', () => {
    const queue = [0, 1, 2, 3]
    const out = insertManyNext(queue, 1, [1, 3, 0])
    expect(out).toEqual([1, 3, 0, 2])
    expect(posOf(out, 1)).toBe(0) // 注意：0 被摘出后当前曲目位置随之修正（posOf 反推即为新位置）
    expect(out.filter((t) => t === 1)).toHaveLength(1)
  })

  it('移动后当前曲目的新位置可由 posOf 正确反推（当前在被移动成员之后）', () => {
    // 当前曲目 3 原在位置 3，把它前面的 0 移到它后面后，它应左移到位置 2
    const out = insertManyNext([0, 1, 2, 3], 3, [0])
    expect(out).toEqual([1, 2, 3, 0])
    expect(posOf(out, 3)).toBe(2)
  })

  it('批内重复与空批不改变队列', () => {
    expect(insertManyNext([0, 1], 0, [1, 1])).toEqual([0, 1])
    expect(insertManyNext([0, 1], 0, [])).toEqual([0, 1])
    expect(insertManyNext([], 0, [5, 6])).toEqual([5, 6])
  })

  it('appendManyToQueue 整批移到末尾并保持顺序、去重', () => {
    expect(appendManyToQueue([0, 1, 2, 3], [3, 1])).toEqual([0, 2, 3, 1])
    expect(appendManyToQueue([0, 1], [5, 6])).toEqual([0, 1, 5, 6])
    expect(appendManyToQueue([0, 1], [1, 1])).toEqual([0, 1])
    expect(appendManyToQueue([0, 1], [])).toEqual([0, 1])
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
