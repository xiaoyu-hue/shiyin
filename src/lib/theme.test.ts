import { describe, it, expect } from 'vitest'
import { themeVariables, INK_DARK, INK_LIGHT, SURFACE_DARK, SURFACE_LIGHT } from './theme'
import { themes } from '../data/themes'

describe('themeVariables 主题映射', () => {
  it('每套主题产出五个变量且值非空（浅色）', () => {
    for (const t of themes) {
      const vars = themeVariables(t)
      expect(Object.keys(vars).sort()).toEqual(['--accent', '--bg', '--bg-end', '--ink', '--surface'])
      for (const v of Object.values(vars)) expect(v).toBeTruthy()
    }
  })

  it('浅色映射值等于主题定义与浅色中性色', () => {
    expect(themeVariables(themes[5])['--bg']).toBe('#FFF8EC')
    expect(themeVariables(themes[5])['--ink']).toBe(INK_LIGHT)
    expect(themeVariables(themes[5])['--surface']).toBe(SURFACE_LIGHT)
  })

  it('深色映射使用主题的深色变体与深色中性色', () => {
    for (const t of themes) {
      const vars = themeVariables(t, true)
      expect(vars['--accent']).toBe(t.accentDark)
      expect(vars['--bg']).toBe(t.bgDark)
      expect(vars['--bg-end']).toBe(t.bgEndDark)
      expect(vars['--ink']).toBe(INK_DARK)
      expect(vars['--surface']).toBe(SURFACE_DARK)
    }
  })

  it('每套主题都定义了深色变体', () => {
    for (const t of themes) {
      expect(t.accentDark).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(t.bgDark).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(t.bgEndDark).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })
})
