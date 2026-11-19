import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from './index'
import type { Song } from '../data/types'

function mkSong(id: number): Song {
  return { id, name: `歌${id}`, artist: '歌手', album: '专辑', dur: 100, color: '#123456', lyrics: [] }
}

describe('睡眠定时（store 集成）', () => {
  beforeEach(() => {
    useStore.setState({
      tracks: [1001, 1002].map(mkSong),
      cur: 0,
      playing: false,
      pos: 0,
      mode: 'list',
      queue: [0, 1],
      queuePos: 0,
      sleepEndsAt: null,
      sleepAfterTrack: false,
    })
  })

  it('分钟定时与「播完这首」互斥', () => {
    const s = useStore.getState()
    s.setSleepMinutes(30)
    expect(useStore.getState().sleepEndsAt).not.toBeNull()
    expect(useStore.getState().sleepAfterTrack).toBe(false)
    s.setSleepAfterTrack(true)
    expect(useStore.getState().sleepAfterTrack).toBe(true)
    expect(useStore.getState().sleepEndsAt).toBeNull()
    s.setSleepMinutes(15)
    expect(useStore.getState().sleepAfterTrack).toBe(false)
    s.clearSleep()
    expect(useStore.getState().sleepEndsAt).toBeNull()
    expect(useStore.getState().sleepAfterTrack).toBe(false)
  })

  it('「播完这首」：handleTrackEnd 停播不切歌并清除定时（优先于单曲循环）', () => {
    const s = useStore.getState()
    s.play(0)
    useStore.setState({ mode: 'repeat' })
    s.setSleepAfterTrack(true)
    s.handleTrackEnd()
    const st = useStore.getState()
    expect(st.playing).toBe(false)
    expect(st.cur).toBe(0)
    expect(st.sleepAfterTrack).toBe(false)
  })

  it('无定时设置时 handleTrackEnd 正常按队列切歌', () => {
    const s = useStore.getState()
    s.play(0)
    s.handleTrackEnd()
    expect(useStore.getState().cur).toBe(1)
    expect(useStore.getState().playing).toBe(true)
  })
})
