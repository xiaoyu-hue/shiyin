import type { Platform, StyleAdapter, Ticker } from './index'

/** Web 计时器：封装 window.setInterval，底层平台 API 不扩散到 hooks */
export function createWebTicker(): Ticker {
  let id: number | null = null
  return {
    start(cb, intervalMs) {
      if (id !== null) window.clearInterval(id)
      id = window.setInterval(cb, intervalMs)
    },
    stop() {
      if (id !== null) {
        window.clearInterval(id)
        id = null
      }
    },
  }
}

/** Web 样式适配：把主题变量写入根元素，并同步浏览器主题色 */
export function createWebStyleAdapter(): StyleAdapter {
  return {
    applyTheme(vars) {
      const root = document.documentElement
      Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value))
      const bg = vars['--bg']
      if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg)
    },
  }
}

/** 本期 Web 平台实现；AudioEngine 阶段二接入 */
export function createWebPlatform(): Platform {
  return {
    ticker: createWebTicker(),
    style: createWebStyleAdapter(),
  }
}

/** 模块级单例：计时器与样式适配在应用生命周期内唯一 */
export const webPlatform = createWebPlatform()
