import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { useStore } from '../store'
import { lyricIndex, toSeconds } from '../lib/lyric'
import { sheetTransition } from '../lib/motion'

/**
 * 歌词页（PRD §5.8）：全屏沉浸、逐行高亮、点击跳转、高亮行平滑滚动居中。
 * 本期为行级高亮；阶段二接入逐字歌词后可升级渲染，容器与数据结构已预留。
 */
export default function LyricView() {
  const open = useStore((s) => s.lyricOpen)
  const setOpen = useStore((s) => s.setLyricOpen)
  const cur = useStore((s) => s.cur)
  const pos = useStore((s) => s.pos)
  const seek = useStore((s) => s.seek)
  const tracks = useStore((s) => s.tracks)

  const song = tracks[cur]
  const active = song && song.lyrics.length ? lyricIndex(song, pos) : -1
  const lineRefs = useRef<(HTMLButtonElement | null)[]>([])

  // 高亮行变化时平滑滚动到可视区中部；刚展开时延后一帧等待布局
  useEffect(() => {
    if (!open || active < 0) return
    const id = window.requestAnimationFrame(() => {
      lineRefs.current[active]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return () => window.cancelAnimationFrame(id)
  }, [active, open, cur])

  return (
    <AnimatePresence>
      {open && song && (
        <motion.div
          className="absolute inset-0 z-40 flex flex-col px-6 pt-5 pb-8"
          style={{ background: `linear-gradient(180deg, var(--accent) -10%, var(--bg) 55%, var(--bg-end) 100%)` }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={sheetTransition}
          role="dialog"
          aria-label="歌词"
        >
          <div className="flex items-center justify-between text-white">
            <button onClick={() => setOpen(false)} aria-label="收起歌词" className="p-2">
              <ChevronDown size={26} />
            </button>
            <div className="text-center">
              <p className="text-[11px] opacity-80">歌词</p>
              <p className="max-w-[16rem] truncate text-sm font-semibold">{song.name}</p>
            </div>
            <div className="w-10" />
          </div>

          {song.lyrics.length === 0 ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center">
              <p className="text-sm text-black/40">
                该曲目暂无歌词
                <br />
                <span className="text-xs text-black/30">本地导入的音频暂不解析内嵌歌词</span>
              </p>
            </div>
          ) : (
            <div className="lyric-scroll mt-2 flex-1 overflow-y-auto py-24">
              <div className="flex flex-col gap-5">
                {song.lyrics.map((line, i) => {
                  const isActive = i === active
                  const isPast = i < active
                  return (
                    <button
                      key={`${line.t}-${i}`}
                      ref={(el) => { lineRefs.current[i] = el }}
                      onClick={() => seek(toSeconds(line.t))}
                      aria-current={isActive ? 'true' : undefined}
                      className={`w-full text-left text-lg leading-relaxed transition-all duration-300 ${
                        isActive
                          ? 'scale-[1.04] font-bold'
                          : isPast
                            ? 'font-medium opacity-40'
                            : 'font-medium opacity-55'
                      }`}
                      style={{ color: isActive ? 'var(--accent)' : '#1f1b16' }}
                    >
                      {line.text}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <p className="text-center text-[11px] text-black/40">
            {song.lyrics.length ? '点击任意歌词行可跳转播放进度' : ''}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
