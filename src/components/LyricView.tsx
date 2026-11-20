import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, ImagePlus, ScrollText } from 'lucide-react'
import { useStore } from '../store'
import { lyricIndex, toSeconds } from '../lib/lyric'
import { fadeTransition, crossfadeTransition } from '../lib/motion'
import { getCoverMesh } from '../lib/coverMesh'
import LyricPoster from './LyricPoster'
import { useLyricAttach } from './useLyricAttach'

/**
 * 歌词页（PRD §5.8）：全屏沉浸、逐行高亮、点击跳转、高亮行平滑滚动居中。
 * 1.4.0「歌词即主角」：当前行放大到 26px 并按行内进度扫色（背景裁剪文字，
 * 唱到哪字色走到哪），邻行/远行按梯度降透明与微糊；行组件记忆化，
 * pos 高频更新只重渲当前行。静止 3.5 秒后顶/底栏淡出，进入纯歌词状态。
 * 本期仍为行级数据；逐字歌词为独立小阶段，不在此页范围内。
 */

type LineLevel = 'active' | 'near' | 'mid' | 'far' | 'idle'

const LEVEL_CLASS: Record<LineLevel, string> = {
  active: 'text-lyric opacity-100 desk:text-lyric-lg',
  near: 'text-xl opacity-55 desk:text-2xl',
  mid: 'text-xl opacity-40 desk:text-2xl',
  far: 'text-xl opacity-30 desk:text-2xl',
  idle: 'text-xl opacity-60 desk:text-2xl',
}

/** 流畅模式下的提亮阶梯（审计 A-43）：远行下限提到 0.55，低视力可读性优先于景深氛围 */
const LEVEL_CLASS_BOOST: Record<LineLevel, string> = {
  active: 'text-lyric opacity-100 desk:text-lyric-lg',
  near: 'text-xl opacity-80 desk:text-2xl',
  mid: 'text-xl opacity-65 desk:text-2xl',
  far: 'text-xl opacity-55 desk:text-2xl',
  idle: 'text-xl opacity-75 desk:text-2xl',
}

interface RowProps {
  text: string
  tSec: number
  level: LineLevel
  /** 当前行内扫色进度 0–1；仅当前行传入 */
  sweep: number | null
  /** 流畅模式下远行不加微糊（省合成成本） */
  softBlur: boolean
  onSeek: (tSec: number) => void
  registerRef: (el: HTMLButtonElement | null) => void
}

const LyricRow = memo(function LyricRow({ text, tSec, level, sweep, softBlur, onSeek, registerRef }: RowProps) {
  // 字号过渡说明（审计 A-46）：当前行字号变化走 font-size 过渡而非 transform scale——
  // scale 不占布局会与相邻行重叠、且缩放文字发虚；行级切换频率低（逐行推进）、
  // 同时只有一行在变，布局成本可控，维持现状
  const blurred = (level === 'mid' || level === 'far') && softBlur
  return (
    <button
      ref={registerRef}
      onClick={() => onSeek(tSec)}
      data-content
      aria-current={level === 'active' ? 'true' : undefined}
      className={`w-full text-left font-medium leading-relaxed transition-[font-size,opacity,filter] duration-[var(--dur-ui)] ${softBlur ? LEVEL_CLASS[level] : LEVEL_CLASS_BOOST[level]}`}
      style={{ filter: blurred ? 'blur(0.5px)' : undefined }}
    >
      {level === 'active' && sweep !== null ? (
        <span
          style={{
            backgroundImage: `linear-gradient(90deg, var(--accent) ${(sweep * 100).toFixed(1)}%, color-mix(in srgb, var(--ink) 55%, transparent) ${(sweep * 100).toFixed(1)}%)`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {text}
        </span>
      ) : (
        <span style={{ color: 'var(--ink)' }}>{text}</span>
      )}
    </button>
  )
})

export default function LyricView() {
  const open = useStore((s) => s.lyricOpen)
  const setOpen = useStore((s) => s.setLyricOpen)
  const cur = useStore((s) => s.cur)
  const pos = useStore((s) => s.pos)
  const seek = useStore((s) => s.seek)
  const tracks = useStore((s) => s.tracks)
  const smoothMode = useStore((s) => s.smoothMode)

  const song = tracks[cur]
  const active = song && song.lyrics.length ? lyricIndex(song, pos) : -1
  const lineRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [posterOpen, setPosterOpen] = useState(false)
  const lyricAttach = useLyricAttach()
  const [idle, setIdle] = useState(false)
  const idleTimer = useRef<number | null>(null)

  // mesh 氛围背景（1.4.0）：与播放页共用 lib/coverMesh 的缓存位图；流畅模式回退纯渐变
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

  // 高亮行变化时平滑滚动到可视区中部；刚展开时延后一帧等待布局
  useEffect(() => {
    if (!open || active < 0) return
    const id = window.requestAnimationFrame(() => {
      lineRefs.current[active]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return () => window.cancelAnimationFrame(id)
  }, [active, open, cur])

  // 空闲淡出：打开后/每次触碰重置 3.5s 计时，到点只淡出顶/底栏（歌词本体不动）
  const poke = useCallback(() => {
    setIdle(false)
    if (idleTimer.current !== null) window.clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(() => setIdle(true), 3500)
  }, [])
  useEffect(() => {
    if (open) poke()
    return () => {
      if (idleTimer.current !== null) window.clearTimeout(idleTimer.current)
    }
  }, [open, poke])

  const handleSeek = useCallback((tSec: number) => seek(tSec), [seek])

  // 每行的 ref 回调按下标缓存保持引用稳定，否则记忆化行会被新回调打穿
  const refCallbacks = useRef(new Map<number, (el: HTMLButtonElement | null) => void>())
  const getRefCallback = (i: number) => {
    let cb = refCallbacks.current.get(i)
    if (!cb) {
      cb = (el) => {
        lineRefs.current[i] = el
      }
      refCallbacks.current.set(i, cb)
    }
    return cb
  }

  // 当前行扫色进度：行首到下一行行首之间线性推进
  let sweep: number | null = null
  if (song && active >= 0) {
    const start = toSeconds(song.lyrics[active].t)
    const nextLine = song.lyrics[active + 1]
    const end = nextLine ? toSeconds(nextLine.t) : Math.max(start + 1, song.dur)
    sweep = Math.max(0, Math.min(1, (pos - start) / Math.max(0.1, end - start)))
  }

  return (
    <>
      <AnimatePresence>
        {open && song && (
          <motion.div
            className="absolute inset-0 z-40 flex flex-col overflow-hidden px-6"
            style={{
              background: `linear-gradient(180deg, var(--bg) 0%, var(--bg-end) 100%)`,
              // 沉浸式：背景铺满全屏，顶部控件行垫安全区下移（1.1.0）
              paddingTop: 'calc(1.25rem + var(--sat))',
              paddingBottom: 'calc(2rem + var(--sab))',
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={fadeTransition}
            role="dialog"
            aria-modal="true"
            aria-label="歌词"
            onPointerDown={poke}
          >
            {/* mesh 氛围层 + 薄纱：静态位图零每帧成本，纱层保文字对比 */}
            <AnimatePresence>
              {mesh && mesh.id === song.id && (
                <motion.img
                  key={mesh.id}
                  src={mesh.url}
                  alt=""
                  aria-hidden
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  exit={{ opacity: 0 }}
                  transition={crossfadeTransition}
                />
              )}
            </AnimatePresence>
            <div className="pointer-events-none absolute inset-0 bg-surface/30" aria-hidden />

            <div
              // text-ink/70 同 PlayerView 顶栏：光晕背景上的弱化 chrome（审计 A-42 归类保留）
              className={`relative flex items-center justify-between text-ink/70 transition-opacity duration-[var(--dur-slower)] ${idle ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
            >
              <button
                onClick={() => setOpen(false)}
                aria-label="收起歌词"
                className="glass grid h-11 w-11 place-items-center rounded-full"
              >
                <ChevronDown size={24} />
              </button>
              <div className="text-center">
                <p className="text-caption text-ink2">歌词</p>
                <p className="max-w-[16rem] truncate text-body font-semibold text-ink">{song.name}</p>
              </div>
              {song.lyrics.length > 0 ? (
                <button
                  onClick={() => setPosterOpen(true)}
                  aria-label="生成歌词海报"
                  className="glass grid h-11 w-11 place-items-center rounded-full"
                >
                  <ImagePlus size={20} />
                </button>
              ) : (
                <div className="w-11" />
              )}
            </div>

            {song.lyrics.length === 0 ? (
              <div className="relative flex flex-1 flex-col items-center justify-center px-6 text-center">
                <p className="text-body text-ink2">
                  该曲目暂无歌词
                  <br />
                  <span className="text-sub text-ink3">这首歌的文件里没有内嵌歌词</span>
                </p>
                <button
                  onClick={() => lyricAttach.openPicker(cur)}
                  className="glass mt-5 flex min-h-11 items-center gap-2 rounded-full px-5 text-body font-medium"
                >
                  <ScrollText size={17} style={{ color: 'var(--accent)' }} />
                  导入歌词文件（.lrc）
                </button>
                {lyricAttach.error && <p className="mt-3 text-sub text-danger">{lyricAttach.error}</p>}
                <input
                  ref={lyricAttach.inputRef}
                  type="file"
                  accept=".lrc,.txt"
                  className="hidden"
                  onChange={(e) => {
                    void lyricAttach.onChange(e)
                  }}
                />
              </div>
            ) : (
              <div className="lyric-scroll relative mt-2 w-full flex-1 overflow-y-auto py-24 desk:mx-auto desk:max-w-3xl">
                <div className="flex flex-col gap-5">
                  {song.lyrics.map((line, i) => {
                    const dist = active < 0 ? 99 : Math.abs(i - active)
                    const level: LineLevel =
                      i === active ? 'active' : active < 0 ? 'idle' : dist === 1 ? 'near' : dist === 2 ? 'mid' : 'far'
                    return (
                      <LyricRow
                        key={`${line.t}-${i}`}
                        text={line.text}
                        tSec={toSeconds(line.t)}
                        level={level}
                        sweep={i === active ? sweep : null}
                        softBlur={!smoothMode}
                        onSeek={handleSeek}
                        registerRef={getRefCallback(i)}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            <p
              className={`relative text-center text-caption text-ink2 transition-opacity duration-[var(--dur-slower)] ${idle ? 'opacity-0' : 'opacity-100'}`}
            >
              {song.lyrics.length ? '点击任意歌词行可跳转播放进度' : ''}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      <LyricPoster song={song ?? null} open={posterOpen} onClose={() => setPosterOpen(false)} />
    </>
  )
}
