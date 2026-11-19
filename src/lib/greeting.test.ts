import { describe, expect, it } from 'vitest'
import { greetingLine, greetingWord } from './greeting'

describe('greetingWord 按小时分段', () => {
  it('四个时段与边界', () => {
    expect(greetingWord(6)).toBe('早上好')
    expect(greetingWord(11)).toBe('早上好')
    expect(greetingWord(12)).toBe('中午好')
    expect(greetingWord(13)).toBe('中午好')
    expect(greetingWord(14)).toBe('下午好')
    expect(greetingWord(18)).toBe('下午好')
    expect(greetingWord(19)).toBe('晚上好')
    expect(greetingWord(23)).toBe('晚上好')
    expect(greetingWord(0)).toBe('晚上好')
    expect(greetingWord(5)).toBe('晚上好')
  })

  it('greetingLine 拼整句', () => {
    expect(greetingLine(new Date(2026, 0, 1, 9, 0))).toBe('早上好，愿你听见好心情')
    expect(greetingLine(new Date(2026, 0, 1, 21, 30))).toBe('晚上好，愿你听见好心情')
  })
})
