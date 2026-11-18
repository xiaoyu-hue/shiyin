import type { Song } from '../data/types'
import { toSeconds } from './format'

/** 重新导出，便于 lyric 模块自洽引用 */
export { toSeconds }

/** 按当前进度返回应高亮的歌词行序号；无匹配返回 0 */
export function lyricIndex(song: Song, pos: number): number {
  let idx = 0
  for (let i = 0; i < song.lyrics.length; i += 1) {
    if (toSeconds(song.lyrics[i].t) <= pos) idx = i
    else break
  }
  return idx
}
