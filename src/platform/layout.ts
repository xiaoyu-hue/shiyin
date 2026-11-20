/**
 * 布局模式解析（1.4.1）：布局按平台隔离，不按窗口/视口宽度切换。
 *
 * 背景：1.4.0 的桌面形态全部挂在宽度断点（lg: 等）上，结果网页版在宽
 * 浏览器窗口、安卓在宽视口（横屏/平板/桌面模式）下也误用桌面布局。
 * 用户定的规矩：桌面布局只属于 Tauri 桌面端；网页与安卓永远用经典
 * 手机式布局，与宽度无关。
 *
 * 落地方式：本模块把运行环境映射为布局模式，bootstrap 早期写到根元素
 * 的 data-layout 属性上；CSS 侧用 Tailwind 的 desk: 变体（@custom-variant，
 * 作用域为 [data-layout="desktop"]）与 [data-layout] 作用域规则驱动全部
 * 桌面形态。全仓不得再用宽度断点切换布局（desk: 内叠加的宽度变体除外，
 * 那仍然先过平台门）。
 */
import { getRuntimeEnv, type RuntimeEnv } from './env'

export type LayoutMode = 'desktop' | 'mobile'

/** 纯映射：只有 Tauri 桌面端用桌面布局，其余（安卓/网页）恒手机布局 */
export function resolveLayoutMode(env: RuntimeEnv): LayoutMode {
  return env === 'tauri' ? 'desktop' : 'mobile'
}

/** 当前运行环境的布局模式 */
export function getLayoutMode(): LayoutMode {
  return resolveLayoutMode(getRuntimeEnv())
}

/**
 * 把布局模式写到根元素 data-layout（首帧渲染前由 main.tsx 调用，避免
 * 先按手机布局画一帧再跳桌面布局的闪烁；与主题的 restorePrefs 同惯例）。
 * 返回写入的模式，方便测试与排查。
 */
export function applyLayoutMode(): LayoutMode {
  const mode = getLayoutMode()
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.layout = mode
  }
  return mode
}
