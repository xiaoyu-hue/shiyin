/**
 * 平台能力接口（架构 §5.5）。
 * 上层（store / hooks / 组件）只依赖这些接口，不感知运行平台。
 * 本期为 Web 实现；阶段二/三以 Tauri 实现替换，上层不动。
 */

/** 计时器：本期驱动模拟进度，阶段二可由音频事件替换 */
export interface Ticker {
  start(cb: () => void, intervalMs: number): void
  stop(): void
}

/** 样式适配：把主题变量注入宿主 */
export interface StyleAdapter {
  applyTheme(vars: Record<string, string>): void
}

/** 音频引擎：本期为空职责，阶段二/三由 Tauri command + Rust 引擎实现 */
export interface AudioEngine {
  play(src: string): Promise<void>
  pause(): void
  seek(sec: number): void
  position(): number
  onProgress(cb: (sec: number) => void): void
}

export interface Platform {
  ticker: Ticker
  style: StyleAdapter
  audio?: AudioEngine
}
