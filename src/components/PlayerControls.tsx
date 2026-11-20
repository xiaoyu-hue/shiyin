import { ListVideo, Pause, Play, SkipBack, SkipForward, type LucideIcon } from 'lucide-react'
import { hapticImpact } from '../platform/haptics'

interface Props {
  playing: boolean
  ModeIcon: LucideIcon
  onCycleMode: () => void
  onPrev: () => void
  onNext: () => void
  onToggle: () => void
  onOpenQueue: () => void
}

/**
 * 播放页主控制排（审计 A-22 从 PlayerView 拆出）：播放模式 / 上一首 /
 * 播放暂停 / 下一首 / 队列。纯呈现 + 回调，状态仍在 PlayerView 与 store。
 */
export default function PlayerControls({
  playing,
  ModeIcon,
  onCycleMode,
  onPrev,
  onNext,
  onToggle,
  onOpenQueue,
}: Props) {
  return (
    <div className="mt-2 flex items-center justify-center gap-6">
      <button onClick={onCycleMode} aria-label="播放模式" className="grid h-11 w-11 place-items-center rounded-full">
        <ModeIcon size={22} style={{ color: 'var(--accent)' }} />
      </button>
      <button
        onClick={() => {
          hapticImpact()
          onPrev()
        }}
        aria-label="上一首"
        className="grid h-11 w-11 place-items-center rounded-full"
      >
        <SkipBack size={28} fill="var(--accent)" style={{ color: 'var(--accent)' }} />
      </button>
      <button
        onClick={() => {
          hapticImpact()
          onToggle()
        }}
        aria-label={playing ? '暂停' : '播放'}
        className="accent-bg grid h-16 w-16 place-items-center rounded-full shadow-lg"
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
          onNext()
        }}
        aria-label="下一首"
        className="grid h-11 w-11 place-items-center rounded-full"
      >
        <SkipForward size={28} fill="var(--accent)" style={{ color: 'var(--accent)' }} />
      </button>
      <button
        onClick={onOpenQueue}
        aria-label="打开播放队列"
        className="grid h-11 w-11 place-items-center rounded-full"
      >
        <ListVideo size={22} style={{ color: 'var(--accent)' }} />
      </button>
    </div>
  )
}
