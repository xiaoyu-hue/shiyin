import { useEffect } from 'react'
import { useStore, themes } from '../store'
import { themeVariables } from '../lib/theme'
import { webPlatform } from '../platform/web'

/** 把当前主题变量经平台样式适配写入根元素，驱动全局配色 */
export function useTheme() {
  const themeIdx = useStore((s) => s.themeIdx)

  useEffect(() => {
    webPlatform.style.applyTheme(themeVariables(themes[themeIdx]))
  }, [themeIdx])
}
