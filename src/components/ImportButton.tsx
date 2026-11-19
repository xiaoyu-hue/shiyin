import { useRef, useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { useStore } from '../store'
import { buildLocalTrack, fileKey, isAudioFile } from '../lib/localAudio'
import { isLyricFileName, pairLyricFiles, readLyricFile } from '../lib/lyricFile'
import type { LyricLine } from '../data/types'
import { attachLyricsToTrack, nextLocalId, persistTrack } from '../store/bootstrap'
import { isNativePlatform } from '../platform/env'
import { pickFilesNative } from '../platform/nativeFiles'

type Status =
  | { kind: 'idle' }
  | { kind: 'busy'; done: number; total: number }
  | { kind: 'done'; added: number; skipped: number; lrc: number }
  | { kind: 'error'; message: string }

interface Props {
  className?: string
  /** 按钮文案（空闲态）；不传用默认「导入本地音乐」 */
  label?: string
  /** 主按钮样式：实心强调色大按钮（首启引导用） */
  primary?: boolean
  /** 一次导入流程处理完文件后回调（首启引导据此落「已引导」标记）；用户取消选文件不会触发 */
  onDone?: () => void
}

export default function ImportButton({ className = '', label, primary = false, onDone }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const addTracks = useStore((s) => s.addTracks)
  const play = useStore((s) => s.play)

  /** 导入管线（网页与原生共用）：入参已统一为 File 数组，后续配对/解析/落盘逻辑不分平台 */
  async function handleFiles(all: File[]) {
    if (!all.length) return
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
    onDone?.()
  }

  const busy = status.kind === 'busy'

  /** 原生环境走系统文件选择器（多选），选完转成 File 数组喂同一条导入管线 */
  async function pickNative() {
    const files = await pickFilesNative(0)
    if (files.length) await handleFiles(files)
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => {
          if (isNativePlatform()) void pickNative()
          else inputRef.current?.click()
        }}
        disabled={busy}
        className={
          primary
            ? 'accent-bg flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-semibold text-white shadow-md transition-transform active:scale-[0.98] disabled:opacity-60'
            : 'flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-sm font-medium transition-colors disabled:opacity-60'
        }
        style={
          primary
            ? undefined
            : { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'rgba(255,255,255,0.45)' }
        }
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
        {busy ? `正在导入 ${status.done}/${status.total}` : (label ?? '导入本地音乐')}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.mp3,.m4a,.wav,.flac,.ogg,.opus,.lrc,.txt"
        multiple
        className="hidden"
        onChange={(e) => {
          void handleFiles(Array.from(e.target.files ?? []))
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
