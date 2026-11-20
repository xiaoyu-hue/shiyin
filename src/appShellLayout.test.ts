import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * 应用壳布局结构守门（1.5.0 折叠修复防回归）：内容列必须同时有
 * min-w-0（防横向撑爆）与 min-h-0（防纵向撑爆）。缺 min-h-0 时内容超
 * 一屏会把列撑出 100dvh 的壳、main 形不成滚动区（真机实报）。
 * 真实布局行为由 scripts/scroll-probe.mjs 无头 Chrome 探针验证，
 * 本测试保证该类名不会在重构中被无意删掉（CI 每次必跑）。
 */
describe('应用壳内容列防撑爆类名', () => {
  const app = readFileSync(join(process.cwd(), 'src/App.tsx'), 'utf8')

  it('内容列同时带 min-h-0 与 min-w-0', () => {
    const m = app.match(/className="flex[^"]*flex-col"/)
    expect(m, '未找到内容列的 className').not.toBeNull()
    expect(m![0]).toContain('min-h-0')
    expect(m![0]).toContain('min-w-0')
  })
})
