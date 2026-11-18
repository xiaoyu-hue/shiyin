import { describe, it, expect } from 'vitest'
import { search, byIndex } from './query'
import { songs } from './sample'

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
