import { ChevronRight, Heart, History, ListMusic, Settings } from 'lucide-react'
import { useStore } from '../store'
import ImportButton from './ImportButton'
import { FavoritesPage, HistoryPage, LicensesPage } from './MePages'
import { SettingsPage } from './MeSettings'

export default function MeView() {
  const mePage = useStore((s) => s.mePage)
  const setMePage = useStore((s) => s.setMePage)
  const setTab = useStore((s) => s.setTab)
  const liked = useStore((s) => s.liked)
  const tracks = useStore((s) => s.tracks)
  const history = useStore((s) => s.history)
  const localCount = tracks.length

  if (mePage === 'favorites') return <FavoritesPage />
  if (mePage === 'history') return <HistoryPage />
  if (mePage === 'settings') return <SettingsPage />
  if (mePage === 'licenses') return <LicensesPage />

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6">
      <h1 className="mb-6 text-title font-bold">我的</h1>

      <div className="mb-7 grid grid-cols-3 gap-3">
        <button
          onClick={() => setMePage('favorites')}
          className="rounded-[var(--r-card)] bg-surface/60 p-4 text-center shadow-sm transition-transform active:scale-[0.97]"
        >
          <Heart size={20} className="mx-auto" style={{ color: 'var(--accent)' }} />
          <p className="mt-2 text-xl font-bold">{liked.size}</p>
          <p className="text-sub text-ink2">收藏</p>
        </button>
        <button
          onClick={() => setTab('explore')}
          className="rounded-[var(--r-card)] bg-surface/60 p-4 text-center shadow-sm transition-transform active:scale-[0.97]"
        >
          <ListMusic size={20} className="mx-auto" style={{ color: 'var(--accent)' }} />
          <p className="mt-2 text-xl font-bold">{localCount}</p>
          <p className="text-sub text-ink2">本地音乐</p>
        </button>
        <button
          onClick={() => setMePage('history')}
          className="rounded-[var(--r-card)] bg-surface/60 p-4 text-center shadow-sm transition-transform active:scale-[0.97]"
        >
          <History size={20} className="mx-auto" style={{ color: 'var(--accent)' }} />
          <p className="mt-2 text-xl font-bold">{history.length}</p>
          <p className="text-sub text-ink2">最近播放</p>
        </button>
      </div>

      {/* 桌面双列（1.4.0 包 3）：导入区与设置入口并排，窄屏纵向不变；
          1.4.1 起由 desk: 平台门控，网页/安卓宽视口下不触发 */}
      <div className="desk:grid desk:grid-cols-2 desk:items-start desk:gap-4">
        <section className="mb-7 desk:mb-0">
          <h2 className="mb-3 text-heading font-semibold">本地音乐</h2>
          <p className="mb-3 text-sub text-ink2">音频保存在本机浏览器中，不会上传到任何服务器。共 {localCount} 首</p>
          <ImportButton />
        </section>

        <button
          onClick={() => setMePage('settings')}
          className="flex w-full items-center gap-3 rounded-[var(--r-card)] bg-surface/60 px-4 py-4 text-left shadow-sm transition-transform active:scale-[0.99]"
        >
          <Settings size={20} style={{ color: 'var(--accent)' }} />
          <span className="flex-1">
            <span className="block text-body font-medium">设置</span>
            <span className="mt-0.5 block text-sub text-ink2">主题配色 · 数据管理 · 关于诗音</span>
          </span>
          <ChevronRight size={18} className="text-ink3" />
        </button>
      </div>

      <p className="mt-8 text-center text-caption text-ink3">诗音 · 共 {localCount} 首本地音乐</p>
    </div>
  )
}

/** 桌面版专属设置区（仅 Tauri 环境渲染）：开机自启 + 应用更新 */
