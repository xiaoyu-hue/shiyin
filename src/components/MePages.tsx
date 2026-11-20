import { ChevronLeft } from 'lucide-react'
import { useStore } from '../store'
import { OPEN_SOURCE_ENTRIES, PROJECT_CODE_LICENSE, PROJECT_COPYRIGHT, PROJECT_DOCS_LICENSE } from '../data/openSource'
import SongRow from './SongRow'
import EmptyState from './common/EmptyState'

export function BackHeader({ title }: { title: string }) {
  const setMePage = useStore((s) => s.setMePage)
  return (
    <div className="mb-4 flex items-center gap-1">
      <button
        onClick={() => setMePage(null)}
        className="flex min-h-11 items-center gap-1 text-body text-ink2"
        aria-label="返回我的"
      >
        <ChevronLeft size={20} />
        我的
      </button>
      <h1 className="ml-2 text-xl font-bold">{title}</h1>
    </div>
  )
}

export function FavoritesPage() {
  const tracks = useStore((s) => s.tracks)
  const liked = useStore((s) => s.liked)
  const indices = tracks.map((t, i) => (liked.has(t.id) ? i : -1)).filter((i) => i >= 0)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6">
      <BackHeader title="我的收藏" />
      {indices.length === 0 ? (
        <EmptyState icon="💛" title="还没有收藏" description="在歌曲行点爱心，或在播放页收藏喜欢的歌" />
      ) : (
        <>
          <p className="mb-1 text-sub text-ink2">共 {indices.length} 首</p>
          <div
            onClick={() => {
              useStore.getState().openPlayerUnlessSelecting()
            }}
          >
            {indices.map((i) => (
              <SongRow key={tracks[i].id} index={i} context={indices} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function HistoryPage() {
  const tracks = useStore((s) => s.tracks)
  const history = useStore((s) => s.history)
  const indices = history.filter((i) => i >= 0 && i < tracks.length)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6">
      <BackHeader title="最近播放" />
      {indices.length === 0 ? (
        <EmptyState icon="🕘" title="还没有播放记录" description="听过的歌会按时间排在这里" />
      ) : (
        <>
          <p className="mb-1 text-sub text-ink2">最近 {indices.length} 首</p>
          <div
            onClick={() => {
              useStore.getState().openPlayerUnlessSelecting()
            }}
          >
            {indices.map((i, rank) => (
              <SongRow key={`${tracks[i].id}-${rank}`} index={i} context={indices} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function LicensesPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6">
      <BackHeader title="开源许可与致谢" />

      <section className="mb-7">
        <h2 className="mb-3 text-heading font-semibold">本项目许可证</h2>
        <div className="rounded-[var(--r-card)] bg-surface/60 p-4 text-body leading-relaxed text-ink2 shadow-sm">
          <p>
            <span className="font-medium text-ink2">源代码</span> · {PROJECT_CODE_LICENSE.name}（
            {PROJECT_CODE_LICENSE.short}）
          </p>
          <p className="mt-1 text-sub leading-relaxed text-ink2">{PROJECT_CODE_LICENSE.summary}</p>
          <p className="mt-3">
            <span className="font-medium text-ink2">项目文档</span> · {PROJECT_DOCS_LICENSE.name}（
            {PROJECT_DOCS_LICENSE.short}）
          </p>
          <p className="mt-1 text-sub leading-relaxed text-ink2">{PROJECT_DOCS_LICENSE.summary}</p>
          <p className="mt-3 text-sub text-ink2">{PROJECT_COPYRIGHT}</p>
        </div>
      </section>

      <section className="mb-7">
        <h2 className="mb-3 text-heading font-semibold">第三方开源组件</h2>
        <p className="mb-3 text-sub leading-relaxed text-ink2">
          诗音基于以下开源组件构建，各组件保持其各自的原始许可证：
        </p>
        <div className="overflow-hidden rounded-[var(--r-card)] bg-surface/60 shadow-sm">
          {OPEN_SOURCE_ENTRIES.map((e, i) => (
            <div key={e.name} className={`px-4 py-3 ${i > 0 ? 'border-t border-ink/5' : ''}`}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 break-all text-body font-medium text-ink2">{e.name}</p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-caption font-semibold ${
                    e.keepOriginal ? 'bg-amber-500/15 text-amber-600' : 'bg-ink/5 text-ink2'
                  }`}
                >
                  {e.license}
                </span>
              </div>
              <p className="mt-0.5 text-sub leading-relaxed text-ink2">
                {e.purpose}
                {e.keepOriginal && ' · 该组件保持其原始许可证 MPL-2.0，不随本项目许可证变更'}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sub leading-relaxed text-ink2">
          这里只列主要组件。完整清单（含全部传递依赖与版本）见项目仓库根目录的 THIRD-PARTY-LICENSES.md。
        </p>
      </section>
    </div>
  )
}
