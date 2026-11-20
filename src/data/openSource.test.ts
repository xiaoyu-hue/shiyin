import { describe, it, expect } from 'vitest'
import { OPEN_SOURCE_ENTRIES, PROJECT_CODE_LICENSE, PROJECT_DOCS_LICENSE, PROJECT_COPYRIGHT } from './openSource'

describe('开源许可数据完整性', () => {
  it('主要组件条目数不少于 10 条', () => {
    expect(OPEN_SOURCE_ENTRIES.length).toBeGreaterThanOrEqual(10)
  })

  it('每条都有名称、许可证与用途，且名称不重复', () => {
    const names = new Set<string>()
    for (const e of OPEN_SOURCE_ENTRIES) {
      expect(e.name.trim().length).toBeGreaterThan(0)
      expect(e.license.trim().length).toBeGreaterThan(0)
      expect(e.purpose.trim().length).toBeGreaterThan(0)
      expect(names.has(e.name)).toBe(false)
      names.add(e.name)
    }
  })

  it('MPL-2.0 组件存在且单独标注保持原始许可证', () => {
    const mpl = OPEN_SOURCE_ENTRIES.filter((e) => e.license === 'MPL-2.0')
    expect(mpl.length).toBe(1)
    expect(mpl[0].name).toBe('@capgo/capacitor-media-session')
    expect(mpl[0].keepOriginal).toBe(true)
  })

  it('项目自身许可证为代码 Apache-2.0、文档 CC BY 4.0', () => {
    expect(PROJECT_CODE_LICENSE.short).toBe('Apache-2.0')
    expect(PROJECT_DOCS_LICENSE.short).toBe('CC BY 4.0')
    expect(PROJECT_COPYRIGHT).toContain('xiaoyu-hue')
  })
})
