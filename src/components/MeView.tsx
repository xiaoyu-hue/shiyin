import { Heart, History, ListMusic, Check } from 'lucide-react'
import { useStore, themes, songs } from '../store'

export default function MeView() {
  const themeIdx = useStore((s) => s.themeIdx)
  const setTheme = useStore((s) => s.setTheme)
  const liked = useStore((s) => s.liked)

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-6 text-2xl font-bold">我的</h1>

      <div className="mb-7 grid grid-cols-3 gap-3">
        {[
          { icon: Heart, n: liked.size, label: '收藏' },
          { icon: ListMusic, n: 3, label: '歌单' },
          { icon: History, n: 0, label: '最近播放' },
        ].map(({ icon: Icon, n, label }) => (
          <div key={label} className="rounded-2xl bg-white/60 p-4 text-center shadow-sm">
            <Icon size={20} className="mx-auto" style={{ color: 'var(--accent)' }} />
            <p className="mt-2 text-xl font-bold">{n}</p>
            <p className="text-xs text-black/45">{label}</p>
          </div>
        ))}
      </div>

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
      <p className="mt-8 text-center text-[11px] text-black/30">诗音 · 界面原型 v0.1 · {songs.length} 首示例曲目</p>
    </div>
  )
}
