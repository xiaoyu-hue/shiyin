import type { Theme } from './types'

// 7 套内置主题，与 PRD §5.11 一致。每套含深色外观变体（同色系压暗、强调色提亮）。
export const themes: Theme[] = [
  { slug: 'sakura', name: '樱粉暖阳', accent: '#B83D5A', bg: '#FFF2EB', bgEnd: '#FFD9DE', accentDark: '#E77A9B', bgDark: '#2A1B20', bgEndDark: '#1D1216' },
  { slug: 'amber', name: '琥珀秋意', accent: '#9B4E10', bg: '#FFF5DF', bgEnd: '#FFDECA', accentDark: '#D99A55', bgDark: '#2A2015', bgEndDark: '#1C150E' },
  { slug: 'bamboo', name: '青竹薄雾', accent: '#127C77', bg: '#EAFBF6', bgEnd: '#D5EEF3', accentDark: '#4FB8B0', bgDark: '#12211F', bgEndDark: '#0C1716' },
  { slug: 'lake', name: '晨雾湖蓝', accent: '#365FA3', bg: '#EFF6FF', bgEnd: '#DCE8FF', accentDark: '#7FA8E0', bgDark: '#141D2E', bgEndDark: '#0D1320' },
  { slug: 'wisteria', name: '紫藤梦境', accent: '#7C4DA1', bg: '#F5EFFF', bgEnd: '#EADCF6', accentDark: '#B98FD9', bgDark: '#201631', bgEndDark: '#150E21' },
  { slug: 'wood', name: '原木暖棕', accent: '#7B5738', bg: '#FFF8EC', bgEnd: '#EEE2D4', accentDark: '#C49A6C', bgDark: '#241C14', bgEndDark: '#171208' },
  // 纯净白：纯白底 + 暖炭灰强调色（极简黑白路线）；深色变体走近黑中性，与其单色性格一致
  { slug: 'pure', name: '纯净白', accent: '#4E463C', bg: '#FFFFFF', bgEnd: '#F6F3EF', accentDark: '#D9D2C4', bgDark: '#1B1B1B', bgEndDark: '#101010' },
]

// 默认主题：纯净白（索引 6，0.7.1 起）。已保存过主题偏好的用户不受影响，仍用其自选主题。
export const DEFAULT_THEME_INDEX = 6
