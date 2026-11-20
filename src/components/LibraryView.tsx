import { useMemo, useState } from 'react'
import { DetailView } from './LibraryDetail'
import { coverVar } from '../lib/theme'
import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronRight, ListMusic, Plus } from 'lucide-react'
import SongRow from './SongRow'
import FastScroller from './FastScroller'
import EmptyState from './common/EmptyState'
import { SkeletonRows } from './common/Skeleton'
import { useStore } from '../store'
import { bubbleLabel } from '../lib/fastScroll'
import type { LibraryView as LibraryViewKind } from '../store/types'
import { groupAlbums, groupArtists, indexTracks, sortIndexed, type IndexedSong, type SortKey } from '../lib/library'

const SEGMENTS: { key: LibraryViewKind; label: string }[] = [
  { key: 'songs', label: '歌曲' },
  { key: 'albums', label: '专辑' },
  { key: 'artists', label: '歌手' },
  { key: 'playlists', label: '歌单' },
]

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'addedAt', label: '导入时间' },
  { key: 'name', label: '歌名' },
  { key: 'artist', label: '歌手' },
]

/** 音乐库（0.6.0 替代「发现」）：歌曲 / 专辑 / 歌手 / 歌单 四种浏览方式 */
export default function LibraryView() {
  const tracks = useStore((s) => s.tracks)
  const restored = useStore((s) => s.restored)
  const view = useStore((s) => s.libraryView)
  const setView = useStore((s) => s.setLibraryView)
  const detail = useStore((s) => s.libraryDetail)

  const indexed = indexTracks(tracks)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6">
      <div className="mb-5">
        <p className="text-sub tracking-widest" style={{ color: 'var(--accent)' }}>
          LIBRARY
        </p>
        <h1 className="mt-1 text-title font-bold">音乐库</h1>
      </div>

      {detail ? (
        <DetailView indexed={indexed} />
      ) : (
        <>
          <div className="glass-fake mb-5 flex rounded-full p-1" role="tablist" aria-label="音乐库视图">
            {SEGMENTS.map(({ key, label }) => {
              const active = view === key
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setView(key)}
                  className={`min-h-10 flex-1 rounded-full text-sub transition-colors duration-[var(--dur-ui)] ${
                    active ? 'pill-active font-semibold' : 'text-ink2'
                  }`}
                  style={active ? { color: 'var(--accent)' } : undefined}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {view === 'playlists' ? (
            <PlaylistsSection indexed={indexed} />
          ) : !restored ? (
            <SkeletonRows count={6} />
          ) : tracks.length === 0 ? (
            <EmptyState
              icon="🎵"
              title="音乐库是空的"
              description="先去主页导入本地音乐，这里会按歌曲、专辑、歌手自动整理"
            />
          ) : view === 'songs' ? (
            <SongsSection indexed={indexed} />
          ) : view === 'albums' ? (
            <AlbumsSection indexed={indexed} />
          ) : (
            <ArtistsSection indexed={indexed} />
          )}
        </>
      )}
    </div>
  )
}

function SongsSection({ indexed }: { indexed: IndexedSong[] }) {
  const sortKey = useStore((s) => s.sortKey)
  const sortDir = useStore((s) => s.sortDir)
  const setSort = useStore((s) => s.setSort)
  const sorted = useMemo(() => sortIndexed(indexed, sortKey, sortDir), [indexed, sortKey, sortDir])
  // context 身份稳定化（审计 A-25）：内联新建数组会打穿 SongRow 的 memo
  const context = useMemo(() => sorted.map((x) => x.index), [sorted])

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <div className="flex flex-1 gap-1.5">
          {SORTS.map(({ key, label }) => {
            const active = sortKey === key
            return (
              <button
                key={key}
                onClick={() => setSort(key, sortDir)}
                className={`rounded-full px-3 py-1.5 text-sub transition-colors ${active ? 'text-white' : 'bg-surface/50 text-ink2'}`}
                style={active ? { background: 'var(--accent)' } : undefined}
                aria-pressed={active}
              >
                {label}
              </button>
            )
          })}
        </div>
        <button
          onClick={() => setSort(sortKey, sortDir === 'asc' ? 'desc' : 'asc')}
          className="grid h-9 w-9 place-items-center rounded-full bg-surface/50 text-ink2"
          aria-label={sortDir === 'asc' ? '当前升序，切换为降序' : '当前降序，切换为升序'}
        >
          {sortDir === 'asc' ? <ArrowUpNarrowWide size={16} /> : <ArrowDownWideNarrow size={16} />}
        </button>
      </div>
      <p className="mb-1 text-sub text-ink2">共 {sorted.length} 首</p>
      <div
        className="pr-3"
        onClick={() => {
          // 多选模式下点行只切换选中，不冒泡打开播放页（1.2.0）
          useStore.getState().openPlayerUnlessSelecting()
        }}
      >
        {sorted.map(({ index }) => (
          <SongRow key={index} index={index} context={context} />
        ))}
      </div>
      <FastScroller count={sorted.length} bubbleFor={(i, f) => bubbleLabel(sortKey, sorted[i]?.song.name, f)} />
    </section>
  )
}

function AlbumsSection({ indexed }: { indexed: IndexedSong[] }) {
  const setDetail = useStore((s) => s.setLibraryDetail)
  const albums = groupAlbums(indexed)

  return (
    <section>
      <p className="mb-3 text-sub text-ink2">共 {albums.length} 张专辑</p>
      <div className="grid grid-cols-2 gap-4 desk:grid-cols-3 desk:xl:grid-cols-4">
        {albums.map((a) => (
          <button key={a.name} onClick={() => setDetail({ kind: 'album', key: a.name })} className="text-left">
            <div
              className="cover relative grid aspect-square w-full place-items-center overflow-hidden rounded-[var(--r-cover)] text-white shadow-md"
              style={coverVar(a.color)}
            >
              {a.coverSrc ? (
                <img
                  src={a.midCoverSrc ?? a.coverSrc}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <span className="px-3 text-center text-lg font-bold drop-shadow">{a.name}</span>
              )}
            </div>
            <p className="mt-2 truncate text-body font-semibold">{a.name}</p>
            <p className="truncate text-sub text-ink2">
              {a.artist} · {a.items.length} 首
            </p>
          </button>
        ))}
      </div>
    </section>
  )
}

function ArtistsSection({ indexed }: { indexed: IndexedSong[] }) {
  const setDetail = useStore((s) => s.setLibraryDetail)
  const artists = groupArtists(indexed)

  return (
    <section>
      <p className="mb-2 text-sub text-ink2">共 {artists.length} 位歌手</p>
      {artists.map((a) => (
        <button
          key={a.name}
          onClick={() => setDetail({ kind: 'artist', key: a.name })}
          className="flex w-full items-center gap-3 rounded-[var(--r-card)] px-2 py-2.5 text-left transition-colors [contain-intrinsic-size:auto_68px] [content-visibility:auto] active:bg-ink/5"
        >
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-heading font-bold text-white shadow-sm"
            style={{ background: 'linear-gradient(135deg, var(--accent), rgba(0,0,0,0.25))' }}
          >
            {a.name.slice(0, 1)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body font-medium">{a.name}</span>
            <span className="mt-0.5 block text-sub text-ink2">
              {a.items.length} 首 · {a.albumCount} 张专辑
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-ink3" />
        </button>
      ))}
    </section>
  )
}

function PlaylistsSection({ indexed }: { indexed: IndexedSong[] }) {
  const playlists = useStore((s) => s.playlists)
  const createPlaylist = useStore((s) => s.createPlaylist)
  const setDetail = useStore((s) => s.setLibraryDetail)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  const byId = new Map(indexed.map(({ index, song }) => [song.id, { index, song }]))

  const submit = () => {
    if (!name.trim()) return
    createPlaylist(name)
    setName('')
    setCreating(false)
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sub text-ink2">共 {playlists.length} 个歌单</p>
        <button
          onClick={() => setCreating((v) => !v)}
          className="flex min-h-9 items-center gap-1 rounded-full bg-surface/50 px-3 text-sub font-medium text-ink2"
        >
          <Plus size={14} />
          新建歌单
        </button>
      </div>

      {creating && (
        <div className="glass-fake mb-4 flex items-center gap-2 rounded-full p-1.5 pl-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="给歌单起个名字"
            autoFocus
            className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-ink3"
          />
          <button
            onClick={submit}
            className="accent-bg min-h-9 shrink-0 rounded-full px-4 text-sub font-semibold text-white"
          >
            建好
          </button>
        </div>
      )}

      {playlists.length === 0 && !creating ? (
        <EmptyState icon="🎶" title="还没有歌单" description="把喜欢的歌攒成歌单，点右上角「新建歌单」开始" />
      ) : (
        <div className="flex flex-col gap-1">
          {playlists.map((p) => {
            const first = p.trackIds.map((id) => byId.get(id)?.song).find(Boolean)
            return (
              <button
                key={p.id}
                onClick={() => setDetail({ kind: 'playlist', key: p.id })}
                className="flex w-full items-center gap-3 rounded-[var(--r-card)] px-2 py-2.5 text-left transition-colors [contain-intrinsic-size:auto_68px] [content-visibility:auto] active:bg-ink/5"
              >
                <span
                  className="cover relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[var(--r-cover)] text-white shadow-sm"
                  style={coverVar(first?.color ?? '#9a8f80')}
                >
                  {first?.coverSrc ? (
                    <img
                      src={first.thumbSrc ?? first.coverSrc}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <ListMusic size={20} className="opacity-90" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-medium">{p.name}</span>
                  <span className="mt-0.5 block text-sub text-ink2">{p.trackIds.length} 首</span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-ink3" />
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
