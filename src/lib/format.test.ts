import { describe, it, expect } from 'vitest'
import { toSeconds, fmtTime, pct } from './format'

describe('toSeconds', () => {
  it('解析 mm:ss', () => {
    expect(toSeconds('01:30')).toBe(90)
    expect(toSeconds('00:05')).toBe(5)
    expect(toSeconds('02:00')).toBe(120)
  })
  it('非法输入返回 0', () => {
    expect(toSeconds('abc')).toBe(0)
    expect(toSeconds('1:2:3')).toBe(0)
    expect(toSeconds('')).toBe(0)
    expect(toSeconds('xx:30')).toBe(0)
  })
})

describe('fmtTime', () => {
  it('0 秒', () => expect(fmtTime(0)).toBe('00:00'))
  it('整除与进位', () => {
    expect(fmtTime(59)).toBe('00:59')
    expect(fmtTime(60)).toBe('01:00')
    expect(fmtTime(213)).toBe('03:33')
  })
  it('非有限值按 0 处理', () => expect(fmtTime(NaN)).toBe('00:00'))
})

describe('pct', () => {
  it('进度百分比', () => {
    expect(pct(30, 100)).toBe(30)
    expect(pct(1, 4)).toBe(25)
  })
  it('除零兜底返回 0', () => {
    expect(pct(10, 0)).toBe(0)
    expect(pct(10, NaN)).toBe(0)
  })
  it('越界钳制在 0–100', () => {
    expect(pct(-5, 100)).toBe(0)
    expect(pct(200, 100)).toBe(100)
  })
})
