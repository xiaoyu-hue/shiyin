import { Play, Pause, SkipForward } from 'lucide-react'
import { useStore, songs } from '../store'
import { pct } from '../lib/format'

export default function MiniBar() {
  const cur = useStore((s) => s.cur)
  const playing = useStore((s) => s.playing)
  const pos = useStore((s) => s.pos)
  const toggle = useStore((s) => s.toggle)
  const next = useStore((s) => s.next)
  const setPlayerOpen = useStore((s) => s.setPlayerOpen)
  const song = songs[cur]

  return (
    <div
      className="relative mx-3 mb-1 shrink-0 cursor-pointer rounded-2xl bg-white/75 p-2.5 shadow-md backdrop-blur-md"
      onClick={() => setPlayerOpen(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && setPlayerOpen(true)}
    >
      {/* 顶部细进度线 */}
      <div className="absolute left-3 right-3 top-0 h-0.5 overflow-hidden rounded-full bg-black/10">
        <div className="h-full rounded-full accent-bg transition-all" style={{ width: `${pct(pos, song.dur)}%` }} />
      </div>
      <div className="flex items-center gap-3">
        <div
          className={`cover grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white ${playing ? 'pulsing' : ''}`}
          style={{ ['--cover' as string]: song.color }}
        >
          <span className="h-4 w-4 rounded-full bg-white/85" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{song.name}</p>
          <p className="truncate text-xs text-black/45">{song.artist}</p>
        </div>
        <button onClick={(e) => { e.stopPropagation(); toggle() }} aria-label={playing ? '暂停' : '播放'} className="p-1.5">
          {playing ? <Pause size={22} fill="var(--accent)" style={{ color: 'var(--accent)' }} /> : <Play size={22} fill="var(--accent)" style={{ color: 'var(--accent)' }} />}
        </button>
        <button onClick={(e) => { e.stopPropagation(); next() }} aria-label="下一首" className="p-1.5">
          <SkipForward size={20} style={{ color: 'var(--accent)' }} />
        </button>
      </div>
    </div>
  )
}
