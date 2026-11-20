import { useEffect, useRef, useState } from 'react'
import {
  fractionForPointer,
  fractionForScroll,
  indexForFraction,
  scrollTopForFraction,
} from '../lib/fastScroll'

interface Props {
  /** 列表总条数：决定目标索引与是否启用 */
  count: number
  /** 气泡文案：按当前比例算出的目标索引与比例生成（文案规则在 lib/fastScroll.bubbleLabel） */
  bubbleFor: (index: number, fraction: number) => string
  /** 启用门槛：条数不足不渲染（短列表用不上快速滚动） */
  minCount?: number
}

interface RailBox {
  top: number
  height: number
  right: number
}

/**
 * 快速滚动条（1.2.0）：贴在列表实际滚动容器（App 外壳的 .scroll-area）右缘的窄轨，
 * 拖动拇指按比例跳滚，拖动时显示位置气泡。映射逻辑全在 lib/fastScroll（有单测），
 * 本组件只负责找容器、读写 scrollTop 与手势。平时淡显，滚动/触摸时显形；
 * 轨道只有 20px 宽且列表侧留了右间距，不挡行内「…」按钮。
 */
export default function FastScroller({ count, bubbleFor, minCount = 30 }: Props) {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLElement | null>(null)
  const draggingRef = useRef(false)
  const hideTimer = useRef<number | null>(null)
  const [box, setBox] = useState<RailBox | null>(null)
  const [fraction, setFraction] = useState(0)
  const [engaged, setEngaged] = useState(false)
  const [dragging, setDragging] = useState(false)

  const enabled = count >= minCount

  useEffect(() => {
    if (!enabled) return
    const anchor = anchorRef.current
    if (!anchor) return
    const scroller = anchor.closest('.scroll-area') as HTMLElement | null
    if (!scroller) return
    scrollerRef.current = scroller

    const updateBox = () => {
      const r = scroller.getBoundingClientRect()
      setBox({
        top: r.top + 10,
        height: Math.max(80, r.height - 20),
        right: Math.max(0, window.innerWidth - r.right) + 1,
      })
    }
    const armHide = () => {
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current)
      hideTimer.current = window.setTimeout(() => setEngaged(false), 900)
    }
    const onScroll = () => {
      setFraction(fractionForScroll(scroller.scrollTop, scroller.scrollHeight, scroller.clientHeight))
      if (!draggingRef.current) {
        setEngaged(true)
        armHide()
      }
    }
    updateBox()
    onScroll()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', updateBox)
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', updateBox)
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current)
      scrollerRef.current = null
    }
  }, [enabled])

  if (!enabled) return <span ref={anchorRef} className="hidden" aria-hidden />

  const jumpTo = (clientY: number) => {
    const scroller = scrollerRef.current
    const rail = railRef.current
    if (!scroller || !rail) return
    const r = rail.getBoundingClientRect()
    const f = fractionForPointer(clientY, r.top, r.height)
    scroller.scrollTop = scrollTopForFraction(f, scroller.scrollHeight, scroller.clientHeight)
    setFraction(f)
  }

  const endDrag = () => {
    draggingRef.current = false
    setDragging(false)
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setEngaged(false), 600)
  }

  const targetIndex = indexForFraction(fraction, count)

  return (
    <>
      <span ref={anchorRef} className="hidden" aria-hidden />
      {box && (
        <div
          ref={railRef}
          className="fixed z-30 flex w-5 justify-center"
          style={{ top: box.top, height: box.height, right: box.right, touchAction: 'none' }}
          onPointerDown={(e) => {
            draggingRef.current = true
            setDragging(true)
            setEngaged(true)
            ;(e.target as Element).setPointerCapture?.(e.pointerId)
            jumpTo(e.clientY)
          }}
          onPointerMove={(e) => {
            if (draggingRef.current) jumpTo(e.clientY)
          }}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          role="scrollbar"
          aria-label="快速滚动"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(fraction * 100)}
        >
          <div className="relative w-1 rounded-full bg-ink/10">
            <div
              className="absolute left-1/2 h-10 w-2.5 rounded-full transition-opacity duration-300"
              style={{
                top: `${fraction * 100}%`,
                transform: 'translate(-50%, -50%)',
                background: 'var(--accent)',
                opacity: engaged ? 0.9 : 0.25,
              }}
            />
          </div>
          {dragging && targetIndex >= 0 && (
            <div
              className="pointer-events-none absolute right-8 grid h-11 min-w-11 place-items-center rounded-full px-2 text-heading font-bold text-white shadow-lg"
              style={{
                top: `${fraction * 100}%`,
                transform: 'translateY(-50%)',
                background: 'var(--accent)',
              }}
              aria-hidden
            >
              {bubbleFor(targetIndex, fraction)}
            </div>
          )}
        </div>
      )}
    </>
  )
}
