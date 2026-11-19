import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronRight, Heart, ListEnd, ListMusic, ListPlus, Play, Plus, Trash2, X } from 'lucide-react'
import { useStore } from '../store'
import { deleteTrackEverywhere } from '../store/bootstrap'

/** 单曲操作菜单：玻璃底部抽屉（下一首播放 / 加入队列 / 加入歌单 / 收藏 / 删除） */
export default function SongMenu() {
  const menuTrack = useStore((s) => s.menuTrack)
  const setMenuTrack = useStore((s) => s.setMenuTrack)
  const song = useStore((s) => (s.menuTrack !== null ? s.tracks[s.menuTrack] : undefined))
  const liked = useStore((s) => s.liked)
  const playlists = useStore((s) => s.playlists)
  const playNext = useStore((s) => s.playNext)
  const enqueue = useStore((s) => s.enqueue)
  const toggleLike = useStore((s) => s.toggleLike)
  const addToPlaylist = useStore((s) => s.addToPlaylist)
  const createPlaylist = useStore((s) => s.createPlaylist)

  const [view, setView] = useState<'main' | 'playlists' | 'confirmDelete'>('main')
  const [newName, setNewName] = useState('')
  const [addedTo, setAddedTo] = useState<string | null>(null)

  useEffect(() => {
    if (menuTrack !== null) {
      setView('main')
      setNewName('')
      setAddedTo(null)
    }
  }, [menuTrack])

  const close = () => setMenuTrack(null)
  const open = menuTrack !== null && song !== undefined

  const itemCls =
    'flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left text-[15px] transition-colors active:bg-ink/5'

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="歌曲操作菜单">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={close}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="glass-strong absolute inset-x-0 bottom-0 mx-auto w-full max-w-[430px] rounded-t-[var(--r-sheet)] p-4 pb-8"
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-ink/15" />

            {view === 'main' && (
              <>
                <div className="mb-2 flex items-center gap-3 px-1 pb-2">
                  <div
                    className="cover relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl text-white shadow-sm"
                    style={{ ['--cover' as string]: song.color }}
                  >
                    {song.coverSrc ? (
                      <img src={song.coverSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <Play size={18} fill="white" className="opacity-90" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold">{song.name}</p>
                    <p className="truncate text-xs text-ink/45">{song.artist} · {song.album}</p>
                  </div>
                  <button onClick={close} aria-label="关闭菜单" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink/45">
                    <X size={20} />
                  </button>
                </div>

                <button className={itemCls} onClick={() => { playNext(menuTrack); close() }}>
                  <ListPlus size={20} style={{ color: 'var(--accent)' }} />
                  下一首播放
                </button>
                <button className={itemCls} onClick={() => { enqueue(menuTrack); close() }}>
                  <ListEnd size={20} style={{ color: 'var(--accent)' }} />
                  加入播放队列
                </button>
                <button className={itemCls} onClick={() => setView('playlists')}>
                  <ListMusic size={20} style={{ color: 'var(--accent)' }} />
                  加入歌单
                  <ChevronRight size={18} className="ml-auto text-ink/30" />
                </button>
                <button
                  className={itemCls}
                  onClick={() => { toggleLike(song.id); close() }}
                >
                  <Heart
                    size={20}
                    fill={liked.has(song.id) ? 'var(--accent)' : 'none'}
                    style={{ color: liked.has(song.id) ? 'var(--accent)' : 'var(--accent)' }}
                  />
                  {liked.has(song.id) ? '取消收藏' : '收藏'}
                </button>
                <button className={`${itemCls} text-red-500`} onClick={() => setView('confirmDelete')}>
                  <Trash2 size={20} />
                  删除这首歌
                </button>
              </>
            )}

            {view === 'playlists' && (
              <>
                <p className="px-1 pb-2 text-[15px] font-semibold">加入哪个歌单？</p>
                {addedTo ? (
                  <p className="px-1 py-3 text-sm text-ink/55">已加入「{addedTo}」 ✓</p>
                ) : (
                  <>
                    <div className="max-h-56 overflow-y-auto">
                      {playlists.length === 0 && (
                        <p className="px-1 py-2 text-sm text-ink/45">还没有歌单，先新建一个：</p>
                      )}
                      {playlists.map((p) => (
                        <button
                          key={p.id}
                          className={itemCls}
                          onClick={() => {
                            addToPlaylist(p.id, song.id)
                            setAddedTo(p.name)
                            setTimeout(close, 650)
                          }}
                        >
                          <ListMusic size={20} style={{ color: 'var(--accent)' }} />
                          <span className="min-w-0 flex-1 truncate">{p.name}</span>
                          <span className="text-xs text-ink/40">{p.trackIds.length} 首</span>
                        </button>
                      ))}
                    </div>
                    <div className="glass mt-2 flex items-center gap-2 rounded-full p-1.5 pl-4">
                      <input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="新建歌单的名字"
                        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/30"
                        aria-label="新建歌单的名字"
                      />
                      <button
                        onClick={() => {
                          const p = createPlaylist(newName)
                          if (p) {
                            addToPlaylist(p.id, song.id)
                            setAddedTo(p.name)
                            setTimeout(close, 650)
                          }
                        }}
                        className="accent-bg flex min-h-9 shrink-0 items-center gap-1 rounded-full px-4 text-xs font-semibold text-white"
                      >
                        <Plus size={14} />
                        新建并加入
                      </button>
                    </div>
                  </>
                )}
                <button className="mt-2 min-h-11 w-full text-sm text-ink/50" onClick={() => setView('main')}>
                  返回
                </button>
              </>
            )}

            {view === 'confirmDelete' && (
              <>
                <p className="px-1 pb-1 text-[15px] font-semibold">删除《{song.name}》？</p>
                <p className="px-1 pb-3 text-sm leading-relaxed text-ink/55">
                  会从曲库、收藏、所有歌单和播放队列中一并移除，本地保存的文件记录也会删掉。此操作不能撤销（你手机/电脑里的原文件不受影响）。
                </p>
                <button
                  className="mb-2 min-h-12 w-full rounded-full bg-red-500 text-[15px] font-semibold text-white"
                  onClick={() => {
                    void deleteTrackEverywhere(menuTrack)
                    close()
                  }}
                >
                  确认删除
                </button>
                <button className="min-h-11 w-full text-sm text-ink/50" onClick={() => setView('main')}>
                  先不删
                </button>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
