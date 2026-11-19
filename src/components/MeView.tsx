import { Heart, History, ListMusic, Check } from 'lucide-react'
import { useStore, themes } from '../store'
import ImportButton from './ImportButton'

export default function MeView() {
  const themeIdx = useStore((s) => s.themeIdx)
  const setTheme = useStore((s) => s.setTheme)
  const liked = useStore((s) => s.liked)
  const tracks = useStore((s) => s.tracks)
  const history = useStore((s) => s.history)
  const localCount = tracks.length

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-6 text-2xl font-bold">我的</h1>

      <div className="mb-7 grid grid-cols-3 gap-3">
        {[
          { icon: Heart, n: liked.size, label: '收藏' },
          { icon: ListMusic, n: localCount, label: '本地音乐' },
          { icon: History, n: history.length, label: '最近播放' },
        ].map(({ icon: Icon, n, label }) => (
          <div key={label} className="rounded-2xl bg-white/60 p-4 text-center shadow-sm">
            <Icon size={20} className="mx-auto" style={{ color: 'var(--accent)' }} />
            <p className="mt-2 text-xl font-bold">{n}</p>
            <p className="text-xs text-black/45">{label}</p>
          </div>
        ))}
      </div>

      <section className="mb-7">
        <h2 className="mb-3 text-base font-semibold">本地音乐</h2>
        <p className="mb-3 text-xs text-black/45">
          音频保存在本机浏览器中，不会上传到任何服务器。共 {localCount} 首
        </p>
        <ImportButton />
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">主题配色</h2>
        <p className="mb-3 text-xs text-black/45">当前：{themes[themeIdx].name}（共 {themes.length} 套）</p>
        <div className="grid grid-cols-3 gap-3">
          {themes.map((t, i) => (
            <button key={t.slug} onClick={() => setTheme(i)} className="text-left">
              <div
                className="grid aspect-square place-items-center rounded-2xl shadow-sm"
                style={{ background: `linear-gradient(135deg, ${t.bg}, ${t.bgEnd})`, outline: i === themeIdx ? `2px solid ${t.accent}` : 'none', outlineOffset: 2 }}
              >
                {i === themeIdx && <Check size={22} style={{ color: t.accent }} />}
                <span className="sr-only">{t.name}</span>
              </div>
              <p className="mt-1.5 truncate text-center text-xs text-black/55">{t.name}</p>
            </button>
          ))}
        </div>
      </section>
      <p className="mt-8 text-center text-[11px] text-black/30">
        诗音 · 共 {localCount} 首本地音乐
      </p>
    </div>
  )
}
