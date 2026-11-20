import { useEffect } from 'react'
import { AnimatePresence, motion, Reorder, useDragControls } from 'motion/react'
import { GripVertical, X } from 'lucide-react'
import { useStore } from '../store'
import { fmtTime } from '../lib/format'
import { springDrawer, scrimTransition } from '../lib/motion'
import { registerBackHandler } from '../platform/backButton'
import EmptyState from './common/EmptyState'

/** 播放队列页：查看/重排/移除待播曲目（拖拽手柄排序） */
export default function QueueView() {
  const queueOpen = useStore((s) => s.queueOpen)
  const setQueueOpen = useStore((s) => s.setQueueOpen)
  const queue = useStore((s) => s.queue)
  const setQueueOrder = useStore((s) => s.setQueueOrder)
  const clearQueue = useStore((s) => s.clearQueue)

  // 安卓返回登记（1.1.0）：队列开着时返回先收队列
  useEffect(() => {
    if (!queueOpen) return
    return registerBackHandler(() => {
      setQueueOpen(false)
      return true
    })
  }, [queueOpen, setQueueOpen])

  return (
    <AnimatePresence>
      {queueOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="播放队列">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={scrimTransition}
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setQueueOpen(false)}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springDrawer}
            className="glass-strong absolute inset-x-0 bottom-0 mx-auto flex max-h-[82vh] w-full max-w-[430px] flex-col rounded-t-[var(--r-sheet)] p-4"
            style={{ paddingBottom: 'calc(1.5rem + var(--sab))' }}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-ink/15" />
            <div className="mb-3 flex items-center gap-2 px-1">
              <h2 className="flex-1 text-heading font-bold">播放队列</h2>
              <span className="text-sub text-ink2">{queue.length} 首</span>
              <button
                onClick={clearQueue}
                disabled={queue.length <= 1}
                className="min-h-9 rounded-full bg-surface/50 px-3 text-sub text-ink2 disabled:opacity-40"
              >
                清空
              </button>
              <button
                onClick={() => setQueueOpen(false)}
                aria-label="关闭队列"
                className="grid h-11 w-11 place-items-center rounded-full text-ink2"
              >
                <X size={20} />
              </button>
            </div>

            {queue.length === 0 ? (
              <EmptyState icon="🎶" title="队列是空的" description="先选一首歌播放，接下来要播的都会排在这里" />
            ) : (
              <Reorder.Group
                axis="y"
                values={queue}
                onReorder={setQueueOrder}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
              >
                {queue.map((trackIndex, pos) => (
                  <QueueItem key={trackIndex} trackIndex={trackIndex} pos={pos} />
                ))}
              </Reorder.Group>
            )}
            <p className="pt-2 text-center text-caption text-ink3">按住右侧手柄拖动可调整顺序</p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function QueueItem({ trackIndex, pos }: { trackIndex: number; pos: number }) {
  const song = useStore((s) => s.tracks[trackIndex])
  const cur = useStore((s) => s.cur)
  const playing = useStore((s) => s.playing)
  const playQueueAt = useStore((s) => s.playQueueAt)
  const removeQueueAt = useStore((s) => s.removeQueueAt)
  const setQueueOpen = useStore((s) => s.setQueueOpen)
  const controls = useDragControls()

  if (!song) return null
  const isCurrent = trackIndex === cur

  return (
    <Reorder.Item
      value={trackIndex}
      dragListener={false}
      dragControls={controls}
      className={`flex items-center gap-3 rounded-[var(--r-card)] px-2 py-2 ${isCurrent ? 'bg-surface/50' : ''}`}
    >
      <div
        className="cover relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[var(--r-cover)] text-white shadow-sm"
        style={{ ['--cover' as string]: song.color }}
        onClick={() => { playQueueAt(pos); setQueueOpen(false) }}
        role="button"
        aria-label={`播放 ${song.name}`}
      >
        {song.coverSrc && <img src={song.thumbSrc ?? song.coverSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        {isCurrent && playing && (
          <span className="pulsing relative grid h-5 w-5 place-items-center rounded-full bg-surface/90">
            <span className="h-2 w-2 rounded-full" style={{ background: 'var(--accent)' }} />
          </span>
        )}
      </div>
      <div
        className="min-w-0 flex-1"
        onClick={() => { playQueueAt(pos); setQueueOpen(false) }}
        role="button"
      >
        <p className={`truncate text-body ${isCurrent ? 'font-semibold' : 'font-medium'}`} style={isCurrent ? { color: 'var(--accent)' } : undefined}>
          {song.name}
        </p>
        <p className="mt-0.5 truncate text-sub text-ink2">
          {isCurrent ? '正在播放 · ' : ''}{song.artist} · {fmtTime(song.dur)}
        </p>
      </div>
      {!isCurrent && (
        <button
          onClick={() => removeQueueAt(pos)}
          aria-label={`从队列移除 ${song.name}`}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink3"
        >
          <X size={17} />
        </button>
      )}
      <button
        onPointerDown={(e) => controls.start(e)}
        aria-label={`拖动调整 ${song.name} 的顺序`}
        className="grid h-11 w-9 shrink-0 cursor-grab touch-none place-items-center rounded-full text-ink3"
      >
        <GripVertical size={18} />
      </button>
    </Reorder.Item>
  )
}
