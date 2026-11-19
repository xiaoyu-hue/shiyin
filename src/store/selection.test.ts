import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from './index'
import type { Song } from '../data/types'

function mkSong(id: number): Song {
  return { id, name: `歌${id}`, artist: '歌手', album: '专辑', dur: 100, color: '#123456', lyrics: [] }
}

describe('多选模式与批量动作（1.2.0，store 集成）', () => {
  beforeEach(() => {
    useStore.setState({
      tracks: [1001, 1002, 1003, 1004, 1005].map(mkSong),
      cur: 0,
      playing: false,
      pos: 0,
      mode: 'list',
      queue: [],
      queuePos: 0,
      liked: new Set<number>(),
      history: [],
      playlists: [],
      selection: null,
      selectionScope: [],
    })
  })

  it('进入多选记录 scope，点按切换、全选、退出', () => {
    const s = useStore.getState()
    s.enterSelection(2, [0, 1, 2, 3, 4])
    expect(useStore.getState().selection).toEqual([2])
    expect(useStore.getState().selectionScope).toEqual([0, 1, 2, 3, 4])
    s.toggleSelected(4)
    s.toggleSelected(2)
    expect(useStore.getState().selection).toEqual([4])
    s.selectAllSelection()
    expect(useStore.getState().selection).toEqual([0, 1, 2, 3, 4])
    s.exitSelection()
    expect(useStore.getState().selection).toBeNull()
    expect(useStore.getState().selectionScope).toEqual([])
  })

  it('不在多选模式时 toggleSelected 无效果', () => {
    useStore.getState().toggleSelected(1)
    expect(useStore.getState().selection).toBeNull()
  })

  it('playNextMany 整批移到当前之后：保持顺序、去重、当前下标修正', () => {
    const s = useStore.getState()
    s.play(0, [0, 1, 2, 3, 4])
    s.playNextMany([4, 2])
    expect(useStore.getState().queue).toEqual([0, 4, 2, 1, 3])
    expect(useStore.getState().queuePos).toBe(0)
    // 已在队列前部的成员再批量下一首：移到当前之后且不重复
    s.playNextMany([3, 1])
    const q = useStore.getState().queue
    expect(q).toEqual([0, 3, 1, 4, 2])
    expect(new Set(q).size).toBe(q.length)
    expect(useStore.getState().cur).toBe(0)
  })

  it('playNextMany 批内含当前曲目时当前留在原位', () => {
    const s = useStore.getState()
    s.play(2, [0, 1, 2, 3, 4])
    s.playNextMany([2, 4, 0])
    const st = useStore.getState()
    // 0 与 4 被摘出后整批排到当前（2）之后：[1, 2, 4, 0, 3]，当前仍在 queuePos 处
    expect(st.queue).toEqual([1, 2, 4, 0, 3])
    expect(st.queue[st.queuePos]).toBe(2)
  })

  it('enqueueMany 整批追加队尾并去重', () => {
    const s = useStore.getState()
    s.play(0, [0, 1, 2])
    s.enqueueMany([4, 3])
    expect(useStore.getState().queue).toEqual([0, 1, 2, 4, 3])
    s.enqueueMany([1, 4])
    expect(useStore.getState().queue).toEqual([0, 2, 3, 1, 4])
  })

  it('addManyToPlaylist 批量加入且不重复', () => {
    const s = useStore.getState()
    s.createPlaylist('批量歌单')
    const pl = useStore.getState().playlists[0]
    s.addToPlaylist(pl.id, 1002)
    s.addManyToPlaylist(pl.id, [1002, 1004, 1001])
    expect(useStore.getState().playlists[0].trackIds).toEqual([1002, 1004, 1001])
  })

  it('removeTracks 批量删除：队列/历史/收藏/歌单连带清理与下标重映射同单删', () => {
    const s = useStore.getState()
    s.createPlaylist('测试歌单')
    const pl = useStore.getState().playlists[0]
    s.addManyToPlaylist(pl.id, [1001, 1003, 1005])
    s.toggleLike(1001)
    s.toggleLike(1004)
    s.play(4, [0, 1, 2, 3, 4])
    useStore.setState({ history: [4, 2, 0] })
    s.enterSelection(0, [0, 1, 2, 3, 4])

    s.removeTracks([0, 2]) // 删除 id1001 与 id1003

    const st = useStore.getState()
    expect(st.tracks.map((t) => t.id)).toEqual([1002, 1004, 1005])
    expect(st.cur).toBe(2) // 原 index4 左移两位
    expect(st.queue).toEqual([0, 1, 2])
    expect(st.queuePos).toBe(2)
    expect(st.history).toEqual([2])
    expect(st.liked.has(1001)).toBe(false)
    expect(st.liked.has(1004)).toBe(true)
    expect(st.playlists[0].trackIds).toEqual([1005])
    // 多选集合同步重映射：原选中 [0] 被删后为空，scope 同步收缩
    expect(st.selection).toEqual([])
    expect(st.selectionScope).toEqual([0, 1, 2])
  })

  it('删歌时多选中未被删的下标正确左移', () => {
    const s = useStore.getState()
    s.enterSelection(3, [0, 1, 2, 3, 4])
    s.toggleSelected(4)
    s.removeTrack(1)
    const st = useStore.getState()
    expect(st.selection).toEqual([2, 3])
    expect(st.selectionScope).toEqual([0, 1, 2, 3])
  })
})
