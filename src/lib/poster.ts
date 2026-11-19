/**
 * 歌词海报的纯逻辑：选行状态与版式计算（画布绘制在组件里，只做画笔动作）。
 * 海报尺寸 1080×1440（3:4 竖版），版式数值都按这个尺寸标定。
 */

export const POSTER_W = 1080
export const POSTER_H = 1440
/** 最多可选歌词行数 */
export const POSTER_MAX_LINES = 6

/** 切换一行选中状态：结果按行号升序（海报按歌曲顺序展示）；超上限时忽略新增 */
export function toggleLineSelection(selected: readonly number[], idx: number, max = POSTER_MAX_LINES): number[] {
  if (selected.includes(idx)) return selected.filter((i) => i !== idx)
  if (selected.length >= max) return [...selected]
  return [...selected, idx].sort((a, b) => a - b)
}

export interface PosterLineLayout {
  /** 实际绘制文本（过长已截断） */
  text: string
  /** 基线 y 坐标 */
  y: number
}

export interface PosterLayout {
  fontSize: number
  lineHeight: number
  lines: PosterLineLayout[]
}

/** 歌词区纵向范围：上方留给封面与歌名，下方留给落款 */
const LYRICS_TOP = 620
const LYRICS_BOTTOM = 1200
/** 文本最大宽度（两侧各留 100 边距） */
const MAX_TEXT_W = POSTER_W - 200
/** 基础字号与下限 */
const BASE_FONT = 46
const MIN_FONT = 26

/** 粗估文本宽度：中日韩等宽字按 1em、拉丁字符按 0.55em、空格 0.3em（与画布字体度量近似） */
export function estimateTextWidth(text: string, fontSize: number): number {
  let w = 0
  for (const ch of text) {
    if (ch === ' ') w += fontSize * 0.3
    else if (/[\x00-\xff]/.test(ch)) w += fontSize * 0.55
    else w += fontSize
  }
  return w
}

/** 在给定字号下把文本截断到最大宽度内（超出加省略号） */
export function truncateToWidth(text: string, fontSize: number, maxW = MAX_TEXT_W): string {
  if (estimateTextWidth(text, fontSize) <= maxW) return text
  const chars = [...text]
  while (chars.length > 1 && estimateTextWidth(chars.join('') + '…', fontSize) > maxW) chars.pop()
  return chars.join('') + '…'
}

/**
 * 计算歌词版式：字号随最长行收缩（不低于下限），行距 1.7 倍字号，
 * 整块在歌词区内垂直居中；每行给出截断后的文本与基线位置。
 */
export function computePosterLayout(texts: readonly string[]): PosterLayout {
  const longest = texts.reduce((m, t) => Math.max(m, [...t].length), 0)
  const byCount = longest > 0 ? Math.floor(MAX_TEXT_W / longest) : BASE_FONT
  const fontSize = Math.max(MIN_FONT, Math.min(BASE_FONT, byCount))
  const lineHeight = Math.round(fontSize * 1.7)
  const blockH = lineHeight * texts.length
  const regionH = LYRICS_BOTTOM - LYRICS_TOP
  const firstBaseline = LYRICS_TOP + Math.max(0, (regionH - blockH) / 2) + fontSize
  return {
    fontSize,
    lineHeight,
    lines: texts.map((t, i) => ({
      text: truncateToWidth(t, fontSize),
      y: Math.round(firstBaseline + i * lineHeight),
    })),
  }
}
