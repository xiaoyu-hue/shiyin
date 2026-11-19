/**
 * 触觉反馈封装（1.1.0）：仅原生环境生效，网页端全部空操作。
 * 只给关键节点用（切歌、收藏、定时设定），不滥用。
 * 插件为 @capacitor/haptics（官方，v8 线），动态 import 不进网页产物。
 */
import { isNativePlatform } from './env'

type HapticsModule = typeof import('@capacitor/haptics')

let modPromise: Promise<HapticsModule | null> | null = null

function load(): Promise<HapticsModule | null> {
  if (!isNativePlatform()) return Promise.resolve(null)
  if (!modPromise) {
    modPromise = import('@capacitor/haptics').catch(() => null)
  }
  return modPromise
}

/** 轻触反馈：切歌、收藏切换等离散动作 */
export function hapticImpact(): void {
  void load()
    .then((m) => (m ? m.Haptics.impact({ style: m.ImpactStyle.Light }) : undefined))
    .catch(() => undefined)
}

/** 选择反馈：定时预设等「选定一项」的确认 */
export function hapticSelection(): void {
  void load()
    .then((m) => (m ? m.Haptics.selectionStart().then(() => m.Haptics.selectionEnd()) : undefined))
    .catch(() => undefined)
}
