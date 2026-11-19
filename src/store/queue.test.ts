import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from './index'
import type { Song } from '../data/types'

function mkSong(id: number): Song {
  return { id, name: `歌${id}`, artist: '歌手', album: '专辑', dur: 100, color: '#123456', lyrics: [] }
}

describe('播放队列与删歌连带清理（store 集成）', () => {
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
    })
  })

  it('带 context 播放按列表顺序建队列，next 沿队列走', () => {
    const s = useStore.getState()
    s.play(2, [2, 0, 4])
    expect(useStore.getState().queue).toEqual([2, 0, 4])
    s.next()
    expect(useStore.getState().cur).toBe(0)
    s.next()
    expect(useStore.getState().cur).toBe(4)
    s.next() // 环形回到队首
    expect(useStore.getState().cur).toBe(2)
    s.prev()
    expect(useStore.getState().cur).toBe(4)
  })

  it('playNext 把歌排到当前之后，enqueue 追加队尾', () => {
    const s = useStore.getState()
    s.play(0, [0, 1, 2, 3, 4])
    s.playNext(4)
    expect(useStore.getState().queue).toEqual([0, 4, 1, 2, 3])
    s.enqueue(2)
    expect(useStore.getState().queue).toEqual([0, 4, 1, 3, 2])
    s.next()
    expect(useStore.getState().cur).toBe(4)
  })

  it('removeQueueAt 不能移除正在播的一项；clearQueue 只留当前', () => {
    const s = useStore.getState()
    s.play(1, [0, 1, 2, 3])
    s.removeQueueAt(1) // 当前位置，无效
    expect(useStore.getState().queue).toEqual([0, 1, 2, 3])
    s.removeQueueAt(3)
    expect(useStore.getState().queue).toEqual([0, 1, 2])
    s.clearQueue()
    expect(useStore.getState().queue).toEqual([1])
    expect(useStore.getState().queuePos).toBe(0)
  })

  it('playQueueAt 跳播并记历史', () => {
    const s = useStore.getState()
    s.play(0, [0, 1, 2])
    s.playQueueAt(2)
    expect(useStore.getState().cur).toBe(2)
    expect(useStore.getState().history[0]).toBe(2)
  })

  it('删歌连带清理：队列/历史重映射、收藏/歌单按 id 剔除、当前下标修正', () => {
    const s = useStore.getState()
    s.createPlaylist('测试歌单')
    const pl = useStore.getState().playlists[0]
    s.addToPlaylist(pl.id, 1002)
    s.addToPlaylist(pl.id, 1004)
    s.toggleLike(1002)
    s.toggleLike(1003)
    s.play(3, [0, 1, 2, 3, 4]) // 当前 index3（id1004），历史 [3]
    useStore.setState({ history: [3, 1, 0] })

    s.removeTrack(1) // 删除 index1（id1002）

    const st = useStore.getState()
    expect(st.tracks.map((t) => t.id)).toEqual([1001, 1003, 1004, 1005])
    expect(st.cur).toBe(2) // 原 index3 左移
    expect(st.queue).toEqual([0, 1, 2, 3])
    expect(st.queuePos).toBe(2)
    expect(st.history).toEqual([2, 0])
    expect(st.liked.has(1002)).toBe(false)
    expect(st.liked.has(1003)).toBe(true)
    expect(st.playlists[0].trackIds).toEqual([1004])
  })

  it('删掉正在播的歌会停播并钳制当前下标', () => {
    const s = useStore.getState()
    s.play(4, [0, 1, 2, 3, 4])
    expect(useStore.getState().playing).toBe(true)
    s.removeTrack(4)
    const st = useStore.getState()
    expect(st.playing).toBe(false)
    expect(st.cur).toBe(3)
    expect(st.tracks).toHaveLength(4)
  })
})
