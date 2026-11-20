/**
 * 平台能力接口（架构 §5.5）。
 * 上层（store / hooks / 组件）只依赖这些接口，不感知运行平台。
 * 三端实现均已落地（网页 / Capacitor 安卓 / Tauri 桌面），上层不动。
 *
 * 平台桥接模块登记（审计 A-20）：直接调原生/宿主 API 的模块统一放在
 * 本目录（platform/）下并在此登记；组件与 store 不得绕过桥接直接碰插件：
 * - mediaSessionWeb / mediaSessionNative：系统媒体会话（锁屏/通知栏控制）
 * - backButton（+ lib/backStack）：安卓系统返回键分发
 * - tauriDesktop / tauriFiles / tauriUpdate：桌面壳接线（拖放与验收钩子、
 *   源文件窄命令、自动更新与开机自启）
 * - nativeFiles / pickFiles：系统文件选择（三路分流收口在 pickFiles）
 * - systemBars / splashScreen / haptics：系统栏样式、启动屏、触觉反馈
 * - prefs：宿主偏好存储（localStorage / Filesystem 分流）
 */

/** 样式适配：把主题变量注入宿主 */
export interface StyleAdapter {
  applyTheme(vars: Record<string, string>): void
}

/**
 * 音频引擎：播放本地音频。
 * 约束：
 * - play() 必须由用户手势触发（浏览器自动播放策略），失败时 reject 并回报错误；
 * - duration() 在元数据加载前返回 0，不得假定已就绪；
 * - seek() 需容忍越界与未就绪状态。
 */
export interface AudioEngine {
  play(src: string): Promise<void>
  pause(): void
  seek(sec: number): void
  position(): number
  duration(): number
  setVolume(volume: number): void
  onProgress(cb: (sec: number) => void): void
  onEnded(cb: () => void): void
  onError(cb: (message: string) => void): void
  dispose(): void
}

export interface Platform {
  style: StyleAdapter
  audio: AudioEngine
}
