/**
 * 用户偏好的浏览器持久化（localStorage）。
 * 只负责原始字符串的读写；数据结构与校验在 lib/prefs.ts。
 * 存储不可用（隐私模式、被禁用、非浏览器环境）时静默降级为不持久化。
 */

const PREFS_KEY = 'shiyin:prefs:v1'

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

/** 读取已保存的偏好原文；无记录或不可用时返回 null */
export function loadPrefsRaw(): string | null {
  try {
    return storage()?.getItem(PREFS_KEY) ?? null
  } catch {
    return null
  }
}

/** 写入偏好原文；失败时静默忽略（不影响正常使用） */
export function savePrefsRaw(raw: string): void {
  try {
    storage()?.setItem(PREFS_KEY, raw)
  } catch {
    // 配额不足或存储被禁用：放弃本次写入
  }
}

const BATTERY_GUIDE_KEY = 'shiyin:battery-guide-dismissed:v1'

/** 电池引导卡是否已被用户关闭（仅原生环境展示，关闭后不再出现） */
export function loadBatteryGuideDismissed(): boolean {
  try {
    return storage()?.getItem(BATTERY_GUIDE_KEY) === '1'
  } catch {
    return false
  }
}

/** 记录电池引导卡已关闭 */
export function saveBatteryGuideDismissed(): void {
  try {
    storage()?.setItem(BATTERY_GUIDE_KEY, '1')
  } catch {
    // 存储不可用时静默忽略
  }
}

const PLAYLISTS_KEY = 'shiyin:playlists:v1'

/** 读取已保存的歌单原文；无记录或不可用时返回 null */
export function loadPlaylistsRaw(): string | null {
  try {
    return storage()?.getItem(PLAYLISTS_KEY) ?? null
  } catch {
    return null
  }
}

/** 写入歌单原文；失败时静默忽略 */
export function savePlaylistsRaw(raw: string): void {
  try {
    storage()?.setItem(PLAYLISTS_KEY, raw)
  } catch {
    // 配额不足或存储被禁用：放弃本次写入
  }
}
