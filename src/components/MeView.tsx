import { useEffect, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Heart, History, ListMusic, Settings } from 'lucide-react'
import { useStore, themes } from '../store'
import ImportButton from './ImportButton'
import SongRow from './SongRow'
import EmptyState from './common/EmptyState'
import { clearAllMusic, storageUsage } from '../store/bootstrap'

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

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-6 text-2xl font-bold">我的</h1>

      <div className="mb-7 grid grid-cols-3 gap-3">
        <button
          onClick={() => setMePage('favorites')}
          className="rounded-2xl bg-white/60 p-4 text-center shadow-sm transition-transform active:scale-[0.97]"
        >
          <Heart size={20} className="mx-auto" style={{ color: 'var(--accent)' }} />
          <p className="mt-2 text-xl font-bold">{liked.size}</p>
          <p className="text-xs text-black/45">收藏</p>
        </button>
        <button
          onClick={() => setTab('explore')}
          className="rounded-2xl bg-white/60 p-4 text-center shadow-sm transition-transform active:scale-[0.97]"
        >
          <ListMusic size={20} className="mx-auto" style={{ color: 'var(--accent)' }} />
          <p className="mt-2 text-xl font-bold">{localCount}</p>
          <p className="text-xs text-black/45">本地音乐</p>
        </button>
        <button
          onClick={() => setMePage('history')}
          className="rounded-2xl bg-white/60 p-4 text-center shadow-sm transition-transform active:scale-[0.97]"
        >
          <History size={20} className="mx-auto" style={{ color: 'var(--accent)' }} />
          <p className="mt-2 text-xl font-bold">{history.length}</p>
          <p className="text-xs text-black/45">最近播放</p>
        </button>
      </div>

      <section className="mb-7">
        <h2 className="mb-3 text-base font-semibold">本地音乐</h2>
        <p className="mb-3 text-xs text-black/45">
          音频保存在本机浏览器中，不会上传到任何服务器。共 {localCount} 首
        </p>
        <ImportButton />
      </section>

      <button
        onClick={() => setMePage('settings')}
        className="flex w-full items-center gap-3 rounded-2xl bg-white/60 px-4 py-4 text-left shadow-sm transition-transform active:scale-[0.99]"
      >
        <Settings size={20} style={{ color: 'var(--accent)' }} />
        <span className="flex-1">
          <span className="block text-[15px] font-medium">设置</span>
          <span className="mt-0.5 block text-xs text-black/45">主题配色 · 数据管理 · 关于诗音</span>
        </span>
        <ChevronRight size={18} className="text-black/30" />
      </button>

      <p className="mt-8 text-center text-[11px] text-black/30">
        诗音 · 共 {localCount} 首本地音乐
      </p>
    </div>
  )
}

function BackHeader({ title }: { title: string }) {
  const setMePage = useStore((s) => s.setMePage)
  return (
    <div className="mb-4 flex items-center gap-1">
      <button onClick={() => setMePage(null)} className="flex min-h-11 items-center gap-1 text-sm text-black/55" aria-label="返回我的">
        <ChevronLeft size={20} />
        我的
      </button>
      <h1 className="ml-2 text-xl font-bold">{title}</h1>
    </div>
  )
}

function FavoritesPage() {
  const tracks = useStore((s) => s.tracks)
  const liked = useStore((s) => s.liked)
  const setPlayerOpen = useStore((s) => s.setPlayerOpen)
  const indices = tracks.map((t, i) => (liked.has(t.id) ? i : -1)).filter((i) => i >= 0)

  return (
    <div className="px-4 pt-6">
      <BackHeader title="我的收藏" />
      {indices.length === 0 ? (
        <EmptyState icon="💛" title="还没有收藏" description="在歌曲行点爱心，或在播放页收藏喜欢的歌" />
      ) : (
        <>
          <p className="mb-1 text-xs text-black/40">共 {indices.length} 首</p>
          <div onClick={() => setPlayerOpen(true)}>
            {indices.map((i) => <SongRow key={tracks[i].id} index={i} context={indices} />)}
          </div>
        </>
      )}
    </div>
  )
}

function HistoryPage() {
  const tracks = useStore((s) => s.tracks)
  const history = useStore((s) => s.history)
  const setPlayerOpen = useStore((s) => s.setPlayerOpen)
  const indices = history.filter((i) => i >= 0 && i < tracks.length)

  return (
    <div className="px-4 pt-6">
      <BackHeader title="最近播放" />
      {indices.length === 0 ? (
        <EmptyState icon="🕘" title="还没有播放记录" description="听过的歌会按时间排在这里" />
      ) : (
        <>
          <p className="mb-1 text-xs text-black/40">最近 {indices.length} 首</p>
          <div onClick={() => setPlayerOpen(true)}>
            {indices.map((i, rank) => <SongRow key={`${tracks[i].id}-${rank}`} index={i} context={indices} />)}
          </div>
        </>
      )}
    </div>
  )
}

function SettingsPage() {
  const themeIdx = useStore((s) => s.themeIdx)
  const setTheme = useStore((s) => s.setTheme)
  const tracks = useStore((s) => s.tracks)
  const [usage, setUsage] = useState<number | null>(null)
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [cleared, setCleared] = useState(false)

  useEffect(() => {
    let alive = true
    void storageUsage().then((u) => {
      if (alive) setUsage(u)
    })
    return () => {
      alive = false
    }
  }, [tracks.length])

  const usageText =
    usage === null ? '读取中…' : usage < 1024 * 1024 ? `${(usage / 1024).toFixed(0)} KB` : `${(usage / 1024 / 1024).toFixed(1)} MB`

  return (
    <div className="px-4 pt-6">
      <BackHeader title="设置" />

      <section className="mb-7">
        <h2 className="mb-3 text-base font-semibold">主题配色</h2>
        <p className="mb-3 text-xs text-black/45">当前：{themes[themeIdx].name}（共 {themes.length} 套）</p>
        <div className="grid grid-cols-6 gap-2">
          {themes.map((t, i) => {
            const active = i === themeIdx
            return (
              <button key={t.slug} onClick={() => setTheme(i)} className="flex flex-col items-center" aria-pressed={active}>
                <span
                  className="grid h-11 w-11 place-items-center rounded-full shadow-sm transition-transform active:scale-95"
                  style={{
                    background: `linear-gradient(135deg, ${t.bg}, ${t.bgEnd})`,
                    outline: active ? `2px solid ${t.accent}` : '1px solid rgba(0,0,0,0.06)',
                    outlineOffset: 2,
                  }}
                >
                  {active && <Check size={18} style={{ color: t.accent }} />}
                </span>
                <span className={`mt-1.5 w-full truncate text-center text-[11px] ${active ? 'font-semibold text-black/75' : 'text-black/50'}`}>
                  {t.name}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="mb-7">
        <h2 className="mb-3 text-base font-semibold">数据管理</h2>
        <div className="rounded-2xl bg-white/60 p-4 shadow-sm">
          <div className="flex items-center justify-between text-sm">
            <span className="text-black/60">本地音乐占用</span>
            <span className="font-medium">{tracks.length} 首 · {usageText}</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-black/45">
            所有音频与封面只存在这台设备的浏览器里。清除后需要重新导入（你设备里的原文件不受影响）。
          </p>
          {cleared ? (
            <p className="mt-3 text-sm text-black/55">已清除全部本地音乐 ✓</p>
          ) : confirmingClear ? (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  void clearAllMusic().then(() => {
                    setConfirmingClear(false)
                    setCleared(true)
                  })
                }}
                className="min-h-11 flex-1 rounded-full bg-red-500 text-sm font-semibold text-white"
              >
                确认清除 {tracks.length} 首
              </button>
              <button onClick={() => setConfirmingClear(false)} className="min-h-11 flex-1 rounded-full bg-white/60 text-sm text-black/55">
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingClear(true)}
              disabled={tracks.length === 0}
              className="mt-3 min-h-11 w-full rounded-full bg-white/60 text-sm font-medium text-red-500 disabled:opacity-40"
            >
              清除全部本地音乐
            </button>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">关于</h2>
        <div className="rounded-2xl bg-white/60 p-4 text-sm leading-relaxed text-black/60 shadow-sm">
          <p className="font-semibold text-black/80">诗音 Shiyin · v0.6.0</p>
          <p className="mt-1.5">
            一款只播放你自己音乐的本地播放器：没有账号、没有上传、没有推荐流。你的音乐、收藏与歌单都只保存在这台设备上。
          </p>
        </div>
      </section>
    </div>
  )
}
