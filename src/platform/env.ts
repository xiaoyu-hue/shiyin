/**
 * 运行环境判断的唯一出口。
 * 三种环境：Capacitor 安卓 App / Tauri 桌面 App / 普通网页。
 * 判定顺序固定：先 capacitor 后 tauri 最后 web——Capacitor 的 WebView 里
 * 不会出现 Tauri 注入对象，反之亦然，但顺序写死可避免未来注入方式变化时误判。
 * 业务层不散落平台调用，全部收敛到这里与 trackStore。
 */
import { Capacitor } from '@capacitor/core'

export type RuntimeEnv = 'capacitor' | 'tauri' | 'web'

/** Capacitor 原生环境（安卓 App） */
export function isCapacitorPlatform(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

/**
 * 历史命名兼容：既有调用点的语义都是「Capacitor 原生」
 *（媒体会话插件、返回键、触觉、启动屏、电池卡等均为 Capacitor 专属），
 * 保持指向 isCapacitorPlatform，Tauri 环境下这些能力一律不启用。
 */
export function isNativePlatform(): boolean {
  return isCapacitorPlatform()
}

/** Tauri 桌面环境：Tauri 在 WebView 中注入 __TAURI_INTERNALS__ 全局对象 */
export function isTauriPlatform(): boolean {
  try {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
  } catch {
    return false
  }
}

export function getRuntimeEnv(): RuntimeEnv {
  if (isCapacitorPlatform()) return 'capacitor'
  if (isTauriPlatform()) return 'tauri'
  return 'web'
}
