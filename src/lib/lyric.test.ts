import { describe, it, expect } from 'vitest'
import { lyricIndex, toSeconds } from './lyric'
import { songs } from '../data/sample'

describe('lyricIndex 歌词行定位', () => {
  const song = songs[0]
  const t1 = toSeconds(song.lyrics[1].t)
  const t2 = toSeconds(song.lyrics[2].t)
  const t3 = toSeconds(song.lyrics[3].t)

  it('进度为 0 时定位到第 0 行', () => expect(lyricIndex(song, 0)).toBe(0))
  it('按时间戳推进到对应行', () => {
    expect(lyricIndex(song, t1)).toBe(1)
    expect(lyricIndex(song, t2)).toBe(2)
    expect(lyricIndex(song, t3)).toBe(3)
  })
  it('行之间的进度停留在上一行', () => expect(lyricIndex(song, t1 + 1)).toBe(1))
  it('超出最后一行时停在末行', () => expect(lyricIndex(song, 9999)).toBe(song.lyrics.length - 1))
  it('示例歌词时间戳均在时长内且递增', () => {
    for (const s of songs) {
      let prev = -1
      for (const line of s.lyrics) {
        const sec = toSeconds(line.t)
        expect(sec).toBeGreaterThanOrEqual(0)
        expect(sec).toBeLessThanOrEqual(s.dur)
        expect(sec).toBeGreaterThan(prev)
        prev = sec
      }
    }
  })
})
