import { describe, it, expect } from 'vitest'
import { search, byIndex } from './query'
import type { Song } from './types'

/** 测试专用曲目夹具（应用本身不再内置任何示例曲目） */
const songs: Song[] = [
  { id: 1, name: '晚风遇见海', artist: '陈默', album: '晚风合集', dur: 213, color: '#365FA3', lyrics: [] },
  { id: 2, name: '星轨', artist: '陈默', album: '夜空观察', dur: 219, color: '#7C4DA1', lyrics: [] },
  { id: 3, name: '晴天', artist: '周杰伦', album: '叶惠美', dur: 269, color: '#B83D5A', lyrics: [] },
]

describe('search 搜索过滤', () => {
  it('空词返回全部', () => {
    expect(search(songs, '').length).toBe(songs.length)
    expect(search(songs, '   ').length).toBe(songs.length)
  })
  it('按歌名命中', () => {
    const r = search(songs, '星轨')
    expect(r.length).toBe(1)
    expect(r[0].song.name).toBe('星轨')
  })
  it('按歌手命中', () => {
    const r = search(songs, '陈默')
    expect(r.length).toBe(2)
  })
  it('大小写不敏感', () => {
    expect(search(songs, 'SHIYIN').length).toBe(0)
  })
  it('无命中返回空数组', () => expect(search(songs, '不存在').length).toBe(0))
})

describe('byIndex 按索引取曲目', () => {
  it('取到曲目', () => expect(byIndex(songs, 0)?.name).toBe('晚风遇见海'))
  it('越界返回 undefined', () => {
    expect(byIndex(songs, -1)).toBeUndefined()
    expect(byIndex(songs, 999)).toBeUndefined()
  })
})
