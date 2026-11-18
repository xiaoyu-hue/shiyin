import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, Heart, Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, ListMusic, Mic2 } from 'lucide-react'
import { useStore, songs } from '../store'
import { fmtTime } from '../lib/format'
import { sheetTransition } from '../lib/motion'

const modeIcon = { list: ListMusic, repeat: Repeat, shuffle: Shuffle }

export default function PlayerView() {
  const open = useStore((s) => s.playerOpen)
  const setOpen = useStore((s) => s.setPlayerOpen)
  const cur = useStore((s) => s.cur)
  const playing = useStore((s) => s.playing)
  const pos = useStore((s) => s.pos)
  const mode = useStore((s) => s.mode)
  const liked = useStore((s) => s.liked)
  const toggle = useStore((s) => s.toggle)
  const next = useStore((s) => s.next)
  const prev = useStore((s) => s.prev)
  const seek = useStore((s) => s.seek)
  const cycleMode = useStore((s) => s.cycleMode)
  const toggleLike = useStore((s) => s.toggleLike)
  const setLyricOpen = useStore((s) => s.setLyricOpen)
  const song = songs[cur]
  const ModeIcon = modeIcon[mode]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-30 flex flex-col px-6 pt-5 pb-8"
          style={{ background: `linear-gradient(180deg, var(--accent) -10%, var(--bg) 55%, var(--bg-end) 100%)` }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={sheetTransition}
        >
          <div className="flex items-center justify-between text-white">
            <button onClick={() => setOpen(false)} aria-label="收起播放器" className="p-2">
              <ChevronDown size={26} />
            </button>
            <div className="text-center">
              <p className="text-[11px] opacity-80">正在播放</p>
              <p className="text-sm font-semibold">{song.album}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setLyricOpen(true)} aria-label="打开歌词" className="p-2">
                <Mic2 size={22} />
              </button>
              <button onClick={() => toggleLike(song.id)} aria-label="收藏" className="p-2">
                <Heart size={24} fill={liked.has(song.id) ? 'white' : 'none'} />
              </button>
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-8">
            <div
              className={`cover grid h-64 w-64 place-items-center rounded-full shadow-2xl ${playing ? 'spinning' : ''}`}
              style={{ ['--cover' as string]: song.color }}
            >
              <div className="h-16 w-16 rounded-full bg-black/25 ring-8 ring-white/20" />
            </div>
            <div className="w-full text-center">
              <h2 className="text-2xl font-bold text-black/85">{song.name}</h2>
              <p className="mt-1 text-sm text-black/50">{song.artist}</p>
            </div>
          </div>

          <div className="space-y-4">
            <input
              type="range"
              min={0}
              max={song.dur}
              value={pos}
              onChange={(e) => seek(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
              aria-label="播放进度"
            />
            <div className="flex justify-between text-xs text-black/45">
              <span>{fmtTime(pos)}</span>
              <span>{fmtTime(song.dur)}</span>
            </div>
            <div className="flex items-center justify-center gap-8 pt-1">
              <button onClick={cycleMode} aria-label="播放模式" className="p-2">
                <ModeIcon size={22} style={{ color: 'var(--accent)' }} />
              </button>
              <button onClick={prev} aria-label="上一首" className="p-2">
                <SkipBack size={30} fill="var(--accent)" style={{ color: 'var(--accent)' }} />
              </button>
              <button onClick={toggle} aria-label={playing ? '暂停' : '播放'} className="grid h-16 w-16 place-items-center rounded-full shadow-lg accent-bg">
                {playing ? <Pause size={28} fill="white" className="text-white" /> : <Play size={28} fill="white" className="text-white" />}
              </button>
              <button onClick={next} aria-label="下一首" className="p-2">
                <SkipForward size={30} fill="var(--accent)" style={{ color: 'var(--accent)' }} />
              </button>
              <div className="w-10" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
