import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { themes, useStore } from './store'
import { bindPrefsPersistence, restorePrefs } from './store/bootstrap'
import { applyLayoutMode } from './platform/layout'
import { themeVariables } from './lib/theme'
import { webPlatform } from './platform/web'
import './index.css'

// 首帧渲染前同步恢复收藏 / 历史 / 主题，避免主题闪烁与状态跳变
restorePrefs()
// 主题首帧同步（审计 A-27）：主题变量原先只在 useTheme 的挂载 effect 里落 DOM，
// 首帧与 effect 之间存在闪色窗口；这里与 restorePrefs 同步把变量、明暗标记、
// 浏览器主题色与流畅模式标记一次落定，后续切换仍由 useTheme 的 effect 接管
{
  const { themeIdx, appearance, smoothMode } = useStore.getState()
  const systemDark =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = appearance === 'dark' || (appearance === 'system' && systemDark)
  webPlatform.style.applyTheme(themeVariables(themes[themeIdx], dark))
  document.documentElement.dataset.appearance = dark ? 'dark' : 'light'
  document.documentElement.classList.toggle('smooth-mode', smoothMode)
}
// 布局模式（1.4.1）：按平台写根元素 data-layout，桌面形态的 CSS 作用域靠它，
// 同样要在首帧前落定，避免布局闪烁
applyLayoutMode()
bindPrefsPersistence()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
