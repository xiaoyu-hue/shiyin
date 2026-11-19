/**
 * 系统栏样式联动（1.1.0）：用 @capacitor/core 内置的 SystemBars
 * （已按已装 8.6.2 的类型定义核实：SystemBars.setStyle({ style, bar })，
 * style 取 SystemBarsStyle.Dark = 深色背景配浅色内容 /
 * Light = 浅色背景配深色内容，bar 可分别指定状态栏与导航栏）。
 *
 * 诗音允许在 App 内强制深/浅外观、可能与系统不一致，所以不能用
 * Default（跟随系统），必须按 App 自己解析出的明暗显式设置，
 * 否则会出现浅色界面配白色状态栏图标看不见的问题。仅原生执行。
 */
import { SystemBarType, SystemBars, SystemBarsStyle } from '@capacitor/core'
import { isNativePlatform } from './env'

/** 按 App 当前明暗同步状态栏与导航栏的图标明暗 */
export function syncSystemBarsStyle(dark: boolean): void {
  if (!isNativePlatform()) return
  const style = dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light
  void SystemBars.setStyle({ style, bar: SystemBarType.StatusBar }).catch(() => undefined)
  void SystemBars.setStyle({ style, bar: SystemBarType.NavigationBar }).catch(() => undefined)
}
