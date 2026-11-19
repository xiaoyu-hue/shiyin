import type { Theme } from './types'

// 6 套内置主题，与 PRD §5.11 一致。
export const themes: Theme[] = [
  { slug: 'sakura', name: '樱粉暖阳', accent: '#B83D5A', bg: '#FFF2EB', bgEnd: '#FFD9DE' },
  { slug: 'amber', name: '琥珀秋意', accent: '#9B4E10', bg: '#FFF5DF', bgEnd: '#FFDECA' },
  { slug: 'bamboo', name: '青竹薄雾', accent: '#127C77', bg: '#EAFBF6', bgEnd: '#D5EEF3' },
  { slug: 'lake', name: '晨雾湖蓝', accent: '#365FA3', bg: '#EFF6FF', bgEnd: '#DCE8FF' },
  { slug: 'wisteria', name: '紫藤梦境', accent: '#7C4DA1', bg: '#F5EFFF', bgEnd: '#EADCF6' },
  { slug: 'wood', name: '原木暖棕', accent: '#7B5738', bg: '#FFF8EC', bgEnd: '#EEE2D4' },
]

// 默认主题：原木暖棕（索引 5）。
export const DEFAULT_THEME_INDEX = 5
