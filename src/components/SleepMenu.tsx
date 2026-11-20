import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, MoonStar, X } from 'lucide-react'
import { useStore } from '../store'
import { formatRemaining, remainingMs, SLEEP_PRESETS_MIN } from '../lib/sleepTimer'
import { registerBackHandler } from '../platform/backButton'
import { springDrawer, scrimTransition } from '../lib/motion'
import { useSheetDrag } from './common/useSheetDrag'
import { hapticSelection } from '../platform/haptics'

/** 睡眠定时按钮 + 玻璃菜单（放在播放页顶栏）：分钟预设 / 播完这首停 / 关闭 */
export default function SleepMenu() {
  const sleepEndsAt = useStore((s) => s.sleepEndsAt)
  const sleepAfterTrack = useStore((s) => s.sleepAfterTrack)
  const setSleepMinutes = useStore((s) => s.setSleepMinutes)
  const setSleepAfterTrack = useStore((s) => s.setSleepAfterTrack)
  const clearSleep = useStore((s) => s.clearSleep)
  const [open, setOpen] = useState(false)
  const { sheetProps, handleProps } = useSheetDrag(() => setOpen(false))
  const [now, setNow] = useState(() => Date.now())

  const active = sleepEndsAt !== null || sleepAfterTrack
  const remaining = remainingMs(sleepEndsAt, now)

  // 定时进行中或菜单打开时，每秒刷新剩余显示
  useEffect(() => {
    if (!active && !open) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [active, open])

  // 安卓返回登记（1.1.0）：菜单开着时返回先收菜单
  useEffect(() => {
    if (!open) return
    return registerBackHandler(() => {
      setOpen(false)
      return true
    })
  }, [open])

  const itemCls =
    'flex min-h-12 w-full items-center gap-3 rounded-[var(--r-card)] px-3 text-left text-body transition-colors active:bg-ink/5'

  return (
    <>
      <button
        onClick={() => { setNow(Date.now()); setOpen(true) }}
        aria-label={active ? '睡眠定时已开启，打开定时设置' : '睡眠定时'}
        className="glass flex h-11 min-w-11 flex-col items-center justify-center rounded-full px-1"
        style={active ? { color: 'var(--accent)' } : undefined}
      >
        <MoonStar size={19} />
        {remaining !== null && <span className="text-caption font-semibold tabular-nums leading-tight">{formatRemaining(remaining)}</span>}
        {sleepAfterTrack && <span className="text-caption font-semibold leading-tight">本首</span>}
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="睡眠定时">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={scrimTransition}
              className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={springDrawer}
              {...sheetProps}
              className="glass-strong absolute inset-x-0 bottom-0 mx-auto w-full max-w-[430px] rounded-t-[var(--r-sheet)] p-4"
              style={{ paddingBottom: 'calc(2rem + var(--sab))' }}
            >
              <div {...handleProps} className="-mt-1 mb-2 flex cursor-grab touch-none justify-center py-1.5">
                <div className="h-1.5 w-10 rounded-full bg-ink/15" />
              </div>
              <div className="mb-2 flex items-center px-1 pb-1">
                <p className="flex-1 text-body font-semibold">睡眠定时</p>
                {remaining !== null && (
                  <span className="text-sub text-ink2">还剩 {formatRemaining(remaining)} 停播</span>
                )}
                {sleepAfterTrack && <span className="text-sub text-ink2">这首播完就停</span>}
                <button onClick={() => setOpen(false)} aria-label="关闭定时设置" className="grid h-11 w-11 place-items-center rounded-full text-ink2">
                  <X size={20} />
                </button>
              </div>

              {SLEEP_PRESETS_MIN.map((min) => (
                <button
                  key={min}
                  className={itemCls}
                  onClick={() => { hapticSelection(); setSleepMinutes(min); setOpen(false) }}
                >
                  <MoonStar size={19} style={{ color: 'var(--accent)' }} />
                  {min} 分钟后停播
                </button>
              ))}

              <button
                className={itemCls}
                onClick={() => { hapticSelection(); setSleepAfterTrack(true); setOpen(false) }}
              >
                <MoonStar size={19} style={{ color: 'var(--accent)' }} />
                播完这首就停
                {sleepAfterTrack && <Check size={18} className="ml-auto" style={{ color: 'var(--accent)' }} />}
              </button>

              {active && (
                <button
                  className={`${itemCls} text-danger`}
                  onClick={() => { clearSleep(); setOpen(false) }}
                >
                  <X size={19} />
                  关闭定时
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
