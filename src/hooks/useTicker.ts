import { useEffect } from 'react'
import { useStore } from '../store'
import { webPlatform } from '../platform/web'

/** 挂载平台计时器，每 1000ms 推进一次模拟进度（本期音频为假数据） */
export function useTicker() {
  const tick = useStore((s) => s.tick)
  const playing = useStore((s) => s.playing)

  useEffect(() => {
    if (!playing) return
    webPlatform.ticker.start(tick, 1000)
    return () => webPlatform.ticker.stop()
  }, [playing, tick])
}
