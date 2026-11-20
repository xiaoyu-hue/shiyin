import { useRef, useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { isAudioFile } from '../lib/localAudio'
import { importTracks } from '../store/importTracks'
import { pickFiles } from '../platform/pickFiles'

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

  /** 导入管线在 store/importTracks（三端共用）；本组件只负责选文件与状态展示 */
  async function handleFiles(all: File[]) {
    if (!all.length) return
    const total = all.filter(isAudioFile).length
    if (total > 0) setStatus({ kind: 'busy', done: 0, total })
    const res = await importTracks(all, (done, t) => setStatus({ kind: 'busy', done, total: t }))
    if (res.kind === 'no-audio') {
      setStatus({
        kind: 'error',
        message: res.lyricOnly
          ? '只选了歌词文件：请连同音频一起选，或在歌曲的「…」菜单里给单首歌导入歌词'
          : '未发现可播放的音频文件（支持 mp3 / m4a / m4b / aac / wav / flac / ogg / oga / opus / weba / webm / aif / aiff）',
      })
      return
    }
    setStatus({ kind: 'done', added: res.added, skipped: res.skipped, lrc: res.lrc })
    window.setTimeout(() => setStatus({ kind: 'idle' }), 4000)
    onDone?.()
  }

  const busy = status.kind === 'busy'

  /** 三端选文件统一走 platform/pickFiles（审计 A-32）；网页端返回 null 时点开隐藏 input */
  async function pick() {
    const files = await pickFiles(0)
    if (files === null) {
      inputRef.current?.click()
      return
    }
    if (files.length) await handleFiles(files)
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void pick()}
        disabled={busy}
        className={
          primary
            ? 'accent-bg flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-body font-semibold text-white shadow-md transition-transform active:scale-[0.98] disabled:opacity-60'
            : 'flex w-full items-center justify-center gap-2 rounded-[var(--r-cover)] border border-dashed py-2.5 text-body font-medium transition-colors disabled:opacity-60'
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
        <p className="mt-2 text-center text-sub" style={{ color: 'var(--accent)' }}>
          已导入 {status.added} 首{status.skipped > 0 ? `，跳过 ${status.skipped} 首（重复或无法读取）` : ''}
          {status.lrc > 0 ? `，配上歌词 ${status.lrc} 首` : ''}
        </p>
      )}
      {status.kind === 'error' && <p className="mt-2 text-center text-sub text-danger">{status.message}</p>}
    </div>
  )
}
