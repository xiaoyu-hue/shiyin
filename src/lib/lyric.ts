import type { Song } from '../data/types'
import { toSeconds } from './format'

/** 重新导出，便于 lyric 模块自洽引用 */
export { toSeconds }

/**
 * 按当前进度返回应高亮的歌词行序号；无匹配返回 0。
 * 未同步歌词（纯文本内嵌歌词，各行时间戳相同）没有真实时间信息，返回 -1 表示不高亮，
 * 避免所有行时间都是 00:00 时错误地高亮到最后一行。
 */
export function lyricIndex(song: Song, pos: number): number {
  const lines = song.lyrics
  if (lines.length > 1 && lines.every((l) => toSeconds(l.t) === toSeconds(lines[0].t))) return -1
  let idx = 0
  for (let i = 0; i < lines.length; i += 1) {
    if (toSeconds(lines[i].t) <= pos) idx = i
    else break
  }
  return idx
}
