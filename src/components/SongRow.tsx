import { Play, Heart } from 'lucide-react'
import { useStore } from '../store'
import { fmtTime } from '../lib/format'

interface Props {
  index: number
  rank?: number
}

export default function SongRow({ index, rank }: Props) {
  const tracks = useStore((s) => s.tracks)
  const song = tracks[index]
  const cur = useStore((s) => s.cur)
  const playing = useStore((s) => s.playing)
  const liked = useStore((s) => s.liked)
  const play = useStore((s) => s.play)
  const toggleLike = useStore((s) => s.toggleLike)

  if (!song) return null

  const isCurrent = cur === index
  const isLocal = Boolean(song.audioSrc)

  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors active:bg-black/5"
      onClick={() => play(index)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && play(index)}
    >
      {rank !== undefined && (
        <span className="w-5 shrink-0 text-center text-sm font-semibold" style={{ color: 'var(--accent)' }}>
          {rank}
        </span>
      )}
      <div
        className="cover relative grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white shadow-sm"
        style={{ ['--cover' as string]: song.color }}
      >
        {isCurrent && playing ? (
          <span className="pulsing grid h-6 w-6 place-items-center rounded-full bg-white/90">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--accent)' }} />
          </span>
        ) : (
          <Play size={18} fill="white" className="opacity-90" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`truncate text-sm ${isCurrent ? 'font-semibold' : 'font-medium'}`} style={isCurrent ? { color: 'var(--accent)' } : undefined}>
          {song.name}
        </div>
        <div className="mt-0.5 truncate text-xs text-black/45">{song.artist} · {song.album}</div>
      </div>
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-black/35">
        {isLocal && (
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: 'var(--accent)' }}
            title="本地音频，可真实播放"
          />
        )}
        {fmtTime(song.dur)}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); toggleLike(song.id) }}
        aria-label={liked.has(song.id) ? '取消收藏' : '收藏'}
        className="shrink-0 p-1.5"
      >
        <Heart size={18} fill={liked.has(song.id) ? 'var(--accent)' : 'none'} style={{ color: liked.has(song.id) ? 'var(--accent)' : '#b8b0a4' }} />
      </button>
    </div>
  )
}
