import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { ChevronDown, Heart, Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, ListMusic, ListVideo, Mic2 } from 'lucide-react'
import { useStore } from '../store'
import { fmtTime } from '../lib/format'
import { sheetTransition } from '../lib/motion'
import { extractCoverGlow, parseHexColor, rgbCss, softenColor } from '../lib/coverColor'

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
  const setQueueOpen = useStore((s) => s.setQueueOpen)
  const tracks = useStore((s) => s.tracks)
  const audioError = useStore((s) => s.audioError)
  const song = tracks[cur]
  const ModeIcon = modeIcon[mode]
  // 下拉关闭只从顶部手柄/标题区发起拖拽，避免与进度条拖动冲突
  const dragControls = useDragControls()

  // 封面取色光晕：有封面图时提取柔和主色，无图/失败时用曲目兜底色调柔
  const [glow, setGlow] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    if (song?.coverSrc) {
      void extractCoverGlow(song.coverSrc).then((c) => {
        if (alive) setGlow(c)
      })
    } else {
      setGlow(null)
    }
    return () => {
      alive = false
    }
  }, [song?.coverSrc, song?.id])

  if (!song) return null

  const fallback = parseHexColor(song.color)
  const glowColor = glow ?? (fallback ? rgbCss(softenColor(fallback, 0.45)) : 'var(--bg)')

  const duration = Math.max(1, Math.round(song.dur))

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-30 flex flex-col overflow-hidden px-6 pt-4 pb-8"
          style={{ background: `linear-gradient(180deg, ${glowColor} 0%, var(--bg) 58%, var(--bg-end) 100%)` }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={sheetTransition}
          drag="y"
          dragListener={false}
          dragControls={dragControls}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.7 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 110 || info.velocity.y > 600) setOpen(false)
          }}
        >
          {/* 封面光晕层：封面图重度模糊铺满，营造液态玻璃后的色彩场 */}
          {song.coverSrc && (
            <img
              src={song.coverSrc}
              alt=""
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full scale-150 object-cover opacity-50 blur-3xl"
            />
          )}
          {/* 顶部拖拽手柄：按住下拉可关闭播放页 */}
          <div
            className="relative mx-auto mb-3 flex h-5 w-full shrink-0 cursor-grab touch-none items-start justify-center"
            onPointerDown={(e) => dragControls.start(e)}
            aria-hidden
          >
            <div className="h-1 w-10 rounded-full bg-black/20" />
          </div>

          <div
            className="relative flex items-center justify-between text-black/70"
            onPointerDown={(e) => dragControls.start(e)}
          >
            <button onClick={() => setOpen(false)} aria-label="收起播放器" className="glass grid h-11 w-11 place-items-center rounded-full">
              <ChevronDown size={24} />
            </button>
            <div className="text-center">
              <p className="text-[11px] text-black/45">正在播放</p>
              <p className="max-w-[13rem] truncate text-sm font-semibold text-black/85">{song.album}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setLyricOpen(true)} aria-label="打开歌词" className="glass grid h-11 w-11 place-items-center rounded-full">
                <Mic2 size={20} />
              </button>
              <button onClick={() => toggleLike(song.id)} aria-label="收藏" className="glass grid h-11 w-11 place-items-center rounded-full">
                <Heart size={21} fill={liked.has(song.id) ? 'var(--accent)' : 'none'} style={{ color: 'var(--accent)' }} />
              </button>
            </div>
          </div>

          <div className="relative flex flex-1 flex-col items-center justify-center gap-8">
            <div
              className={`cover relative grid h-64 w-64 place-items-center overflow-hidden rounded-full shadow-2xl ring-1 ring-white/50 ${playing ? 'spinning' : ''}`}
              style={{ ['--cover' as string]: song.color }}
            >
              {song.coverSrc ? (
                <>
                  <img src={song.coverSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="relative h-16 w-16 rounded-full bg-black/25 ring-8 ring-white/20" />
                </>
              ) : (
                <div className="h-16 w-16 rounded-full bg-black/25 ring-8 ring-white/20" />
              )}
            </div>
            <div className="w-full text-center">
              <h2 className="text-2xl font-bold text-black/85">{song.name}</h2>
              <p className="mt-1 text-sm text-black/50">{song.artist}</p>
              {audioError && <p className="mt-2 text-[11px] text-red-600">{audioError}</p>}
            </div>
          </div>

          <div className="glass-strong relative rounded-[var(--r-sheet)] p-5">
            <input
              type="range"
              min={0}
              max={duration}
              value={Math.min(pos, duration)}
              onChange={(e) => seek(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
              aria-label="播放进度"
            />
            <div className="mt-1 flex justify-between text-xs text-black/45">
              <span>{fmtTime(pos)}</span>
              <span>{song.dur > 0 ? fmtTime(song.dur) : '--:--'}</span>
            </div>
            <div className="mt-2 flex items-center justify-center gap-6">
              <button onClick={cycleMode} aria-label="播放模式" className="grid h-11 w-11 place-items-center rounded-full">
                <ModeIcon size={22} style={{ color: 'var(--accent)' }} />
              </button>
              <button onClick={prev} aria-label="上一首" className="grid h-11 w-11 place-items-center rounded-full">
                <SkipBack size={28} fill="var(--accent)" style={{ color: 'var(--accent)' }} />
              </button>
              <button onClick={toggle} aria-label={playing ? '暂停' : '播放'} className="grid h-16 w-16 place-items-center rounded-full shadow-lg accent-bg">
                {playing ? <Pause size={28} fill="white" className="text-white" /> : <Play size={28} fill="white" className="text-white" />}
              </button>
              <button onClick={next} aria-label="下一首" className="grid h-11 w-11 place-items-center rounded-full">
                <SkipForward size={28} fill="var(--accent)" style={{ color: 'var(--accent)' }} />
              </button>
              <button onClick={() => setQueueOpen(true)} aria-label="打开播放队列" className="grid h-11 w-11 place-items-center rounded-full">
                <ListVideo size={22} style={{ color: 'var(--accent)' }} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
