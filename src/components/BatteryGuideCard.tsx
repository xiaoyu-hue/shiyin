import { useState } from 'react'
import { BatteryCharging, X } from 'lucide-react'
import { isNativePlatform } from '../platform/env'
import { loadBatteryGuideDismissed, saveBatteryGuideDismissed } from '../platform/prefs'

/**
 * 首次启动电池引导（仅原生 App）：部分手机的省电管理会掐断后台播放，
 * 提示用户把诗音的电池使用设为「不受限制」。一次性卡片，关闭后不再出现；
 * 网页环境永不渲染。
 */
export default function BatteryGuideCard() {
  const [dismissed, setDismissed] = useState(() => loadBatteryGuideDismissed())
  if (!isNativePlatform() || dismissed) return null

  const close = () => {
    saveBatteryGuideDismissed()
    setDismissed(true)
  }

  return (
    <div className="mb-4 flex gap-3 rounded-[var(--r-card)] bg-surface/60 p-4 shadow-sm">
      <BatteryCharging size={20} className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold">息屏播放小提示</p>
        <p className="mt-1 text-sub leading-relaxed text-ink2">
          如果息屏或切到后台后播放中断，多半是手机的省电管理在限制诗音。去系统设置里找到诗音，把「电池」设为不受限制，就能稳定后台播放了。
        </p>
        <button
          type="button"
          onClick={close}
          className="mt-2 min-h-11 rounded-full px-4 text-body font-medium transition-transform active:scale-[0.97]"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          知道了
        </button>
      </div>
      <button
        type="button"
        onClick={close}
        aria-label="关闭提示"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink2 transition-transform active:scale-95"
      >
        <X size={16} />
      </button>
    </div>
  )
}
