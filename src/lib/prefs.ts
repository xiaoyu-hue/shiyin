/**
 * 用户偏好持久化的纯逻辑：收藏、最近播放历史与主题选择的序列化 / 反序列化。
 * 只做数据校验与清洗，不触碰任何存储介质（读写在 platform/prefs.ts）。
 */

/** 偏好数据的可序列化形态（收藏用数组存曲目 id，落盘时再转 Set） */
export interface PrefsData {
  /** 收藏的曲目 id 列表 */
  liked: number[]
  /** 最近播放的曲目下标列表，最新在前 */
  history: number[]
  /** 当前主题索引 */
  themeIdx: number
}

/** 历史最多保留条数，超出截断最旧的 */
export const HISTORY_LIMIT = 100

/** 只保留正整数并去重（保持首次出现顺序） */
function cleanIds(list: unknown): number[] {
  if (!Array.isArray(list)) return []
  const seen = new Set<number>()
  const out: number[] = []
  for (const v of list) {
    if (typeof v === 'number' && Number.isInteger(v) && v > 0 && !seen.has(v)) {
      seen.add(v)
      out.push(v)
    }
  }
  return out
}

/** 只保留非负整数下标并去重，再按上限截断 */
function cleanHistory(list: unknown): number[] {
  if (!Array.isArray(list)) return []
  const seen = new Set<number>()
  const out: number[] = []
  for (const v of list) {
    if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && !seen.has(v)) {
      seen.add(v)
      out.push(v)
      if (out.length >= HISTORY_LIMIT) break
    }
  }
  return out
}

/** 主题索引越界或非法时回退到默认主题 */
function cleanThemeIdx(value: unknown, themeCount: number, defaultThemeIdx: number): number {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < themeCount) {
    return value
  }
  return defaultThemeIdx
}

/** 把偏好数据序列化为落盘字符串 */
export function serializePrefs(data: PrefsData): string {
  return JSON.stringify({
    v: 1,
    liked: cleanIds(data.liked),
    history: cleanHistory(data.history),
    themeIdx: data.themeIdx,
  })
}

/**
 * 解析落盘字符串。整体损坏（非 JSON / 非对象）返回 null；
 * 单个字段损坏只清洗该字段，不连累其他字段。
 */
export function parsePrefs(
  raw: string | null,
  themeCount: number,
  defaultThemeIdx: number,
): PrefsData | null {
  if (!raw) return null
  let obj: unknown
  try {
    obj = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return null
  const rec = obj as Record<string, unknown>
  return {
    liked: cleanIds(rec.liked),
    history: cleanHistory(rec.history),
    themeIdx: cleanThemeIdx(rec.themeIdx, themeCount, defaultThemeIdx),
  }
}
