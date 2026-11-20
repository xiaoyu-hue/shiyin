import { memo, useRef, useState } from 'react'
import { motion, useMotionValue, useTransform } from 'motion/react'
import { Check, Heart, ListPlus, MoreHorizontal, Play } from 'lucide-react'
import { useStore } from '../store'
import { fmtTime } from '../lib/format'
import { hapticImpact } from '../platform/haptics'

interface Props {
  index: number
  rank?: number
  /** 所在列表的全部曲目下标：播放时以此顺序生成队列，也是多选的范围（scope） */
  context?: number[]
}

/** 长按触发时长（毫秒）：明显长于点按、又不至于让用户等得不耐烦 */
const LONG_PRESS_MS = 480
/** 右滑触发「下一首播放」的位移阈值（px） */
const SWIPE_NEXT_PX = 72

function SongRow({ index, rank, context }: Props) {
  const tracks = useStore((s) => s.tracks)
  const song = tracks[index]
  const cur = useStore((s) => s.cur)
  const playing = useStore((s) => s.playing)
  const liked = useStore((s) => s.liked)
  const play = useStore((s) => s.play)
  const playNext = useStore((s) => s.playNext)
  const toggleLike = useStore((s) => s.toggleLike)
  const setMenuTrack = useStore((s) => s.setMenuTrack)
  const selection = useStore((s) => s.selection)
  const enterSelection = useStore((s) => s.enterSelection)
  const toggleSelected = useStore((s) => s.toggleSelected)

  const pressTimer = useRef<number | null>(null)
  const pressStart = useRef<{ x: number; y: number } | null>(null)
  const longPressed = useRef(false)
  const swipedAt = useRef(0)
  const [flash, setFlash] = useState(false)
  const flashTimer = useRef<number | null>(null)

  // 右滑揭示层：随拖动位移渐显（还没松手就让用户看到将触发的动作）
  const x = useMotionValue(0)
  const revealOpacity = useTransform(x, [8, 40, SWIPE_NEXT_PX], [0, 0.35, 1])

  if (!song) return null

  const isCurrent = cur === index
  const isLocal = Boolean(song.audioSrc)
  const inSelection = selection !== null
  const selected = inSelection && selection.includes(index)

  const clearPressTimer = () => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  const startPress = (clientX: number, clientY: number) => {
    if (inSelection) return
    longPressed.current = false
    pressStart.current = { x: clientX, y: clientY }
    clearPressTimer()
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null
      longPressed.current = true
      hapticImpact()
      enterSelection(index, context ?? [index])
    }, LONG_PRESS_MS)
  }

  const movePress = (clientX: number, clientY: number) => {
    const start = pressStart.current
    if (!start) return
    // 指针挪开超过 10px 视为滚动/拖动意图，取消长按（与右滑、纵向滚动互斥）
    if (Math.abs(clientX - start.x) > 10 || Math.abs(clientY - start.y) > 10) clearPressTimer()
  }

  const handleClick = () => {
    // 长按刚触发过：随后的 click 不能再触发播放/切换
    if (longPressed.current) {
      longPressed.current = false
      return
    }
    // 右滑刚触发过：随后的 click 同理吞掉
    if (Date.now() - swipedAt.current < 300) return
    if (inSelection) {
      toggleSelected(index)
      return
    }
    play(index, context)
  }

  const handleDragEnd = (offsetX: number) => {
    clearPressTimer()
    if (inSelection || offsetX <= SWIPE_NEXT_PX) return
    swipedAt.current = Date.now()
    hapticImpact()
    playNext(index)
    setFlash(true)
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(false), 900)
  }

  return (
    <div
      className="relative overflow-hidden rounded-[var(--r-card)] [contain-intrinsic-size:auto_68px] [content-visibility:auto]"
      onPointerDown={(e) => {
        if (e.button === 0) startPress(e.clientX, e.clientY)
      }}
      onPointerMove={(e) => movePress(e.clientX, e.clientY)}
      onPointerUp={clearPressTimer}
      onPointerLeave={clearPressTimer}
      onPointerCancel={clearPressTimer}
      onContextMenu={(e) => {
        // 桌面右键与个别 WebView 的长按会走 contextmenu：统一接管为进入多选，并屏蔽系统菜单
        e.preventDefault()
        if (!inSelection && !longPressed.current) {
          hapticImpact()
          enterSelection(index, context ?? [index])
        }
        longPressed.current = false
      }}
    >
      {/* 右滑揭示层：拖动时从左侧渐显「下一首播放」 */}
      {!inSelection && (
        <motion.div
          style={{ opacity: revealOpacity }}
          className="accent-bg pointer-events-none absolute inset-0 flex items-center gap-1.5 pl-4 text-white"
          aria-hidden
        >
          <ListPlus size={18} />
          <span className="text-sub font-semibold">下一首播放</span>
        </motion.div>
      )}
      <motion.div
        style={{
          x,
          touchAction: 'pan-y',
          background: selected ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : undefined,
        }}
        drag={inSelection ? false : 'x'}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0, right: 0.45 }}
        onDragStart={clearPressTimer}
        onDragEnd={(_, info) => handleDragEnd(info.offset.x)}
        className={`relative flex items-center gap-3 px-2 py-2.5 transition-colors ${inSelection ? '' : 'active:bg-ink/5'}`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-pressed={inSelection ? selected : undefined}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (inSelection) toggleSelected(index)
            else play(index, context)
          }
        }}
      >
        {inSelection ? (
          <span
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
              selected ? 'border-transparent text-white' : 'border-ink/25 text-transparent'
            }`}
            style={selected ? { background: 'var(--accent)' } : undefined}
            aria-hidden
          >
            <Check size={14} />
          </span>
        ) : rank !== undefined ? (
          <span className="w-5 shrink-0 text-center text-body font-semibold" style={{ color: 'var(--accent)' }}>
            {rank}
          </span>
        ) : null}
        <div
          className="cover relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[var(--r-cover)] text-white shadow-sm"
          style={{ ['--cover' as string]: song.color }}
        >
          {song.coverSrc && (
            <img
              src={song.thumbSrc ?? song.coverSrc}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          {isCurrent && playing ? (
            <span className="pulsing relative grid h-6 w-6 place-items-center rounded-full bg-surface/90">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--accent)' }} />
            </span>
          ) : song.coverSrc ? null : (
            <Play size={18} fill="white" className="opacity-90" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className={`truncate text-body ${isCurrent ? 'font-semibold' : 'font-medium'}`} style={isCurrent ? { color: 'var(--accent)' } : undefined}>
            {song.name}
          </div>
          <div className="mt-0.5 truncate text-sub text-ink2">{song.artist} · {song.album}</div>
        </div>
        {selected && <span className="shrink-0 text-sub font-medium" style={{ color: 'var(--accent)' }}>已选</span>}
        <span className="flex shrink-0 items-center gap-1.5 text-sub tabular-nums text-ink3">
          {isLocal && (
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: 'var(--accent)' }}
              title="本地音频，可真实播放"
            />
          )}
          {fmtTime(song.dur)}
        </span>
        {!inSelection && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); hapticImpact(); toggleLike(song.id) }}
              aria-label={liked.has(song.id) ? '取消收藏' : '收藏'}
              className="shrink-0 p-1.5"
            >
              <Heart size={18} fill={liked.has(song.id) ? 'var(--accent)' : 'none'} style={{ color: liked.has(song.id) ? 'var(--accent)' : '#b8b0a4' }} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuTrack(index) }}
              aria-label={`《${song.name}》的更多操作`}
              className="-ml-1 grid h-10 w-9 shrink-0 place-items-center rounded-full text-ink3"
            >
              <MoreHorizontal size={19} />
            </button>
          </>
        )}
      </motion.div>
      {/* 右滑触发后的行内短暂反馈 */}
      {flash && (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-1 pr-4 text-sub font-semibold"
          style={{ color: 'var(--accent)' }}
          aria-hidden
        >
          <ListPlus size={14} />
          已排到下一首
        </div>
      )}
    </div>
  )
}

/** 列表行：props 不变时跳过重渲染（行内状态走 store 订阅，不受 memo 影响） */
export default memo(SongRow)
