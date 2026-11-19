/**
 * 启动屏收尾（1.1.0）：capacitor.config 里 launchAutoHide=false，
 * 由 App 首帧渲染后手动 hide，避免启动屏停留拖慢冷启动桥调用，
 * 也避免「启动屏 → 白屏 → 界面」的三段跳。仅原生环境执行。
 */
import { isNativePlatform } from './env'

let hidden = false

/** 隐藏原生启动屏；重复调用无副作用，非原生环境为空操作 */
export function hideSplashScreen(): void {
  if (hidden) return
  hidden = true
  if (!isNativePlatform()) return
  void import('@capacitor/splash-screen')
    .then(({ SplashScreen }) => SplashScreen.hide())
    .catch(() => undefined)
}
