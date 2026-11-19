import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { bindPrefsPersistence, restorePrefs } from './store/bootstrap'
import './index.css'

// 首帧渲染前同步恢复收藏 / 历史 / 主题，避免主题闪烁与状态跳变
restorePrefs()
bindPrefsPersistence()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
