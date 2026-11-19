/**
 * 运行环境判断的唯一出口。
 * 原生（Capacitor App）与网页的分流全部收敛到这里与 trackStore，
 * 业务层不散落 isNativePlatform 调用。
 */
import { Capacitor } from '@capacitor/core'

export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}
