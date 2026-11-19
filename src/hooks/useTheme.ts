import { useEffect, useState } from 'react'
import { useStore, themes } from '../store'
import { themeVariables } from '../lib/theme'
import { webPlatform } from '../platform/web'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/** 当前是否实际处于深色外观（外观设置 + 系统偏好合并后的结果），供组件微调氛围用 */
export function useResolvedDark(): boolean {
  const appearance = useStore((s) => s.appearance)
  const [systemDark, setSystemDark] = useState<boolean>(
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches,
  )
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(DARK_QUERY)
    setSystemDark(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return appearance === 'dark' || (appearance === 'system' && systemDark)
}

/**
 * 把当前主题 + 外观变量写入根元素，驱动全局配色。
 * 外观为「跟随系统」时监听系统深浅变化实时切换；同时在根元素打上
 * data-appearance 标记，供 CSS 切换深色玻璃参数。
 */
export function useTheme() {
  const themeIdx = useStore((s) => s.themeIdx)
  const appearance = useStore((s) => s.appearance)
  const [systemDark, setSystemDark] = useState<boolean>(
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches,
  )

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(DARK_QUERY)
    setSystemDark(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const dark = appearance === 'dark' || (appearance === 'system' && systemDark)

  useEffect(() => {
    webPlatform.style.applyTheme(themeVariables(themes[themeIdx], dark))
    document.documentElement.dataset.appearance = dark ? 'dark' : 'light'
  }, [themeIdx, dark])
}
