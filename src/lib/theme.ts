import type { Theme } from '../data/types'

/** 主题 → CSS 变量名与值的映射 */
export function themeVariables(t: Theme): Record<string, string> {
  return {
    '--accent': t.accent,
    '--bg': t.bg,
    '--bg-end': t.bgEnd,
  }
}
