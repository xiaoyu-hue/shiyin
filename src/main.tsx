import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { bindPrefsPersistence, restorePrefs } from './store/bootstrap'
import { applyLayoutMode } from './platform/layout'
import './index.css'

// 首帧渲染前同步恢复收藏 / 历史 / 主题，避免主题闪烁与状态跳变
restorePrefs()
// 布局模式（1.4.1）：按平台写根元素 data-layout，桌面形态的 CSS 作用域靠它，
// 同样要在首帧前落定，避免布局闪烁
applyLayoutMode()
bindPrefsPersistence()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
