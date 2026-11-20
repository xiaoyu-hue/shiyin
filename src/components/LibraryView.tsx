import { useState } from 'react'
import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronLeft, ChevronRight, ListMusic, Play, Plus, X } from 'lucide-react'
import SongRow from './SongRow'
import FastScroller from './FastScroller'
import EmptyState from './common/EmptyState'
import { SkeletonRows } from './common/Skeleton'
import { useStore } from '../store'
import { bubbleLabel } from '../lib/fastScroll'
import type { LibraryView as LibraryViewKind } from '../store/types'
import {
  groupAlbums,
  groupArtists,
  indexTracks,
  sortIndexed,
  type AlbumGroup,
  type ArtistGroup,
  type IndexedSong,
  type SortKey,
} from '../lib/library'

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
    <div className="px-4 pt-6">
      <div className="mb-5">
        <p className="text-sub tracking-widest" style={{ color: 'var(--accent)' }}>LIBRARY</p>
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
                  className={`min-h-10 flex-1 rounded-full text-sub transition-all duration-300 ${
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
            <EmptyState icon="🎵" title="音乐库是空的" description="先去主页导入本地音乐，这里会按歌曲、专辑、歌手自动整理" />
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
  const setPlayerOpen = useStore((s) => s.setPlayerOpen)
  const sorted = sortIndexed(indexed, sortKey, sortDir)

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
          if (useStore.getState().selection === null) setPlayerOpen(true)
        }}
      >
        {sorted.map(({ index }) => (
          <SongRow key={index} index={index} context={sorted.map((x) => x.index)} />
        ))}
      </div>
      <FastScroller
        count={sorted.length}
        bubbleFor={(i, f) => bubbleLabel(sortKey, sorted[i]?.song.name, f)}
      />
    </section>
  )
}

function AlbumsSection({ indexed }: { indexed: IndexedSong[] }) {
  const setDetail = useStore((s) => s.setLibraryDetail)
  const albums = groupAlbums(indexed)

  return (
    <section>
      <p className="mb-3 text-sub text-ink2">共 {albums.length} 张专辑</p>
      <div className="grid grid-cols-2 gap-4">
        {albums.map((a) => (
          <button key={a.name} onClick={() => setDetail({ kind: 'album', key: a.name })} className="text-left">
            <div
              className="cover relative grid aspect-square w-full place-items-center overflow-hidden rounded-[var(--r-cover)] text-white shadow-md"
              style={{ ['--cover' as string]: a.color }}
            >
              {a.coverSrc ? (
                <img src={a.midCoverSrc ?? a.coverSrc} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <span className="px-3 text-center text-lg font-bold drop-shadow">{a.name}</span>
              )}
            </div>
            <p className="mt-2 truncate text-body font-semibold">{a.name}</p>
            <p className="truncate text-sub text-ink2">{a.artist} · {a.items.length} 首</p>
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
            <span className="mt-0.5 block text-sub text-ink2">{a.items.length} 首 · {a.albumCount} 张专辑</span>
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
          <button onClick={submit} className="accent-bg min-h-9 shrink-0 rounded-full px-4 text-sub font-semibold text-white">
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
                  style={{ ['--cover' as string]: first?.color ?? '#9a8f80' }}
                >
                  {first?.coverSrc ? (
                    <img src={first.thumbSrc ?? first.coverSrc} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
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

function DetailView({ indexed }: { indexed: IndexedSong[] }) {
  const detail = useStore((s) => s.libraryDetail)
  const setDetail = useStore((s) => s.setLibraryDetail)
  const setPlayerOpen = useStore((s) => s.setPlayerOpen)
  const play = useStore((s) => s.play)

  if (!detail) return null
  if (detail.kind === 'playlist') return <PlaylistDetail id={detail.key} indexed={indexed} />

  let title = ''
  let subtitle = ''
  let items: IndexedSong[] = []
  let coverSrc: string | null | undefined
  let midCoverSrc: string | null | undefined
  let color = '#888888'

  if (detail.kind === 'album') {
    const g: AlbumGroup | undefined = groupAlbums(indexed).find((a) => a.name === detail.key)
    if (!g) return <DetailMissing />
    title = g.name
    subtitle = `${g.artist} · ${g.items.length} 首`
    items = g.items
    coverSrc = g.coverSrc
    midCoverSrc = g.midCoverSrc
    color = g.color
  } else if (detail.kind === 'artist') {
    const g: ArtistGroup | undefined = groupArtists(indexed).find((a) => a.name === detail.key)
    if (!g) return <DetailMissing />
    title = g.name
    subtitle = `${g.items.length} 首 · ${g.albumCount} 张专辑`
    items = g.items
  } else {
    return <DetailMissing />
  }

  return (
    <section>
      <button onClick={() => setDetail(null)} className="mb-4 flex min-h-11 items-center gap-1 text-body text-ink2" aria-label="返回音乐库">
        <ChevronLeft size={20} />
        音乐库
      </button>

      <div className="mb-5 flex flex-col items-center text-center">
        {detail.kind === 'album' ? (
          <div
            className="cover relative grid h-40 w-40 place-items-center overflow-hidden rounded-[var(--r-card)] text-white shadow-lg"
            style={{ ['--cover' as string]: color }}
          >
            {coverSrc ? (
              <img src={midCoverSrc ?? coverSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <span className="px-3 text-xl font-bold drop-shadow">{title}</span>
            )}
          </div>
        ) : (
          <span
            className="grid h-24 w-24 place-items-center rounded-full text-3xl font-bold text-white shadow-lg"
            style={{ background: 'linear-gradient(135deg, var(--accent), rgba(0,0,0,0.25))' }}
          >
            {title.slice(0, 1)}
          </span>
        )}
        <h2 className="mt-3 max-w-full truncate text-xl font-bold">{title}</h2>
        <p className="mt-1 text-sub text-ink2">{subtitle}</p>
        <button
          onClick={() => { if (items[0]) { play(items[0].index, items.map((x) => x.index)); setPlayerOpen(true) } }}
          className="accent-bg mt-4 flex min-h-11 items-center gap-2 rounded-full px-6 text-body font-semibold text-white shadow-md"
        >
          <Play size={16} fill="white" />
          播放全部
        </button>
      </div>

      <div
        onClick={() => {
          if (useStore.getState().selection === null) setPlayerOpen(true)
        }}
      >
        {items.map(({ index }) => (
          <SongRow key={index} index={index} context={items.map((x) => x.index)} />
        ))}
      </div>
    </section>
  )
}

function PlaylistDetail({ id, indexed }: { id: string; indexed: IndexedSong[] }) {
  const playlist = useStore((s) => s.playlists.find((p) => p.id === id))
  const setDetail = useStore((s) => s.setLibraryDetail)
  const setPlayerOpen = useStore((s) => s.setPlayerOpen)
  const play = useStore((s) => s.play)
  const renamePlaylist = useStore((s) => s.renamePlaylist)
  const deletePlaylist = useStore((s) => s.deletePlaylist)
  const removeFromPlaylist = useStore((s) => s.removeFromPlaylist)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  if (!playlist) return <DetailMissing />

  const byId = new Map(indexed.map(({ index, song }) => [song.id, { index, song }]))
  const items = playlist.trackIds.map((tid) => byId.get(tid)).filter((x): x is IndexedSong => Boolean(x))
  const first = items[0]?.song

  return (
    <section>
      <button onClick={() => setDetail(null)} className="mb-4 flex min-h-11 items-center gap-1 text-body text-ink2" aria-label="返回音乐库">
        <ChevronLeft size={20} />
        音乐库
      </button>

      <div className="mb-5 flex flex-col items-center text-center">
        <div
          className="cover relative grid h-40 w-40 place-items-center overflow-hidden rounded-[var(--r-card)] text-white shadow-lg"
          style={{ ['--cover' as string]: first?.color ?? '#9a8f80' }}
        >
          {first?.coverSrc ? (
            <img src={first.midCoverSrc ?? first.coverSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <ListMusic size={44} className="opacity-90" />
          )}
        </div>

        {editing ? (
          <div className="glass mt-3 flex items-center gap-2 rounded-full p-1.5 pl-4">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && draft.trim()) {
                  renamePlaylist(id, draft)
                  setEditing(false)
                }
              }}
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-body outline-none"
              aria-label="歌单名称"
            />
            <button
              onClick={() => {
                if (draft.trim()) renamePlaylist(id, draft)
                setEditing(false)
              }}
              className="accent-bg min-h-9 shrink-0 rounded-full px-4 text-sub font-semibold text-white"
            >
              保存
            </button>
          </div>
        ) : (
          <h2 className="mt-3 max-w-full truncate text-xl font-bold">{playlist.name}</h2>
        )}
        <p className="mt-1 text-sub text-ink2">{items.length} 首</p>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => { if (items[0]) { play(items[0].index, items.map((x) => x.index)); setPlayerOpen(true) } }}
            disabled={items.length === 0}
            className="accent-bg flex min-h-11 items-center gap-2 rounded-full px-6 text-body font-semibold text-white shadow-md disabled:opacity-40"
          >
            <Play size={16} fill="white" />
            播放全部
          </button>
          <button
            onClick={() => { setDraft(playlist.name); setEditing(true) }}
            className="min-h-11 rounded-full bg-surface/50 px-5 text-body text-ink2"
          >
            改名
          </button>
          {confirmingDelete ? (
            <button
              onClick={() => { deletePlaylist(id); setDetail(null) }}
              className="min-h-11 rounded-full bg-danger px-5 text-body font-semibold text-white"
            >
              确认删除
            </button>
          ) : (
            <button onClick={() => setConfirmingDelete(true)} className="min-h-11 rounded-full bg-surface/50 px-5 text-body text-danger">
              删除歌单
            </button>
          )}
        </div>
        <p className="mt-2 text-caption text-ink3">加歌：点任意歌曲行尾的「…」，选「加入歌单」</p>
      </div>

      {items.length === 0 ? (
        <EmptyState icon="🎶" title="这个歌单还是空的" />
      ) : (
        <div className="pr-3">
          {items.map(({ index, song }) => (
            <div key={song.id} className="flex items-center">
              <div
                className="min-w-0 flex-1"
                onClick={() => {
                  if (useStore.getState().selection === null) setPlayerOpen(true)
                }}
              >
                <SongRow index={index} context={items.map((x) => x.index)} />
              </div>
              <button
                onClick={() => removeFromPlaylist(id, song.id)}
                aria-label={`从歌单移除 ${song.name}`}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink3"
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
      {/* 歌单内顺序不是标题序：气泡只报百分比，不拿字母糊弄（1.2.0） */}
      <FastScroller count={items.length} bubbleFor={(_i, f) => bubbleLabel(null, undefined, f)} />
    </section>
  )
}

function DetailMissing() {
  const setDetail = useStore((s) => s.setLibraryDetail)
  return (
    <div>
      <button onClick={() => setDetail(null)} className="mb-4 flex min-h-11 items-center gap-1 text-body text-ink2" aria-label="返回音乐库">
        <ChevronLeft size={20} />
        音乐库
      </button>
      <EmptyState icon="🎵" title="内容不存在或已被删除" />
    </div>
  )
}
