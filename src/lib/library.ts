import type { Song } from '../data/types'

/**
 * 音乐库的纯逻辑：带全局下标的曲目、排序、按专辑/歌手聚合。
 * 下标是 store 中 tracks 的位置，播放与高亮都以它为准，聚合/排序不得丢失。
 */
export interface IndexedSong {
  index: number
  song: Song
}

export type SortKey = 'addedAt' | 'name' | 'artist'
export type SortDir = 'asc' | 'desc'

export function indexTracks(tracks: Song[]): IndexedSong[] {
  return tracks.map((song, index) => ({ index, song }))
}

const collator = new Intl.Collator('zh-Hans-CN')

/** 按指定键排序（返回新数组，不改原数组）；同键时以歌名、再以下标稳定排序 */
export function sortIndexed(list: IndexedSong[], key: SortKey, dir: SortDir): IndexedSong[] {
  const sign = dir === 'asc' ? 1 : -1
  return [...list].sort((a, b) => {
    let c = 0
    if (key === 'addedAt') c = (a.song.addedAt ?? 0) - (b.song.addedAt ?? 0)
    else if (key === 'name') c = collator.compare(a.song.name, b.song.name)
    else c = collator.compare(a.song.artist, b.song.artist) || collator.compare(a.song.name, b.song.name)
    if (c !== 0) return c * sign
    return a.index - b.index
  })
}

export interface AlbumGroup {
  name: string
  /** 专辑歌手：取专辑内第一首的歌手（合辑场景仅作展示） */
  artist: string
  items: IndexedSong[]
  coverSrc?: string | null
  /** 与 coverSrc 同一首歌的中图（≤512px，1.1.0）：网格/详情大图展示用，缺失回退 coverSrc */
  midCoverSrc?: string | null
  color: string
}

/** 按专辑名聚合，组内保持原顺序，组间按专辑名排序 */
export function groupAlbums(list: IndexedSong[]): AlbumGroup[] {
  const map = new Map<string, AlbumGroup>()
  for (const item of list) {
    const name = item.song.album || '本地音乐'
    let g = map.get(name)
    if (!g) {
      g = {
        name,
        artist: item.song.artist,
        items: [],
        coverSrc: item.song.coverSrc,
        midCoverSrc: item.song.midCoverSrc,
        color: item.song.color,
      }
      map.set(name, g)
    }
    g.items.push(item)
    if (!g.coverSrc && item.song.coverSrc) {
      g.coverSrc = item.song.coverSrc
      g.midCoverSrc = item.song.midCoverSrc
    }
  }
  return [...map.values()].sort((a, b) => collator.compare(a.name, b.name))
}

export interface ArtistGroup {
  name: string
  items: IndexedSong[]
  /** 专辑数（该歌手名下不同专辑的数量） */
  albumCount: number
}

/** 按歌手聚合，组间按歌手名排序 */
export function groupArtists(list: IndexedSong[]): ArtistGroup[] {
  const map = new Map<string, { items: IndexedSong[]; albums: Set<string> }>()
  for (const item of list) {
    const name = item.song.artist || '本地音乐'
    let g = map.get(name)
    if (!g) {
      g = { items: [], albums: new Set() }
      map.set(name, g)
    }
    g.items.push(item)
    g.albums.add(item.song.album || '本地音乐')
  }
  return [...map.entries()]
    .map(([name, g]) => ({ name, items: g.items, albumCount: g.albums.size }))
    .sort((a, b) => collator.compare(a.name, b.name))
}
