import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Check, ListMusic, ListPlus, Plus, Trash2, X } from 'lucide-react'
import { useStore } from '../store'
import { orderByScope } from '../lib/selection'
import { deleteTracksEverywhere } from '../store/bootstrap'
import { registerBackHandler } from '../platform/backButton'
import { hapticImpact } from '../platform/haptics'
import { springBar } from '../lib/motion'

type BarView = 'bar' | 'playlists' | 'confirmDelete'

/**
 * 多选模式外壳（1.2.0）：顶部计数条（已选数量 / 全选 / 退出）+ 底部玻璃操作条
 *（下一首播放 / 加入歌单 / 删除）。状态本体在 uiSlice，这里只做呈现与动作分发；
 * 批量动作全部走 store 批量动作与既有删除全链路，不另开旁路。
 */
export default function SelectionBar() {
  const selection = useStore((s) => s.selection)
  const scope = useStore((s) => s.selectionScope)
  const tracks = useStore((s) => s.tracks)
  const playlists = useStore((s) => s.playlists)
  const exitSelection = useStore((s) => s.exitSelection)
  const selectAllSelection = useStore((s) => s.selectAllSelection)
  const clearSelection = useStore((s) => s.clearSelection)
  const playNextMany = useStore((s) => s.playNextMany)
  const addManyToPlaylist = useStore((s) => s.addManyToPlaylist)
  const createPlaylist = useStore((s) => s.createPlaylist)
  const showToast = useStore((s) => s.showToast)

  const [view, setView] = useState<BarView>('bar')
  const [newName, setNewName] = useState('')
  const [addedTo, setAddedTo] = useState<string | null>(null)

  const active = selection !== null

  useEffect(() => {
    if (!active) {
      setView('bar')
      setNewName('')
      setAddedTo(null)
    }
  }, [active])

  // 安卓返回登记（1.2.0）：多选开着时返回先退子视图、再退出多选
  useEffect(() => {
    if (!active) return
    return registerBackHandler(() => {
      if (view !== 'bar') {
        setView('bar')
        return true
      }
      exitSelection()
      return true
    })
  }, [active, view, exitSelection])

  if (!active) return null

  const count = selection.length
  const ordered = orderByScope(scope, selection)
  const allSelected = scope.length > 0 && count >= scope.length
  const actionCls =
    'flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-[var(--r-card)] px-2 text-sub font-medium transition-colors active:bg-ink/5 disabled:opacity-35'

  const doPlayNext = () => {
    if (!ordered.length) return
    hapticImpact()
    playNextMany(ordered)
    showToast(`已把 ${ordered.length} 首排到下一首`)
    exitSelection()
  }

  const doAddToPlaylist = (id: string, name: string) => {
    const ids = ordered.map((i) => tracks[i]?.id).filter((v): v is number => typeof v === 'number')
    if (!ids.length) return
    addManyToPlaylist(id, ids)
    setAddedTo(name)
    showToast(`已把 ${ids.length} 首加入「${name}」`)
    window.setTimeout(() => exitSelection(), 650)
  }

  const doDelete = () => {
    const targets = ordered
    exitSelection()
    // 删除完成/失败都要有反馈（审计 A-26）：此前是无声的 fire-and-forget
    void deleteTracksEverywhere(targets).then(
      () => showToast(`已删除 ${targets.length} 首`),
      () => showToast('删除失败，请重试'),
    )
  }

  return (
    <>
      {/* 顶部计数条：盖住当前页标题区，呈现已选数量与全选/退出 */}
      <div
        className="glass-strong absolute inset-x-0 top-0 z-40 flex items-center gap-2 px-3"
        style={{ paddingTop: 'calc(0.5rem + var(--sat))', paddingBottom: '0.5rem' }}
        role="toolbar"
        aria-label="多选模式"
      >
        <button
          onClick={exitSelection}
          aria-label="退出多选"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink2"
        >
          <X size={20} />
        </button>
        <p className="flex-1 text-body font-semibold">已选 {count} 首</p>
        <button
          onClick={() => {
            if (allSelected) clearSelection()
            else selectAllSelection()
          }}
          className="min-h-11 shrink-0 rounded-full px-4 text-body font-medium"
          style={{ color: 'var(--accent)' }}
        >
          {allSelected ? '取消全选' : '全选'}
        </button>
      </div>

      {/* 底部玻璃操作条：盖住迷你条/底栏，多选期间以批量动作为主 */}
      <motion.div
        initial={{ y: '110%' }}
        animate={{ y: 0 }}
        transition={springBar}
        className="glass-strong absolute inset-x-3 bottom-0 z-40 rounded-t-[var(--r-sheet)] p-4"
        style={{ paddingBottom: 'calc(1.25rem + var(--sab))' }}
        role="toolbar"
        aria-label="批量操作"
      >
        {view === 'bar' && (
          <div className="flex gap-2">
            <button className={actionCls} onClick={doPlayNext} disabled={count === 0}>
              <ListPlus size={21} style={{ color: 'var(--accent)' }} />
              下一首播放
            </button>
            <button className={actionCls} onClick={() => setView('playlists')} disabled={count === 0}>
              <ListMusic size={21} style={{ color: 'var(--accent)' }} />
              加入歌单
            </button>
            <button
              className={`${actionCls} text-danger`}
              onClick={() => setView('confirmDelete')}
              disabled={count === 0}
            >
              <Trash2 size={21} />
              删除
            </button>
          </div>
        )}

        {view === 'playlists' && (
          <>
            <p className="px-1 pb-2 text-body font-semibold">把 {count} 首加入哪个歌单？</p>
            {addedTo ? (
              <p className="flex items-center gap-1.5 px-1 py-3 text-body text-ink2">
                <Check size={16} style={{ color: 'var(--accent)' }} />
                已加入「{addedTo}」
              </p>
            ) : (
              <>
                <div className="max-h-56 overflow-y-auto overscroll-contain">
                  {playlists.length === 0 && <p className="px-1 py-2 text-body text-ink2">还没有歌单，先新建一个：</p>}
                  {playlists.map((p) => (
                    <button
                      key={p.id}
                      className="flex min-h-12 w-full items-center gap-3 rounded-[var(--r-card)] px-3 text-left text-body transition-colors active:bg-ink/5"
                      onClick={() => doAddToPlaylist(p.id, p.name)}
                    >
                      <ListMusic size={20} style={{ color: 'var(--accent)' }} />
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      <span className="text-sub text-ink2">{p.trackIds.length} 首</span>
                    </button>
                  ))}
                </div>
                <div className="glass mt-2 flex items-center gap-2 rounded-full p-1.5 pl-4">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="新建歌单的名字"
                    className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-ink3"
                    aria-label="新建歌单的名字"
                  />
                  <button
                    onClick={() => {
                      const p = createPlaylist(newName)
                      if (p) doAddToPlaylist(p.id, p.name)
                    }}
                    className="accent-bg flex min-h-9 shrink-0 items-center gap-1 rounded-full px-4 text-sub font-semibold text-white"
                  >
                    <Plus size={14} />
                    新建并加入
                  </button>
                </div>
              </>
            )}
            <button className="mt-2 min-h-11 w-full text-body text-ink2" onClick={() => setView('bar')}>
              返回
            </button>
          </>
        )}

        {view === 'confirmDelete' && (
          <>
            <p className="px-1 pb-1 text-body font-semibold">删除选中的 {count} 首？</p>
            <p className="px-1 pb-3 text-body leading-relaxed text-ink2">
              会从曲库、收藏、所有歌单和播放队列中一并移除，本地保存的文件记录也会删掉。此操作不能撤销（你手机/电脑里的原文件不受影响）。
            </p>
            <button
              className="mb-2 min-h-12 w-full rounded-full bg-danger text-body font-semibold text-white"
              onClick={doDelete}
            >
              确认删除 {count} 首
            </button>
            <button className="min-h-11 w-full text-body text-ink2" onClick={() => setView('bar')}>
              先不删
            </button>
          </>
        )}
      </motion.div>
    </>
  )
}
