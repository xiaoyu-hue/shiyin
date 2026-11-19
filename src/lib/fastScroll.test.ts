import { describe, expect, it } from 'vitest'
import {
  bubbleLabel,
  clamp01,
  fractionForPointer,
  fractionForScroll,
  indexForFraction,
  scrollTopForFraction,
} from './fastScroll'

describe('clamp01', () => {
  it('钳制到 [0,1]，非有限数按 0', () => {
    expect(clamp01(-0.5)).toBe(0)
    expect(clamp01(0.25)).toBe(0.25)
    expect(clamp01(2)).toBe(1)
    expect(clamp01(Number.NaN)).toBe(0)
    expect(clamp01(Number.POSITIVE_INFINITY)).toBe(0)
  })
})

describe('比例 ↔ 滚动位置', () => {
  it('fractionForScroll 按可滚动区间计算', () => {
    expect(fractionForScroll(0, 1000, 200)).toBe(0)
    expect(fractionForScroll(400, 1000, 200)).toBe(0.5)
    expect(fractionForScroll(800, 1000, 200)).toBe(1)
    expect(fractionForScroll(9999, 1000, 200)).toBe(1)
  })

  it('内容不可滚动时比例为 0、目标滚动位置为 0', () => {
    expect(fractionForScroll(0, 200, 200)).toBe(0)
    expect(fractionForScroll(10, 100, 200)).toBe(0)
    expect(scrollTopForFraction(0.5, 100, 200)).toBe(0)
  })

  it('scrollTopForFraction 与 fractionForScroll 互逆', () => {
    expect(scrollTopForFraction(0.5, 1000, 200)).toBe(400)
    expect(scrollTopForFraction(1, 1000, 200)).toBe(800)
    expect(scrollTopForFraction(-1, 1000, 200)).toBe(0)
    expect(fractionForScroll(scrollTopForFraction(0.3, 1000, 200), 1000, 200)).toBeCloseTo(0.3)
  })
})

describe('indexForFraction', () => {
  it('按比例落到目标索引并钳制末尾', () => {
    expect(indexForFraction(0, 10)).toBe(0)
    expect(indexForFraction(0.5, 10)).toBe(5)
    expect(indexForFraction(0.99, 10)).toBe(9)
    expect(indexForFraction(1, 10)).toBe(9)
  })

  it('空列表返回 -1', () => {
    expect(indexForFraction(0.5, 0)).toBe(-1)
  })
})

describe('fractionForPointer', () => {
  it('按指针在轨道内的相对位置计算', () => {
    expect(fractionForPointer(100, 100, 400)).toBe(0)
    expect(fractionForPointer(300, 100, 400)).toBe(0.5)
    expect(fractionForPointer(600, 100, 400)).toBe(1)
    expect(fractionForPointer(300, 100, 0)).toBe(0)
  })
})

describe('bubbleLabel 气泡文案不造假', () => {
  it('按歌名排序时显示目标歌曲首字母（拉丁字母大写）', () => {
    expect(bubbleLabel('name', 'banana', 0.5)).toBe('B')
    expect(bubbleLabel('name', '  青花瓷', 0.5)).toBe('青')
  })

  it('其余排序一律显示百分比', () => {
    expect(bubbleLabel('addedAt', 'banana', 0.5)).toBe('50%')
    expect(bubbleLabel('artist', 'banana', 0.256)).toBe('26%')
    expect(bubbleLabel(null, 'banana', 0)).toBe('0%')
    expect(bubbleLabel('name', undefined, 1)).toBe('100%')
    expect(bubbleLabel('name', '   ', 0.5)).toBe('50%')
  })
})
