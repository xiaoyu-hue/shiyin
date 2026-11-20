import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'motion/react'
import { ChevronDown, Heart, Play, Pause, SkipBack, SkipForward, Repeat, RotateCcw, RotateCw, Shuffle, ListMusic, ListVideo, Mic2 } from 'lucide-react'
import { useStore } from '../store'
import { fmtTime } from '../lib/format'
import { springSheet } from '../lib/motion'
import { extractCoverGlow, parseHexColor, rgbCss, softenColor } from '../lib/coverColor'
import { getBlurredBackdrop } from '../lib/blurBackdrop'
import { hapticImpact } from '../platform/haptics'
import { useResolvedDark } from '../hooks/useTheme'
import SleepMenu from './SleepMenu'

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
  const swipeAnywhere = useStore((s) => s.swipeAnywhere)
  const dark = useResolvedDark()
  const song = tracks[cur]
  const ModeIcon = modeIcon[mode]
  // 下拉关闭只从顶部手柄/标题区发起拖拽，避免与进度条拖动冲突
  const dragControls = useDragControls()

  // 封面取色光晕：有封面图时提取柔和主色，无图/失败时用曲目兜底色调柔
  const [glow, setGlow] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    // 取色只采样 24px，中图已足够且解码更便宜（1.1.0）
    const src = song ? (song.midCoverSrc ?? song.coverSrc) : null
    if (src) {
      void extractCoverGlow(src).then((c) => {
        if (alive) setGlow(c)
      })
    } else {
      setGlow(null)
    }
    return () => {
      alive = false
    }
  }, [song?.coverSrc, song?.midCoverSrc, song?.id])

  // 预模糊氛围背景（1.1.0）：封面缩成小位图一次性糊好当背景（内存缓存），
  // 替代原先整屏实时 blur-3xl；取中图作源已足够，失败回退纯渐变
  const [blurBg, setBlurBg] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    const src = song ? (song.midCoverSrc ?? song.coverSrc) : null
    if (song && src) {
      void getBlurredBackdrop(song.id, src).then((url) => {
        if (alive) setBlurBg(url)
      })
    } else {
      setBlurBg(null)
    }
    return () => {
      alive = false
    }
  }, [song?.id, song?.midCoverSrc, song?.coverSrc])

  // 封面手势（1.2.0）：横滑切歌与点按 seek 共用拖动距离守卫——
  // 拖动结束时记下位移，随后的 click 若来自这次拖动则吞掉，不误判为点按
  const dragDist = useRef(0)
  const [seekHint, setSeekHint] = useState<'back' | 'fwd' | null>(null)
  const hintTimer = useRef<number | null>(null)

  const flashSeekHint = (dir: 'back' | 'fwd') => {
    hapticImpact()
    setSeekHint(dir)
    if (hintTimer.current !== null) window.clearTimeout(hintTimer.current)
    hintTimer.current = window.setTimeout(() => setSeekHint(null), 750)
  }

  const handleSwipeEnd = (_: unknown, info: PanInfo) => {
    dragDist.current = Math.abs(info.offset.x)
    if (info.offset.x <= -60) {
      hapticImpact()
      next()
    } else if (info.offset.x >= 60) {
      hapticImpact()
      prev()
    }
  }

  const handleCoverClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragDist.current > 10) {
      dragDist.current = 0
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    if (rect.width <= 0) return
    const ratio = (e.clientX - rect.left) / rect.width
    if (ratio < 1 / 3) {
      seek(Math.max(0, pos - 10))
      flashSeekHint('back')
    } else if (ratio > 2 / 3) {
      seek(pos + 10)
      flashSeekHint('fwd')
    }
  }

  if (!song) return null

  const fallback = parseHexColor(song.color)
  const glowColor = glow ?? (fallback ? rgbCss(softenColor(fallback, 0.45)) : 'var(--bg)')

  const duration = Math.max(1, Math.round(song.dur))

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-30 flex flex-col overflow-hidden px-6"
          style={{
            background: `linear-gradient(180deg, ${glowColor} 0%, var(--bg) 58%, var(--bg-end) 100%)`,
            // 沉浸式：渐变背景照样铺满全屏（含状态栏背后），顶部控件行垫安全区下移（1.1.0）
            paddingTop: 'calc(1rem + var(--sat))',
            paddingBottom: 'calc(2rem + var(--sab))',
          }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={springSheet}
          drag="y"
          dragListener={false}
          dragControls={dragControls}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.7 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 110 || info.velocity.y > 600) setOpen(false)
          }}
        >
          {/* 封面光晕层：预模糊小位图放大铺满作色彩场（位图本身已糊，不再实时模糊）；深色下降低亮度避免刺眼 */}
          {blurBg && (
            <img
              src={blurBg}
              alt=""
              aria-hidden
              className={`pointer-events-none absolute inset-0 h-full w-full object-cover ${dark ? 'opacity-30' : 'opacity-50'}`}
            />
          )}
          {dark && (
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.30) 0%, transparent 58%)' }}
              aria-hidden
            />
          )}
          {/* 顶部拖拽手柄：按住下拉可关闭播放页 */}
          <div
            className="relative mx-auto mb-3 flex h-5 w-full shrink-0 cursor-grab touch-none items-start justify-center"
            onPointerDown={(e) => dragControls.start(e)}
            aria-hidden
          >
            <div className="h-1 w-10 rounded-full bg-ink/20" />
          </div>

          <div
            className="relative flex items-center justify-between text-ink/70"
            onPointerDown={(e) => dragControls.start(e)}
          >
            <button onClick={() => setOpen(false)} aria-label="收起播放器" className="glass grid h-11 w-11 place-items-center rounded-full">
              <ChevronDown size={24} />
            </button>
            <div className="text-center">
              <p className="text-caption text-ink2">正在播放</p>
              <p className="max-w-[13rem] truncate text-body font-semibold text-ink/85">{song.album}</p>
            </div>
            <div className="flex items-center gap-2">
              <SleepMenu />
              <button onClick={() => setLyricOpen(true)} aria-label="打开歌词" className="glass grid h-11 w-11 place-items-center rounded-full">
                <Mic2 size={20} />
              </button>
              <button onClick={() => { hapticImpact(); toggleLike(song.id) }} aria-label="收藏" className="glass grid h-11 w-11 place-items-center rounded-full">
                <Heart size={21} fill={liked.has(song.id) ? 'var(--accent)' : 'none'} style={{ color: 'var(--accent)' }} />
              </button>
            </div>
          </div>

          {/* 中部内容区：默认只有封面是横滑切歌区；设置开启「全屏滑动切歌」后整区可滑。
              两个拖动层互斥启用（drag=false 的一层不拦截手势），下拉关闭走顶部手柄的独立拖动控制，互不干扰 */}
          <motion.div
            className="relative flex flex-1 flex-col items-center justify-center gap-8"
            style={{ touchAction: 'pan-y' }}
            drag={swipeAnywhere ? 'x' : false}
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.5}
            onDragEnd={handleSwipeEnd}
          >
            <motion.div
              className="relative"
              style={{ touchAction: 'pan-y' }}
              drag={swipeAnywhere ? false : 'x'}
              dragDirectionLock
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.5}
              onDragEnd={handleSwipeEnd}
              onPointerDown={() => {
                dragDist.current = 0
              }}
              onClick={handleCoverClick}
            >
              <div
                className={`cover relative grid h-64 w-64 place-items-center overflow-hidden rounded-full shadow-2xl ring-1 ring-white/50 ${playing ? 'spinning' : ''}`}
                style={{ ['--cover' as string]: song.color }}
              >
                {song.coverSrc ? (
                  <>
                    <img src={song.midCoverSrc ?? song.coverSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    <div className="relative h-16 w-16 rounded-full bg-black/25 ring-8 ring-white/20" />
                  </>
                ) : (
                  <div className="h-16 w-16 rounded-full bg-black/25 ring-8 ring-white/20" />
                )}
              </div>
              {/* 点封面两侧快退/快进的短暂方向提示 */}
              {seekHint && (
                <div
                  className={`pointer-events-none absolute inset-y-0 flex items-center ${seekHint === 'back' ? '-left-2' : '-right-2'}`}
                  aria-hidden
                >
                  <span className="glass flex items-center gap-1 rounded-full px-3 py-1.5 text-sub font-semibold text-ink/80">
                    {seekHint === 'back' ? <RotateCcw size={14} /> : <RotateCw size={14} />}
                    {seekHint === 'back' ? '快退 10 秒' : '快进 10 秒'}
                  </span>
                </div>
              )}
            </motion.div>
            <div className="w-full text-center">
              <h2 className="text-title font-bold text-ink/85">{song.name}</h2>
              <p className="mt-1 text-body text-ink2">{song.artist}</p>
              {audioError && <p className="mt-2 text-caption text-danger">{audioError}</p>}
            </div>
          </motion.div>

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
            <div className="mt-1 flex justify-between text-sub tabular-nums text-ink2">
              <span>{fmtTime(pos)}</span>
              <span>{song.dur > 0 ? fmtTime(song.dur) : '--:--'}</span>
            </div>
            <div className="mt-2 flex items-center justify-center gap-6">
              <button onClick={cycleMode} aria-label="播放模式" className="grid h-11 w-11 place-items-center rounded-full">
                <ModeIcon size={22} style={{ color: 'var(--accent)' }} />
              </button>
              <button onClick={() => { hapticImpact(); prev() }} aria-label="上一首" className="grid h-11 w-11 place-items-center rounded-full">
                <SkipBack size={28} fill="var(--accent)" style={{ color: 'var(--accent)' }} />
              </button>
              <button onClick={toggle} aria-label={playing ? '暂停' : '播放'} className="grid h-16 w-16 place-items-center rounded-full shadow-lg accent-bg">
                {playing ? <Pause size={28} fill="white" className="text-white" /> : <Play size={28} fill="white" className="text-white" />}
              </button>
              <button onClick={() => { hapticImpact(); next() }} aria-label="下一首" className="grid h-11 w-11 place-items-center rounded-full">
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
