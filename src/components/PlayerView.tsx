import { useEffect, useRef, useState } from 'react'
import { coverVar } from '../lib/theme'
import {
  AnimatePresence,
  motion,
  useAnimationFrame,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from 'motion/react'
import {
  ChevronDown,
  Heart,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  RotateCcw,
  RotateCw,
  Shuffle,
  ListMusic,
  ListVideo,
  Mic2,
} from 'lucide-react'
import { useStore } from '../store'
import { fmtTime } from '../lib/format'
import {
  PAGE_CLOSE_VELOCITY,
  SHEET_CLOSE_OFFSET_PX,
  SWIPE_TRACK_PX,
  crossfadeTransition,
  springGentle,
  springSheet,
} from '../lib/motion'
import { extractCoverGlow, parseHexColor, rgbCss, softenColor } from '../lib/coverColor'
import { getCoverMesh } from '../lib/coverMesh'
import SeekBar from './SeekBar'
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
  const smoothMode = useStore((s) => s.smoothMode)
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
      void extractCoverGlow(src)
        .then((c) => {
          if (alive) setGlow(c)
        })
        .catch(() => undefined)
    } else {
      setGlow(null)
    }
    return () => {
      alive = false
    }
  }, [song?.coverSrc, song?.midCoverSrc, song?.id])

  // mesh 氛围背景（1.4.0，取代 1.1.0 预模糊位图）：切歌时把封面一次性生成
  // 弥散渐变位图（lib/coverMesh，缓存 8 张），铺满后零每帧成本；流畅模式
  // 关闭氛围图、回退根部的静态取色渐变（护栏：重效果必有降级形态）
  const [mesh, setMesh] = useState<{ id: number; url: string } | null>(null)
  useEffect(() => {
    let alive = true
    const src = song ? (song.midCoverSrc ?? song.coverSrc) : null
    if (song && src && !smoothMode) {
      const id = song.id
      void getCoverMesh(id, src)
        .then((url) => {
          if (alive) setMesh(url ? { id, url } : null)
        })
        .catch(() => undefined)
    } else {
      setMesh(null)
    }
    return () => {
      alive = false
    }
  }, [song?.id, song?.midCoverSrc, song?.coverSrc, smoothMode])

  // 转盘定格（1.4.0）：角度走 MotionValue 手动推进，暂停时停在当前角度，
  // 不再像 CSS 动画移除那样瞬间弹回 0°；速度 30°/s（12 秒一圈）
  const rotate = useMotionValue(0)
  const playingRef = useRef(playing)
  useEffect(() => {
    playingRef.current = playing
  }, [playing])
  useAnimationFrame((_, delta) => {
    if (playingRef.current) rotate.set((rotate.get() + delta * 0.03) % 360)
  })

  // 封面横滑的跟手提示（1.4.0）：拖动位移驱动两侧切歌图标淡入
  const dragX = useMotionValue(0)
  const prevHintOpacity = useTransform(dragX, [8, 64], [0, 1])
  const nextHintOpacity = useTransform(dragX, [-64, -8], [1, 0])
  // 迷你条↔播放页共享元素（1.4.0）：流畅模式/系统减少动态时不做形变，退回整页转场
  const reducedMotion = useReducedMotion()
  const morphCover = !smoothMode && !reducedMotion

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
    if (info.offset.x <= -SWIPE_TRACK_PX) {
      hapticImpact()
      next()
    } else if (info.offset.x >= SWIPE_TRACK_PX) {
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
          className="absolute inset-0 z-30 flex flex-col overflow-hidden px-6 desk:px-12"
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
            if (info.offset.y > SHEET_CLOSE_OFFSET_PX || info.velocity.y > PAGE_CLOSE_VELOCITY) setOpen(false)
          }}
        >
          {/* mesh 氛围层：预生成弥散位图铺满作色彩场（静态位图零每帧成本）；切歌交叉淡化 */}
          <AnimatePresence>
            {mesh && song && mesh.id === song.id && (
              <motion.img
                key={mesh.id}
                src={mesh.url}
                alt=""
                aria-hidden
                className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: dark ? 0.38 : 0.55 }}
                exit={{ opacity: 0 }}
                transition={crossfadeTransition}
              />
            )}
          </AnimatePresence>
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
            <button
              onClick={() => setOpen(false)}
              aria-label="收起播放器"
              className="glass grid h-11 w-11 place-items-center rounded-full"
            >
              <ChevronDown size={24} />
            </button>
            <div className="text-center">
              <p className="text-caption text-ink2">正在播放</p>
              <p className="max-w-[13rem] truncate text-body font-semibold text-ink/85">{song.album}</p>
            </div>
            <div className="flex items-center gap-2">
              <SleepMenu />
              <button
                onClick={() => setLyricOpen(true)}
                aria-label="打开歌词"
                className="glass grid h-11 w-11 place-items-center rounded-full"
              >
                <Mic2 size={20} />
              </button>
              <button
                onClick={() => {
                  hapticImpact()
                  toggleLike(song.id)
                }}
                aria-label="收藏"
                className="glass grid h-11 w-11 place-items-center rounded-full"
              >
                <Heart
                  size={21}
                  fill={liked.has(song.id) ? 'var(--accent)' : 'none'}
                  style={{ color: 'var(--accent)' }}
                />
              </button>
            </div>
          </div>

          {/* 中部内容区：默认只有封面是横滑切歌区；设置开启「全屏滑动切歌」后整区可滑。
              两个拖动层互斥启用（drag=false 的一层不拦截手势），下拉关闭走顶部手柄的独立拖动控制，互不干扰 */}
          <div className="relative flex flex-1 flex-col desk:flex-row desk:items-center desk:gap-12">
            <motion.div
              className="relative flex flex-1 flex-col items-center justify-center gap-8 desk:min-w-0"
              style={{ touchAction: 'pan-y' }}
              drag={swipeAnywhere ? 'x' : false}
              dragDirectionLock
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.5}
              onDragEnd={handleSwipeEnd}
            >
              <motion.div layoutId={morphCover ? 'now-playing-cover' : undefined} className="relative">
                <motion.div
                  className="relative"
                  style={{ touchAction: 'pan-y', x: dragX }}
                  drag={swipeAnywhere ? false : 'x'}
                  dragDirectionLock
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.5}
                  onDragEnd={handleSwipeEnd}
                  onPointerDown={() => {
                    dragDist.current = 0
                  }}
                  onClick={handleCoverClick}
                  animate={{ scale: playing ? 1 : 0.94 }}
                  transition={springGentle}
                >
                  <motion.div
                    className="cover relative grid h-64 w-64 place-items-center overflow-hidden rounded-full shadow-2xl ring-1 ring-white/50 desk:h-80 desk:w-80 desk:xl:h-96 desk:xl:w-96"
                    style={{ rotate, ...coverVar(song.color) }}
                  >
                    {song.coverSrc ? (
                      <>
                        <img
                          src={song.midCoverSrc ?? song.coverSrc}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                        <div className="relative h-16 w-16 rounded-full bg-black/25 ring-8 ring-white/20" />
                      </>
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-black/25 ring-8 ring-white/20" />
                    )}
                  </motion.div>
                  {/* 横滑跟手提示：拖向哪侧，哪侧的切歌图标先探头（1.4.0） */}
                  <motion.span
                    style={{ opacity: prevHintOpacity }}
                    className="pointer-events-none absolute inset-y-0 -left-4 flex items-center"
                    aria-hidden
                  >
                    <span
                      className="glass grid h-9 w-9 place-items-center rounded-full"
                      style={{ color: 'var(--accent)' }}
                    >
                      <SkipBack size={16} />
                    </span>
                  </motion.span>
                  <motion.span
                    style={{ opacity: nextHintOpacity }}
                    className="pointer-events-none absolute inset-y-0 -right-4 flex items-center"
                    aria-hidden
                  >
                    <span
                      className="glass grid h-9 w-9 place-items-center rounded-full"
                      style={{ color: 'var(--accent)' }}
                    >
                      <SkipForward size={16} />
                    </span>
                  </motion.span>
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
              </motion.div>
            </motion.div>
            <div className="contents desk:flex desk:w-[400px] desk:shrink-0 desk:flex-col desk:justify-center desk:gap-8">
              <div className="w-full text-center desk:text-left">
                <h2 className="text-title font-bold text-ink/85 desk:text-display">{song.name}</h2>
                <p className="mt-1 text-body text-ink2">{song.artist}</p>
                {audioError && <p className="mt-2 text-caption text-danger">{audioError}</p>}
              </div>
              <div className="glass-strong relative rounded-[var(--r-sheet)] p-5">
                <SeekBar value={Math.min(pos, duration)} max={duration} onSeek={seek} />
                <div className="mt-1 flex justify-between text-sub tabular-nums text-ink2">
                  <span>{fmtTime(pos)}</span>
                  <span>{song.dur > 0 ? fmtTime(song.dur) : '--:--'}</span>
                </div>
                <div className="mt-2 flex items-center justify-center gap-6">
                  <button
                    onClick={cycleMode}
                    aria-label="播放模式"
                    className="grid h-11 w-11 place-items-center rounded-full"
                  >
                    <ModeIcon size={22} style={{ color: 'var(--accent)' }} />
                  </button>
                  <button
                    onClick={() => {
                      hapticImpact()
                      prev()
                    }}
                    aria-label="上一首"
                    className="grid h-11 w-11 place-items-center rounded-full"
                  >
                    <SkipBack size={28} fill="var(--accent)" style={{ color: 'var(--accent)' }} />
                  </button>
                  <button
                    onClick={toggle}
                    aria-label={playing ? '暂停' : '播放'}
                    className="grid h-16 w-16 place-items-center rounded-full shadow-lg accent-bg"
                  >
                    {playing ? (
                      <Pause size={28} fill="white" className="text-white" />
                    ) : (
                      <Play size={28} fill="white" className="text-white" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      hapticImpact()
                      next()
                    }}
                    aria-label="下一首"
                    className="grid h-11 w-11 place-items-center rounded-full"
                  >
                    <SkipForward size={28} fill="var(--accent)" style={{ color: 'var(--accent)' }} />
                  </button>
                  <button
                    onClick={() => setQueueOpen(true)}
                    aria-label="打开播放队列"
                    className="grid h-11 w-11 place-items-center rounded-full"
                  >
                    <ListVideo size={22} style={{ color: 'var(--accent)' }} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
