import { describe, it, expect } from 'vitest'
import { lyricIndex, toSeconds } from './lyric'
import type { Song } from '../data/types'

/** 测试专用曲目夹具（应用本身不再内置任何示例曲目） */
const song: Song = {
  id: 1,
  name: '测试曲目',
  artist: '测试歌手',
  album: '测试专辑',
  dur: 60,
  color: '#365FA3',
  lyrics: [
    { t: '00:00', text: '第一行' },
    { t: '00:16', text: '第二行' },
    { t: '00:32', text: '第三行' },
    { t: '00:48', text: '第四行' },
  ],
}

describe('lyricIndex 歌词行定位', () => {
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
  it('未同步歌词（各行时间相同）返回 -1 不高亮', () => {
    const plain = {
      ...song,
      lyrics: [
        { t: '00:00', text: '纯文本第一行' },
        { t: '00:00', text: '纯文本第二行' },
      ],
    }
    expect(lyricIndex(plain, 0)).toBe(-1)
    expect(lyricIndex(plain, 60)).toBe(-1)
  })

  it('夹具歌词时间戳均在时长内且递增', () => {
    let prev = -1
    for (const line of song.lyrics) {
      const sec = toSeconds(line.t)
      expect(sec).toBeGreaterThanOrEqual(0)
      expect(sec).toBeLessThanOrEqual(song.dur)
      expect(sec).toBeGreaterThan(prev)
      prev = sec
    }
  })
})
