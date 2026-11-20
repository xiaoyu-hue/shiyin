import { describe, expect, it } from 'vitest'
import { groupAlbums, groupArtists, indexTracks, sortIndexed } from './library'
import type { Song } from '../data/types'

function mk(id: number, name: string, artist: string, album: string, addedAt = 0): Song {
  return { id, name, artist, album, dur: 100, color: '#000000', lyrics: [], addedAt }
}

const tracks: Song[] = [
  mk(1, '晚风', '陈默', '海边', 300),
  mk(2, '星轨', '陈默', '夜空', 100),
  mk(3, '测试之歌', '测试歌手', '测试专辑', 200),
  mk(4, '海阔天空', 'Beyond', '海边', 400),
]

describe('indexTracks', () => {
  it('保留全局下标', () => {
    expect(indexTracks(tracks).map((x) => x.index)).toEqual([0, 1, 2, 3])
  })
})

describe('sortIndexed 排序', () => {
  const list = indexTracks(tracks)

  it('按导入时间升序/降序', () => {
    expect(sortIndexed(list, 'addedAt', 'asc').map((x) => x.song.id)).toEqual([2, 3, 1, 4])
    expect(sortIndexed(list, 'addedAt', 'desc').map((x) => x.song.id)).toEqual([4, 1, 3, 2])
  })

  it('按歌名排序（中文 Collator）', () => {
    const names = sortIndexed(list, 'name', 'asc').map((x) => x.song.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN')))
  })

  it('按歌手排序同歌手按歌名', () => {
    const r = sortIndexed(list, 'artist', 'asc')
    const chen = r.filter((x) => x.song.artist === '陈默').map((x) => x.song.name)
    expect(chen).toEqual(['晚风', '星轨'].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN')))
  })

  it('不修改原数组', () => {
    const before = list.map((x) => x.song.id)
    sortIndexed(list, 'name', 'desc')
    expect(list.map((x) => x.song.id)).toEqual(before)
  })
})

describe('groupAlbums 专辑聚合', () => {
  it('同名专辑合并、保留下标与顺序', () => {
    const albums = groupAlbums(indexTracks(tracks))
    const hai = albums.find((a) => a.name === '海边')
    expect(hai?.items.map((x) => x.song.id)).toEqual([1, 4])
    expect(hai?.items.map((x) => x.index)).toEqual([0, 3])
    expect(albums).toHaveLength(3)
  })

  it('空专辑名归入本地音乐', () => {
    const albums = groupAlbums(indexTracks([mk(9, 'x', 'y', '', 1)]))
    expect(albums[0].name).toBe('本地音乐')
  })
})

describe('groupArtists 歌手聚合', () => {
  it('按歌手分组并统计专辑数', () => {
    const artists = groupArtists(indexTracks(tracks))
    const chen = artists.find((a) => a.name === '陈默')
    expect(chen?.items).toHaveLength(2)
    expect(chen?.albumCount).toBe(2)
  })
})
