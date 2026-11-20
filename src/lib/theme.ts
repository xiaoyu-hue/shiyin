import type { Theme } from '../data/types'

/** 中性语义色（不随主题变，只随外观变）：文字墨色与卡片表面色 */
export const INK_LIGHT = '#1F1B16'
export const INK_DARK = '#F5EFE6'
export const SURFACE_LIGHT = '#FFFFFF'
export const SURFACE_DARK = '#2E2820'

/** 主题 + 外观 → CSS 变量映射（深色时用主题的深色变体与深色中性色） */
export function themeVariables(t: Theme, dark = false): Record<string, string> {
  return {
    '--accent': dark ? t.accentDark : t.accent,
    '--bg': dark ? t.bgDark : t.bg,
    '--bg-end': dark ? t.bgEndDark : t.bgEnd,
    '--ink': dark ? INK_DARK : INK_LIGHT,
    '--surface': dark ? SURFACE_DARK : SURFACE_LIGHT,
    // 玻璃染色（1.4.0 落地）：玻璃填充在 CSS 里以 color-mix 把主题强调色
    // 低比例混入，七套主题的玻璃从此各有气质，不再共用同一套白色玻璃
    '--glass-tint': dark ? t.accentDark : t.accent,
  }
}
