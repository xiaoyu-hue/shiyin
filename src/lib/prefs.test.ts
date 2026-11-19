import { describe, it, expect } from 'vitest'
import { HISTORY_LIMIT, parsePrefs, serializePrefs, type PrefsData } from './prefs'

const THEME_COUNT = 6
const DEFAULT_THEME = 5

describe('serializePrefs / parsePrefs 往返', () => {
  it('正常数据往返一致', () => {
    const data: PrefsData = { liked: [3, 1001, 8], history: [2, 0, 5], themeIdx: 2, appearance: 'dark' }
    expect(parsePrefs(serializePrefs(data), THEME_COUNT, DEFAULT_THEME)).toEqual(data)
  })

  it('空状态往返一致', () => {
    const data: PrefsData = { liked: [], history: [], themeIdx: 0, appearance: 'system' }
    expect(parsePrefs(serializePrefs(data), THEME_COUNT, DEFAULT_THEME)).toEqual(data)
  })
})

describe('parsePrefs 容错', () => {
  it('null 与空字符串返回 null', () => {
    expect(parsePrefs(null, THEME_COUNT, DEFAULT_THEME)).toBeNull()
    expect(parsePrefs('', THEME_COUNT, DEFAULT_THEME)).toBeNull()
  })

  it('非 JSON 与非对象返回 null', () => {
    expect(parsePrefs('{oops', THEME_COUNT, DEFAULT_THEME)).toBeNull()
    expect(parsePrefs('[1,2]', THEME_COUNT, DEFAULT_THEME)).toBeNull()
    expect(parsePrefs('42', THEME_COUNT, DEFAULT_THEME)).toBeNull()
  })

  it('字段损坏只清洗该字段，不连累其他字段', () => {
    const raw = JSON.stringify({ liked: 'bad', history: [1, 2], themeIdx: 3 })
    expect(parsePrefs(raw, THEME_COUNT, DEFAULT_THEME)).toEqual({
      liked: [],
      history: [1, 2],
      themeIdx: 3,
      appearance: 'system',
    })
  })

  it('外观清洗：旧数据缺失或非法值回退跟随系统，合法值保留', () => {
    const mk = (appearance?: unknown) => JSON.stringify({ liked: [], history: [], themeIdx: 0, appearance })
    expect(parsePrefs(mk(), THEME_COUNT, DEFAULT_THEME)?.appearance).toBe('system')
    expect(parsePrefs(mk('neon'), THEME_COUNT, DEFAULT_THEME)?.appearance).toBe('system')
    expect(parsePrefs(mk(42), THEME_COUNT, DEFAULT_THEME)?.appearance).toBe('system')
    expect(parsePrefs(mk('light'), THEME_COUNT, DEFAULT_THEME)?.appearance).toBe('light')
    expect(parsePrefs(mk('dark'), THEME_COUNT, DEFAULT_THEME)?.appearance).toBe('dark')
  })

  it('收藏过滤非正整数并去重', () => {
    const raw = JSON.stringify({ liked: [2, -1, 0, 2.5, '3', 2, 7], history: [], themeIdx: 0 })
    expect(parsePrefs(raw, THEME_COUNT, DEFAULT_THEME)?.liked).toEqual([2, 7])
  })

  it('历史过滤负数与非整数、去重并截断到上限', () => {
    const long = Array.from({ length: HISTORY_LIMIT + 20 }, (_, i) => i)
    const raw = JSON.stringify({ liked: [], history: [-1, 1.5, ...long, 3], themeIdx: 0 })
    const parsed = parsePrefs(raw, THEME_COUNT, DEFAULT_THEME)
    expect(parsed?.history.length).toBe(HISTORY_LIMIT)
    expect(parsed?.history[0]).toBe(0)
    expect(new Set(parsed?.history).size).toBe(HISTORY_LIMIT)
  })

  it('主题索引越界或非法时回退默认主题', () => {
    const mk = (themeIdx: unknown) => JSON.stringify({ liked: [], history: [], themeIdx })
    expect(parsePrefs(mk(99), THEME_COUNT, DEFAULT_THEME)?.themeIdx).toBe(DEFAULT_THEME)
    expect(parsePrefs(mk(-1), THEME_COUNT, DEFAULT_THEME)?.themeIdx).toBe(DEFAULT_THEME)
    expect(parsePrefs(mk('2'), THEME_COUNT, DEFAULT_THEME)?.themeIdx).toBe(DEFAULT_THEME)
    expect(parsePrefs(mk(4), THEME_COUNT, DEFAULT_THEME)?.themeIdx).toBe(4)
  })
})
