import type { Song } from './types'

/** 按关键词过滤歌名 / 歌手；空词返回全部 */
export function search(songs: Song[], keyword: string): Array<{ index: number; song: Song }> {
  const q = keyword.trim().toLowerCase()
  return songs
    .map((song, index) => ({ song, index }))
    .filter(({ song }) => !q || song.name.toLowerCase().includes(q) || song.artist.toLowerCase().includes(q))
}

/** 按索引取曲目；越界返回 undefined */
