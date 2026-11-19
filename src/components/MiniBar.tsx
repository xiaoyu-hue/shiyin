import { motion } from 'motion/react'
import { Play, Pause, SkipForward } from 'lucide-react'
import { useStore } from '../store'
import { pct } from '../lib/format'

/**
 * 迷你播放条：悬浮液态玻璃胶囊（0.5.0 改版）。
 * 点按展开全屏播放器；左右横滑切歌（拖动超过 60px 触发，纵向拖动不响应）。
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
  const song = tracks[cur]

  if (!song) return null

  return (
    <motion.div
      className="glass relative mx-4 mb-2 shrink-0 cursor-pointer overflow-hidden rounded-full py-2 pr-2 pl-2.5"
      onClick={() => setPlayerOpen(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && setPlayerOpen(true)}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={(_, info) => {
        if (info.offset.x <= -60) next()
        else if (info.offset.x >= 60) prev()
      }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-center gap-3">
        <div
          className={`cover relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full text-white ${playing ? 'pulsing' : ''}`}
          style={{ ['--cover' as string]: song.color }}
        >
          {song.coverSrc ? (
            <img src={song.coverSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <span className="h-4 w-4 rounded-full bg-white/85" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{song.name}</p>
          <p className="truncate text-xs text-black/45">{song.artist}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); toggle() }}
          aria-label={playing ? '暂停' : '播放'}
          className="grid h-11 w-11 place-items-center rounded-full bg-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_8px_rgba(31,27,22,0.10)]"
        >
          {playing ? <Pause size={20} fill="var(--accent)" style={{ color: 'var(--accent)' }} /> : <Play size={20} fill="var(--accent)" style={{ color: 'var(--accent)' }} />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); next() }}
          aria-label="下一首"
          className="grid h-11 w-11 place-items-center rounded-full"
        >
          <SkipForward size={20} style={{ color: 'var(--accent)' }} />
        </button>
      </div>
      {/* 底部细进度线：贴合胶囊弧度，居中收窄 */}
      <div className="absolute right-6 bottom-0.5 left-6 h-0.5 overflow-hidden rounded-full bg-black/10">
        <div className="h-full rounded-full accent-bg transition-all" style={{ width: `${pct(pos, song.dur)}%` }} />
      </div>
    </motion.div>
  )
}
