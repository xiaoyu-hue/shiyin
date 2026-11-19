import { describe, it, expect } from 'vitest'
import { themeVariables } from './theme'
import { themes } from '../data/themes'

describe('themeVariables 主题映射', () => {
  it('每套主题产出三个变量且值非空', () => {
    for (const t of themes) {
      const vars = themeVariables(t)
      expect(Object.keys(vars).sort()).toEqual(['--accent', '--bg', '--bg-end'])
      expect(vars['--accent']).toBeTruthy()
      expect(vars['--bg']).toBeTruthy()
      expect(vars['--bg-end']).toBeTruthy()
    }
  })
  it('映射值等于主题定义', () => {
    expect(themeVariables(themes[5])['--bg']).toBe('#FFF8EC')
  })
})
