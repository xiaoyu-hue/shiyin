import { useEffect, useState } from 'react'
import SongRow from './SongRow'
import ImportButton from './ImportButton'
import BatteryGuideCard from './BatteryGuideCard'
import EmptyState from './common/EmptyState'
import { SkeletonRows } from './common/Skeleton'
import { useStore } from '../store'
import { greetingLine } from '../lib/greeting'

export default function HomeView() {
  const setPlayerOpen = useStore((s) => s.setPlayerOpen)
  const tracks = useStore((s) => s.tracks)
  // 恢复未完成时先上骨架屏，避免冷启动闪一帧「还没有音乐」误导用户
  const restored = useStore((s) => s.restored)
  // 问候语跟随实时时间：每分钟刷新一次，跨时段自动切换
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6">
      <div className="mb-6">
        <p className="text-sub tracking-widest" style={{ color: 'var(--accent)' }}>SHIYIN · 诗音</p>
        <h1 className="mt-1 text-title font-bold">{greetingLine(now)}</h1>
      </div>

      <BatteryGuideCard />

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-heading font-semibold">全部曲目</h2>
          <span className="text-sub text-ink2">{tracks.length > 0 ? `共 ${tracks.length} 首` : ''}</span>
        </div>

        <ImportButton className="mb-3 w-full" />

        {!restored ? (
          <SkeletonRows count={6} />
        ) : tracks.length === 0 ? (
          <EmptyState icon="🎵" title="还没有音乐" description="导入你自己的本地音乐文件，就可以开始听了" />
        ) : (
          <>
            <div
              onClick={() => {
                // 多选模式下点行只切换选中，不冒泡打开播放页（1.2.0）
                if (useStore.getState().selection === null) setPlayerOpen(true)
              }}
            >
              {tracks.map((s, i) => <SongRow key={s.id} index={i} context={tracks.map((_, j) => j)} />)}
            </div>
            <p className="mt-2 text-center text-caption text-ink3">点歌展开播放器 · 长按多选 · 右滑排到下一首</p>
          </>
        )}
      </section>
    </div>
  )
}
