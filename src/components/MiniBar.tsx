import { motion } from 'motion/react'
import { Play, Pause, SkipForward, MoonStar } from 'lucide-react'
import { useStore } from '../store'
import { pct } from '../lib/format'
import { hapticImpact } from '../platform/haptics'

/**
 * 迷你播放条：悬浮液态玻璃胶囊（0.5.0 改版）。
 * 点按展开全屏播放器；左右横滑切歌（拖动超过 60px 触发）；
 * 上滑展开播放页（1.2.0，超过 50px 触发）——纵/横靠方向锁区分，一次手势只认一个方向。
 * 本条不在滚动容器内，触摸全由 JS 接管（touchAction none），不存在与页面滚动的争夺。
 */
export default function MiniBar() {
  const cur = useStore((s) => s.cur)
  const playing = useStore((s) => s.playing)
  const pos = useStore((s) => s.pos)
  const toggle = useStore((s) => s.toggle)
  const next = useStore((s) => s.next)
  const prev = useStore((s) => s.prev)
  const setPlayerOpen = useStore((s) => s.setPlayerOpen)
  const tracks = useStore((s) => s.tracks)
  const sleepActive = useStore((s) => s.sleepEndsAt !== null || s.sleepAfterTrack)
  const song = tracks[cur]

  if (!song) return null

  return (
    <motion.div
      className="glass relative mx-4 mb-2 shrink-0 cursor-pointer overflow-hidden rounded-full py-2 pr-2 pl-2.5"
      data-pressable
      style={{ touchAction: 'none' }}
      onClick={() => setPlayerOpen(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && setPlayerOpen(true)}
      drag
      dragDirectionLock
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.6}
      onDragEnd={(_, info) => {
        // 方向锁保证一次手势只有一个方向有显著位移：先判上滑展开，再判横滑切歌
        if (info.offset.y <= -50) {
          setPlayerOpen(true)
        } else if (info.offset.x <= -60) {
          hapticImpact()
          next()
        } else if (info.offset.x >= 60) {
          hapticImpact()
          prev()
        }
      }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-center gap-3">
        <div
          className={`cover relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full text-white ${playing ? 'pulsing' : ''}`}
          style={{ ['--cover' as string]: song.color }}
        >
          {song.coverSrc ? (
            <img src={song.thumbSrc ?? song.coverSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <span className="h-4 w-4 rounded-full bg-surface/85" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold">{song.name}</p>
          <p className="flex items-center gap-1 truncate text-sub text-ink2">
            {sleepActive && <MoonStar size={11} style={{ color: 'var(--accent)' }} aria-label="睡眠定时已开启" />}
            {song.artist}
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); toggle() }}
          aria-label={playing ? '暂停' : '播放'}
          className="pill-active grid h-11 w-11 place-items-center rounded-full"
        >
          {playing ? <Pause size={20} fill="var(--accent)" style={{ color: 'var(--accent)' }} /> : <Play size={20} fill="var(--accent)" style={{ color: 'var(--accent)' }} />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); hapticImpact(); next() }}
          aria-label="下一首"
          className="grid h-11 w-11 place-items-center rounded-full"
        >
          <SkipForward size={20} style={{ color: 'var(--accent)' }} />
        </button>
      </div>
      {/* 底部细进度线：贴合胶囊弧度，居中收窄 */}
      <div className="absolute right-6 bottom-0.5 left-6 h-0.5 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full accent-bg transition-all" style={{ width: `${pct(pos, song.dur)}%` }} />
      </div>
    </motion.div>
  )
}
