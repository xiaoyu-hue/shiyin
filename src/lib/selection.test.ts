import { describe, expect, it } from 'vitest'
import { orderByScope, toggleInSelection } from './selection'

describe('toggleInSelection', () => {
  it('未选时加入、已选时移除，不改原数组', () => {
    const sel = [1, 3]
    expect(toggleInSelection(sel, 2)).toEqual([1, 3, 2])
    expect(toggleInSelection(sel, 3)).toEqual([1])
    expect(sel).toEqual([1, 3])
  })
})

describe('orderByScope', () => {
  it('按列表顺序重排选中集，而不是点选顺序', () => {
    expect(orderByScope([0, 1, 2, 3, 4], [4, 1, 3])).toEqual([1, 3, 4])
  })

  it('scope 外的选中项保序附后（防御性）', () => {
    expect(orderByScope([0, 1, 2], [9, 2, 0])).toEqual([0, 2, 9])
  })

  it('空选中集返回空', () => {
    expect(orderByScope([0, 1], [])).toEqual([])
  })
})
