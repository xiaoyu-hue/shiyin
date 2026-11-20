import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { clamp01, ratioFromClientX, ratioOfSeconds, secondsAtRatio } from '../lib/seekBar'
import { fmtTime } from '../lib/format'
import { springSnappy } from '../lib/motion'

interface Props {
  /** 当前播放秒数（外部时钟，拖动中被预览值覆盖） */
  value: number
  /** 总时长（秒） */
  max: number
  /** 松手（或键盘调整）时提交目标秒数 */
  onSeek: (sec: number) => void
}

/**
 * 自定义进度条（1.4.0，取代原生 range input）：
 * 拖动时圆点放大、浮出时间气泡，松手才提交（拖动中不打扰播放时钟）；
 * 键盘方向键 ±5s、Home/End 到头尾，role=slider 供无障碍读取。
 * 命中区高于轨道本身（28px），拇指好抓。
 */
export default function SeekBar({ value, max, onSeek }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [preview, setPreview] = useState<number | null>(null)
  const dragging = preview !== null
  const shown = dragging ? preview : value
  const pct = ratioOfSeconds(shown, max) * 100

  const ratioAt = (clientX: number) => {
    const el = trackRef.current
    if (!el) return 0
    return ratioFromClientX(clientX, el.getBoundingClientRect())
  }

  const handleKey = (e: React.KeyboardEvent) => {
    const step = 5
    let next: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(max, value + step)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(0, value - step)
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = max
    if (next !== null) {
      e.preventDefault()
      onSeek(next)
    }
  }

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label="播放进度"
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(shown)}
      aria-valuetext={`${fmtTime(shown)} / ${fmtTime(max)}`}
      tabIndex={0}
      className="relative flex h-7 w-full cursor-pointer touch-none items-center rounded-full"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        setPreview(secondsAtRatio(ratioAt(e.clientX), max))
      }}
      onPointerMove={(e) => {
        if (dragging) setPreview(secondsAtRatio(ratioAt(e.clientX), max))
      }}
      onPointerUp={(e) => {
        if (preview !== null) onSeek(secondsAtRatio(clamp01(ratioAt(e.clientX)), max))
        setPreview(null)
      }}
      onPointerCancel={() => setPreview(null)}
      onKeyDown={handleKey}
    >
      <div className="relative h-1.5 w-full rounded-full bg-ink/15">
        <div className="accent-bg absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <motion.span
        className="accent-bg pointer-events-none absolute top-1/2 h-3.5 w-3.5 rounded-full shadow"
        style={{ left: `${pct}%` }}
        animate={{ scale: dragging ? 1.45 : 1, x: '-50%', y: '-50%' }}
        transition={springSnappy}
      />
      <AnimatePresence>
        {dragging && (
          <motion.span
            initial={{ opacity: 0, y: 2, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 2, x: '-50%' }}
            className="glass-strong pointer-events-none absolute -top-8 rounded-full px-2.5 py-1 text-sub font-semibold tabular-nums"
            style={{ left: `${pct}%` }}
          >
            {fmtTime(preview)}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
