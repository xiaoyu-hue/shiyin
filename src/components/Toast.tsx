import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check } from 'lucide-react'
import { useStore } from '../store'
import { springGentle, TOAST_DURATION_MS } from '../lib/motion'

/**
 * 统一轻反馈（1.4.0）：静默操作（下一首播放 / 加入队列等）的确认通道。
 * 此前全站没有 Toast，这类操作点完毫无回音、用户无从知道成没成；
 * 现在统一走这里：玻璃药丸 + 对勾，停留时长走 TOAST_DURATION_MS 一个节奏。
 * 位置悬浮在底部导航之上，不挤占布局；指针穿透不挡操作。
 */
export default function Toast() {
  const toast = useStore((s) => s.toast)
  const clearToast = useStore((s) => s.clearToast)

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => clearToast(toast.id), TOAST_DURATION_MS)
    return () => window.clearTimeout(t)
  }, [toast, clearToast])

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-36 z-[80] flex justify-center px-6"
      aria-live="polite"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={springGentle}
            className="glass-strong flex items-center gap-2 rounded-full py-2.5 pr-5 pl-3.5 text-body font-medium"
            role="status"
          >
            <span className="accent-bg grid h-6 w-6 place-items-center rounded-full text-white">
              <Check size={14} strokeWidth={3} />
            </span>
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
