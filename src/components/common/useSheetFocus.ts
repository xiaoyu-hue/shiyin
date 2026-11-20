import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * 抽屉/弹层焦点管理（审计 A-23）：五个弹层（队列/歌曲菜单/睡眠菜单/歌词海报/首启引导）共用。
 * - 打开时把焦点移入面板（首个可聚焦元素，没有则面板本身，需面板带 tabIndex={-1}）；
 * - Tab / Shift+Tab 在面板内循环，不逃逸到背景页面；
 * - 关闭时把焦点归还给打开前的元素（还挂在文档里时）。
 * 用法：const panelRef = useSheetFocus<HTMLDivElement>(open)，ref 挂到弹层根元素。
 */
export function useSheetFocus<T extends HTMLElement>(open: boolean) {
  const panelRef = useRef<T | null>(null)

  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null

    const focusables = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null || el.getClientRects().length > 0 || el === document.activeElement,
      )
    const first = focusables()[0]
    ;(first ?? panel).focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const list = focusables()
      if (!list.length) return
      const head = list[0]
      const tail = list[list.length - 1]
      if (e.shiftKey && document.activeElement === head) {
        e.preventDefault()
        tail.focus()
      } else if (!e.shiftKey && document.activeElement === tail) {
        e.preventDefault()
        head.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      if (previous && document.contains(previous)) previous.focus()
    }
  }, [open])

  return panelRef
}
