import { Search, X } from 'lucide-react'
import { useStore } from '../store'
import { search } from '../data/query'
import SongRow from './SongRow'
import EmptyState from './common/EmptyState'

export default function SearchView() {
  const query = useStore((s) => s.query)
  const setQuery = useStore((s) => s.setQuery)
  const tracks = useStore((s) => s.tracks)
  const q = query.trim().toLowerCase()
  const hits = search(tracks, query)

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-4 text-title font-bold">搜索</h1>
      <div className="mb-5 flex items-center gap-2 rounded-[var(--r-card)] bg-surface/70 px-4 py-3 shadow-sm">
        <Search size={18} className="text-ink2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索歌名或歌手"
          className="w-full bg-transparent text-body outline-none placeholder:text-ink3"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            aria-label="清空搜索"
            className="-my-2 -mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-full"
          >
            <X size={18} className="text-ink2" />
          </button>
        )}
      </div>

      {tracks.length === 0 ? (
        <EmptyState icon="🎵" title="音乐库是空的" description="先导入本地音乐，再来这里搜索" />
      ) : hits.length === 0 ? (
        <EmptyState title={`没有找到「${query}」相关的歌曲`} />
      ) : (
        <div>
          <p className="mb-1 text-sub text-ink2">{q ? `找到 ${hits.length} 首` : '全部歌曲'}</p>
          {hits.map(({ index }) => <SongRow key={tracks[index].id} index={index} context={hits.map((h) => h.index)} />)}
        </div>
      )}
    </div>
  )
}
