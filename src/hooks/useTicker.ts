import { useEffect } from 'react'
import { useStore } from '../store'
import { webPlatform } from '../platform/web'

/**
 * 挂载平台计时器，为「无音频文件的示例曲目」推进模拟进度。
 * 本地导入曲目的进度由音频引擎的 timeupdate 事件驱动，不经过定时器。
 */
export function useTicker() {
  const tick = useStore((s) => s.tick)
  const simulate = useStore((s) => {
    const track = s.tracks[s.cur]
    return Boolean(s.playing && track && !track.audioSrc)
  })

  useEffect(() => {
    if (!simulate) return
    webPlatform.ticker.start(tick, 1000)
    return () => webPlatform.ticker.stop()
  }, [simulate, tick])
}
