import { describe, expect, it } from 'vitest'
import {
  addTrackToList,
  cleanPlaylists,
  newPlaylist,
  parsePlaylists,
  purgeTrackFromAll,
  removeFromList,
  removeTrackFromList,
  renameInList,
  serializePlaylists,
} from './playlists'
import type { Playlist } from '../data/types'

const base: Playlist[] = [
  { id: 'pl-a', name: '睡前', trackIds: [1, 2], createdAt: 100 },
  { id: 'pl-b', name: '通勤', trackIds: [3], createdAt: 200 },
]

describe('cleanPlaylists 清洗', () => {
  it('丢弃结构不合法的歌单并清洗曲目 id', () => {
    const out = cleanPlaylists([
      { id: 'ok', name: '  好  ', trackIds: [1, 1, -2, 3.5, 4], createdAt: 5 },
      { id: '', name: '无 id', trackIds: [] },
      { id: 'x', name: '   ', trackIds: [] },
      { id: 'ok', name: '重复 id', trackIds: [] },
      'garbage',
      null,
    ])
    expect(out).toEqual([{ id: 'ok', name: '好', trackIds: [1, 4], createdAt: 5 }])
  })

  it('非数组返回空', () => {
    expect(cleanPlaylists(null)).toEqual([])
    expect(cleanPlaylists('x')).toEqual([])
  })
})

describe('序列化往返', () => {
  it('serialize 后 parse 回原数据', () => {
    expect(parsePlaylists(serializePlaylists(base))).toEqual(base)
  })

  it('原文损坏返回空数组', () => {
    expect(parsePlaylists('{oops')).toEqual([])
    expect(parsePlaylists(null)).toEqual([])
    expect(parsePlaylists('{"v":1}')).toEqual([])
  })
})

describe('歌单操作（不可变）', () => {
  it('新建歌单带唯一 id 与去空白名称', () => {
    const p = newPlaylist('  我的最爱 ', 123456)
    expect(p.name).toBe('我的最爱')
    expect(p.trackIds).toEqual([])
    expect(p.id).toContain('pl-')
  })

  it('重命名：空名不动、正常改名不改原数组', () => {
    expect(renameInList(base, 'pl-a', '  ')).toBe(base)
    const renamed = renameInList(base, 'pl-a', '夜晚')
    expect(renamed[0].name).toBe('夜晚')
    expect(base[0].name).toBe('睡前')
  })

  it('删除歌单', () => {
    expect(removeFromList(base, 'pl-a').map((p) => p.id)).toEqual(['pl-b'])
  })

  it('加入曲目：重复不加、新歌追加末尾', () => {
    expect(addTrackToList(base, 'pl-a', 2)[0].trackIds).toEqual([1, 2])
    expect(addTrackToList(base, 'pl-a', 9)[0].trackIds).toEqual([1, 2, 9])
  })

  it('移除曲目与全局剔除', () => {
    expect(removeTrackFromList(base, 'pl-a', 1)[0].trackIds).toEqual([2])
    const purged = purgeTrackFromAll(base, 3)
    expect(purged[1].trackIds).toEqual([])
    expect(purged[0].trackIds).toEqual([1, 2])
  })
})
