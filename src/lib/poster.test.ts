import { describe, expect, it } from 'vitest'
import {
  computePosterLayout,
  estimateTextWidth,
  POSTER_MAX_LINES,
  toggleLineSelection,
  truncateToWidth,
} from './poster'

describe('toggleLineSelection 选行', () => {
  it('新增保持升序、再次点击取消', () => {
    expect(toggleLineSelection([], 3)).toEqual([3])
    expect(toggleLineSelection([3], 1)).toEqual([1, 3])
    expect(toggleLineSelection([1, 3], 3)).toEqual([1])
  })

  it('达到上限后忽略新增，但仍可取消', () => {
    const full = [0, 1, 2, 3, 4, 5]
    expect(full.length).toBe(POSTER_MAX_LINES)
    expect(toggleLineSelection(full, 9)).toEqual(full)
    expect(toggleLineSelection(full, 5)).toEqual([0, 1, 2, 3, 4])
  })
})

describe('estimateTextWidth / truncateToWidth', () => {
  it('全角字按 1em、半角按 0.55em 估算', () => {
    expect(estimateTextWidth('歌词', 40)).toBe(80)
    expect(estimateTextWidth('ab', 40)).toBeCloseTo(44)
    expect(estimateTextWidth('a 歌', 40)).toBeCloseTo(22 + 12 + 40)
  })

  it('未超宽原样返回，超宽截断加省略号且不超限', () => {
    expect(truncateToWidth('短句', 46)).toBe('短句')
    const long = '这是一句非常非常非常长的歌词'.repeat(4)
    const out = truncateToWidth(long, 46)
    expect(out.endsWith('…')).toBe(true)
    expect(estimateTextWidth(out, 46)).toBeLessThanOrEqual(880)
  })
})

describe('computePosterLayout 版式', () => {
  it('短行用基础字号，行距为 1.7 倍，整块居中', () => {
    const layout = computePosterLayout(['第一行', '第二行'])
    expect(layout.fontSize).toBe(46)
    expect(layout.lineHeight).toBe(Math.round(46 * 1.7))
    expect(layout.lines.length).toBe(2)
    // 两行块高 2*78=156，区域 620..1200 高 580，首行基线 = 620 + (580-156)/2 + 46
    expect(layout.lines[0].y).toBe(620 + (580 - 156) / 2 + 46)
    expect(layout.lines[1].y - layout.lines[0].y).toBe(layout.lineHeight)
  })

  it('长行自动缩小字号且不低于下限', () => {
    const layout = computePosterLayout(['这是一句有二十个字的长长歌词行啊啊啊啊啊'])
    expect(layout.fontSize).toBeLessThan(46)
    expect(layout.fontSize).toBeGreaterThanOrEqual(26)
    const huge = computePosterLayout(['长'.repeat(100)])
    expect(huge.fontSize).toBe(26)
    expect(huge.lines[0].text.endsWith('…')).toBe(true)
  })

  it('空数组给出空行表', () => {
    expect(computePosterLayout([]).lines).toEqual([])
  })
})
