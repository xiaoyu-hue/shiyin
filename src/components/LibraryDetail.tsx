import { useMemo, useState } from 'react'
import { coverVar } from '../lib/theme'
import { ChevronLeft, ListMusic, Play, X } from 'lucide-react'
import SongRow from './SongRow'
import FastScroller from './FastScroller'
import EmptyState from './common/EmptyState'
import {} from './common/Skeleton'
import { useStore } from '../store'
import { bubbleLabel } from '../lib/fastScroll'
import { groupAlbums, groupArtists, type AlbumGroup, type ArtistGroup, type IndexedSong } from '../lib/library'

export function DetailMissing() {
  const setDetail = useStore((s) => s.setLibraryDetail)
  return (
    <div>
      <button
        onClick={() => setDetail(null)}
        className="mb-4 flex min-h-11 items-center gap-1 text-body text-ink2"
        aria-label="返回音乐库"
      >
        <ChevronLeft size={20} />
        音乐库
      </button>
      <EmptyState icon="🎵" title="内容不存在或已被删除" />
    </div>
  )
}

export function PlaylistDetail({ id, indexed }: { id: string; indexed: IndexedSong[] }) {
  const playlist = useStore((s) => s.playlists.find((p) => p.id === id))
  const setDetail = useStore((s) => s.setLibraryDetail)
  const setPlayerOpen = useStore((s) => s.setPlayerOpen)
  const play = useStore((s) => s.play)
  const renamePlaylist = useStore((s) => s.renamePlaylist)
  const deletePlaylist = useStore((s) => s.deletePlaylist)
  const removeFromPlaylist = useStore((s) => s.removeFromPlaylist)
  const showToast = useStore((s) => s.showToast)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // items 与 context 缓存（审计 A-25），须在早返回之前调用 Hook，故对 playlist 缺失做守卫
  const items = useMemo(() => {
    if (!playlist) return [] as IndexedSong[]
    const byId = new Map(indexed.map(({ index, song }) => [song.id, { index, song }]))
    return playlist.trackIds.map((tid) => byId.get(tid)).filter((x): x is IndexedSong => Boolean(x))
  }, [playlist, indexed])
  const context = useMemo(() => items.map((x) => x.index), [items])

  if (!playlist) return <DetailMissing />
  const first = items[0]?.song

  return (
    <section>
      <button
        onClick={() => setDetail(null)}
        className="mb-4 flex min-h-11 items-center gap-1 text-body text-ink2"
        aria-label="返回音乐库"
      >
        <ChevronLeft size={20} />
        音乐库
      </button>

      <div className="mb-5 flex flex-col items-center text-center">
        <div
          className="cover relative grid h-40 w-40 place-items-center overflow-hidden rounded-[var(--r-card)] text-white shadow-lg"
          style={coverVar(first?.color ?? '#9a8f80')}
        >
          {first?.coverSrc ? (
            <img
              src={first.midCoverSrc ?? first.coverSrc}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
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
            onClick={() => {
              if (items[0]) {
                play(items[0].index, context)
                setPlayerOpen(true)
              }
            }}
            disabled={items.length === 0}
            className="accent-bg flex min-h-11 items-center gap-2 rounded-full px-6 text-body font-semibold text-white shadow-md disabled:opacity-40"
          >
            <Play size={16} fill="white" />
            播放全部
          </button>
          <button
            onClick={() => {
              setDraft(playlist.name)
              setEditing(true)
            }}
            className="min-h-11 rounded-full bg-surface/50 px-5 text-body text-ink2"
          >
            改名
          </button>
          {confirmingDelete ? (
            <button
              onClick={() => {
                deletePlaylist(id)
                setDetail(null)
                showToast('已删除歌单')
              }}
              className="min-h-11 rounded-full bg-danger px-5 text-body font-semibold text-white"
            >
              确认删除
            </button>
          ) : (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="min-h-11 rounded-full bg-surface/50 px-5 text-body text-danger"
            >
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
                  useStore.getState().openPlayerUnlessSelecting()
                }}
              >
                <SongRow index={index} context={context} />
              </div>
              <button
                onClick={() => {
                  removeFromPlaylist(id, song.id)
                  showToast('已从歌单移除')
                }}
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

export function DetailView({ indexed }: { indexed: IndexedSong[] }) {
  const detail = useStore((s) => s.libraryDetail)
  const setDetail = useStore((s) => s.setLibraryDetail)
  const setPlayerOpen = useStore((s) => s.setPlayerOpen)
  const play = useStore((s) => s.play)

  // 分组推导整体缓存（审计 A-25）：items 与 context 跨渲染保持身份，SongRow memo 才有效
  const view = useMemo(() => {
    if (!detail || detail.kind === 'playlist') return null
    if (detail.kind === 'album') {
      const g: AlbumGroup | undefined = groupAlbums(indexed).find((a) => a.name === detail.key)
      if (!g) return 'missing' as const
      return {
        title: g.name,
        subtitle: `${g.artist} · ${g.items.length} 首`,
        items: g.items,
        context: g.items.map((x) => x.index),
        coverSrc: g.coverSrc as string | null | undefined,
        midCoverSrc: g.midCoverSrc as string | null | undefined,
        color: g.color,
      }
    }
    if (detail.kind === 'artist') {
      const g: ArtistGroup | undefined = groupArtists(indexed).find((a) => a.name === detail.key)
      if (!g) return 'missing' as const
      return {
        title: g.name,
        subtitle: `${g.items.length} 首 · ${g.albumCount} 张专辑`,
        items: g.items,
        context: g.items.map((x) => x.index),
        coverSrc: undefined as string | null | undefined,
        midCoverSrc: undefined as string | null | undefined,
        color: '#888888',
      }
    }
    return 'missing' as const
  }, [detail, indexed])

  if (!detail) return null
  if (detail.kind === 'playlist') return <PlaylistDetail id={detail.key} indexed={indexed} />
  if (!view || view === 'missing') return <DetailMissing />
  const { title, subtitle, items, context, coverSrc, midCoverSrc, color } = view

  return (
    <section>
      <button
        onClick={() => setDetail(null)}
        className="mb-4 flex min-h-11 items-center gap-1 text-body text-ink2"
        aria-label="返回音乐库"
      >
        <ChevronLeft size={20} />
        音乐库
      </button>

      <div className="mb-5 flex flex-col items-center text-center">
        {detail.kind === 'album' ? (
          <div
            className="cover relative grid h-40 w-40 place-items-center overflow-hidden rounded-[var(--r-card)] text-white shadow-lg"
            style={coverVar(color)}
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
          onClick={() => {
            if (items[0]) {
              play(items[0].index, context)
              setPlayerOpen(true)
            }
          }}
          className="accent-bg mt-4 flex min-h-11 items-center gap-2 rounded-full px-6 text-body font-semibold text-white shadow-md"
        >
          <Play size={16} fill="white" />
          播放全部
        </button>
      </div>

      <div
        onClick={() => {
          useStore.getState().openPlayerUnlessSelecting()
        }}
      >
        {items.map(({ index }) => (
          <SongRow key={index} index={index} context={context} />
        ))}
      </div>
    </section>
  )
}
