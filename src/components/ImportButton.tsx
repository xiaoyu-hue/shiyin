import { useRef, useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { useStore } from '../store'
import { buildLocalTrack, fileKey, isAudioFile } from '../lib/localAudio'
import { isLyricFileName, pairLyricFiles, readLyricFile } from '../lib/lyricFile'
import type { LyricLine } from '../data/types'
import { attachLyricsToTrack, nextLocalId, persistTrack } from '../store/bootstrap'

type Status =
  | { kind: 'idle' }
  | { kind: 'busy'; done: number; total: number }
  | { kind: 'done'; added: number; skipped: number; lrc: number }
  | { kind: 'error'; message: string }

interface Props {
  className?: string
}

export default function ImportButton({ className = '' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const addTracks = useStore((s) => s.addTracks)
  const play = useStore((s) => s.play)

  async function handleFiles(list: FileList | null) {
    if (!list || !list.length) return
    const all = Array.from(list)
    const audioFiles = all.filter(isAudioFile)
    const lyricFiles = all.filter((f) => isLyricFileName(f.name))

    if (!audioFiles.length) {
      setStatus({
        kind: 'error',
        message: lyricFiles.length
          ? '只选了歌词文件：请连同音频一起选，或在歌曲的「…」菜单里给单首歌导入歌词'
          : '未发现可播放的音频文件，支持 mp3 / m4a / wav / flac / ogg',
      })
      return
    }

    // 外挂歌词按「与音频同名」配对（行业惯例），解析结果缓存避免重复读
    const pairs = pairLyricFiles(
      audioFiles.map((f) => f.name),
      lyricFiles.map((f) => f.name),
    )
    const lyricCache = new Map<number, LyricLine[]>()
    const getLyrics = async (li: number): Promise<LyricLine[]> => {
      const hit = lyricCache.get(li)
      if (hit) return hit
      const lines = await readLyricFile(lyricFiles[li])
      lyricCache.set(li, lines)
      return lines
    }
    let lrcAttached = 0

    const existing = new Set(
      useStore
        .getState()
        .tracks.map((t) => t.localKey)
        .filter((k): k is string => Boolean(k)),
    )

    setStatus({ kind: 'busy', done: 0, total: audioFiles.length })
    const added = []
    let skipped = 0
    let id = nextLocalId()

    for (let i = 0; i < audioFiles.length; i += 1) {
      const file = audioFiles[i]
      const key = fileKey(file)
      const lyricIdx = pairs.get(i)
      if (existing.has(key)) {
        // 音频是重复导入，但同名歌词仍可补挂到已在库中的那首
        if (lyricIdx !== undefined) {
          const lines = await getLyrics(lyricIdx)
          const at = useStore.getState().tracks.findIndex((t) => t.localKey === key)
          if (lines.length && at >= 0) {
            await attachLyricsToTrack(at, lines)
            lrcAttached += 1
          }
        }
        skipped += 1
        setStatus({ kind: 'busy', done: i + 1, total: audioFiles.length })
        continue
      }
      try {
        const track = await buildLocalTrack(file, id)
        id += 1
        track.localKey = key
        // 同名外挂歌词优先于内嵌歌词（用户显式带来的文件说了算）
        if (lyricIdx !== undefined) {
          const lines = await getLyrics(lyricIdx)
          if (lines.length) {
            track.lyrics = lines
            lrcAttached += 1
          }
        }
        try {
          await persistTrack(file, track, key)
        } catch {
          // 持久化失败不阻断本次导入，仅影响刷新后是否保留
        }
        added.push(track)
      } catch {
        skipped += 1
      }
      setStatus({ kind: 'busy', done: i + 1, total: audioFiles.length })
    }

    if (added.length) {
      addTracks(added)
      play(useStore.getState().tracks.length - added.length)
    }
    setStatus({ kind: 'done', added: added.length, skipped, lrc: lrcAttached })
    window.setTimeout(() => setStatus({ kind: 'idle' }), 4000)
  }

  const busy = status.kind === 'busy'

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
        style={{ borderColor: 'var(--accent)', color: 'var(--accent)', background: 'rgba(255,255,255,0.45)' }}
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
        {busy ? `正在导入 ${status.done}/${status.total}` : '导入本地音乐'}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.mp3,.m4a,.wav,.flac,.ogg,.opus,.lrc,.txt"
        multiple
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {status.kind === 'done' && (
        <p className="mt-2 text-center text-xs" style={{ color: 'var(--accent)' }}>
          已导入 {status.added} 首
          {status.skipped > 0 ? `，跳过 ${status.skipped} 首（重复或无法读取）` : ''}
          {status.lrc > 0 ? `，配上歌词 ${status.lrc} 首` : ''}
        </p>
      )}
      {status.kind === 'error' && (
        <p className="mt-2 text-center text-xs text-red-600">{status.message}</p>
      )}
    </div>
  )
}
