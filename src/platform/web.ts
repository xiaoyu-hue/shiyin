import type { AudioEngine, Platform, StyleAdapter } from './index'

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

function describeMediaError(code?: number): string {
  switch (code) {
    case 1:
      return '播放被中断'
    case 2:
      return '网络读取失败'
    case 3:
      return '音频解码失败，文件可能已损坏'
    case 4:
      return '浏览器不支持该音频格式'
    default:
      return '音频播放失败'
  }
}

/** 无音频能力环境（如 Node 单测）下的静音实现，保持接口可用 */
function createSilentEngine(): AudioEngine {
  return {
    async play() {},
    pause() {},
    seek() {},
    position() {
      return 0
    },
    duration() {
      return 0
    },
    setVolume() {},
    onProgress() {},
    onEnded() {},
    onError() {},
    dispose() {},
  }
}

/**
 * Web 音频引擎：基于 HTMLAudioElement。
 * 进度以 timeupdate 事件为准，不使用定时器轮询，避免进度漂移。
 */
export function createWebAudioEngine(): AudioEngine {
  if (typeof Audio === 'undefined') return createSilentEngine()

  const el = new Audio()
  el.preload = 'metadata'

  // CI 自动化验收钩子（仅验收构建，审计 A-65）：引擎的 audio 元素不在 DOM 里，
  // 把引用挂到 window 供 WebDriver 采样 currentTime/paused。
  // 由构建期标记门控，正式构建不挂此全局句柄。
  if (__SHIYIN_ACCEPTANCE__) {
    try {
      ;(window as unknown as { __shiyinAudioEl?: HTMLAudioElement }).__shiyinAudioEl = el
    } catch {
      /* 非浏览器环境忽略 */
    }
  }

  let progressCb: ((sec: number) => void) | null = null
  let endedCb: (() => void) | null = null
  let errorCb: ((message: string) => void) | null = null
  let currentSrc = ''

  el.addEventListener('timeupdate', () => progressCb?.(el.currentTime))
  el.addEventListener('ended', () => endedCb?.())
  el.addEventListener('error', () => errorCb?.(describeMediaError(el.error?.code)))

  const safeDuration = () => (Number.isFinite(el.duration) ? el.duration : 0)

  return {
    async play(src) {
      if (!src) return
      if (currentSrc !== src) {
        currentSrc = src
        el.src = src
        el.load()
      }
      try {
        await el.play()
      } catch (err) {
        const reason = err instanceof Error ? err.name : ''
        errorCb?.(
          reason === 'NotAllowedError'
            ? '浏览器阻止了自动播放，请再次点击播放'
            : '无法播放该音频，请确认文件格式',
        )
        throw err
      }
    },
    pause() {
      el.pause()
    },
    seek(sec) {
      const dur = safeDuration()
      const target = Number.isFinite(sec) ? Math.max(0, sec) : 0
      const clamped = dur > 0 ? Math.min(target, dur - 0.05) : target
      // iOS Safari 需要在暂停状态下写入 currentTime 才可靠
      const wasPlaying = !el.paused
      if (wasPlaying) el.pause()
      try {
        el.currentTime = clamped
      } catch {
        /* 元数据未就绪时忽略，下一次 timeupdate 会校正 */
      }
      if (wasPlaying) void el.play().catch(() => undefined)
    },
    position() {
      return Number.isFinite(el.currentTime) ? el.currentTime : 0
    },
    duration() {
      return safeDuration()
    },
    setVolume(volume) {
      el.volume = Math.min(1, Math.max(0, volume))
    },
    onProgress(cb) {
      progressCb = cb
    },
    onEnded(cb) {
      endedCb = cb
    },
    onError(cb) {
      errorCb = cb
    },
    dispose() {
      el.pause()
      el.removeAttribute('src')
      el.load()
      currentSrc = ''
      progressCb = null
      endedCb = null
      errorCb = null
    },
  }
}

/** 本期 Web 平台实现 */
export function createWebPlatform(): Platform {
  return {
    style: createWebStyleAdapter(),
    audio: createWebAudioEngine(),
  }
}

/** 模块级单例：样式适配与音频引擎在应用生命周期内唯一 */
export const webPlatform = createWebPlatform()
