/**
 * 平台能力接口（架构 §5.5）。
 * 上层（store / hooks / 组件）只依赖这些接口，不感知运行平台。
 * 本期 Web 实现；阶段二/三以 Tauri + Rust 引擎替换实现，上层不动。
 */

/** 计时器：驱动示例曲目的模拟进度与界面刷新 */
export interface Ticker {
  start(cb: () => void, intervalMs: number): void
  stop(): void
}

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
  ticker: Ticker
  style: StyleAdapter
  audio: AudioEngine
}
