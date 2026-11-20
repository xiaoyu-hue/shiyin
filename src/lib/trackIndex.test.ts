import { describe, expect, it } from 'vitest'
import {
  audioRelPath,
  coverRelPath,
  extOfFileName,
  extOfMime,
  keyHash,
  midCoverRelPath,
  parseTrackIndex,
  serializeTrackIndex,
  thumbRelPath,
  totalIndexSize,
  type TrackIndexEntry,
} from './trackIndex'

function entry(partial: Partial<TrackIndexEntry> = {}): TrackIndexEntry {
  return {
    key: 'song.mp3::1234::1700000000000',
    id: 1001,
    name: '歌名',
    artist: '歌手',
    album: '专辑',
    color: '#7B5738',
    dur: 200,
    addedAt: 1700000000000,
    lyrics: [{ t: '00:01', text: '第一句' }],
    audioPath: 'tracks/ab12cd34.mp3',
    audioSize: 5_000_000,
    coverPath: 'covers/ab12cd34.jpg',
    coverSize: 50_000,
    thumbPath: null,
    thumbSize: 0,
    midCoverPath: null,
    midCoverSize: 0,
    thumbDone: false,
    ...partial,
  }
}

describe('keyHash', () => {
  it('同一 key 结果稳定且为 8 位十六进制', () => {
    const h = keyHash('song.mp3::1234::1700000000000')
    expect(h).toMatch(/^[0-9a-f]{8}$/)
    expect(keyHash('song.mp3::1234::1700000000000')).toBe(h)
  })

  it('不同 key 结果不同', () => {
    expect(keyHash('a.mp3::1::1')).not.toBe(keyHash('b.mp3::1::1'))
  })
})

describe('extOfFileName / extOfMime', () => {
  it('取扩展名并转小写', () => {
    expect(extOfFileName('Music.FLAC')).toBe('flac')
    expect(extOfFileName('a.b.m4a')).toBe('m4a')
  })

  it('无扩展名时用兜底', () => {
    expect(extOfFileName('noext')).toBe('bin')
    expect(extOfFileName('noext', 'mp3')).toBe('mp3')
  })

  it('MIME 推扩展名，jpeg 归一为 jpg', () => {
    expect(extOfMime('image/jpeg')).toBe('jpg')
    expect(extOfMime('image/png')).toBe('png')
    expect(extOfMime('application/octet-stream')).toBe('jpg')
    expect(extOfMime('')).toBe('jpg')
  })
})

describe('audioRelPath / coverRelPath', () => {
  it('路径由目录 + 哈希 + 扩展名拼成', () => {
    const key = 'x.flac::9::9'
    expect(audioRelPath(key, 'x.flac')).toBe(`tracks/${keyHash(key)}.flac`)
    expect(coverRelPath(key, 'image/png')).toBe(`covers/${keyHash(key)}.png`)
  })

  it('缩略图/中图路径固定在 thumbs / midcovers 目录下（1.1.0）', () => {
    const key = 'x.flac::9::9'
    expect(thumbRelPath(key)).toBe(`thumbs/${keyHash(key)}.jpg`)
    expect(midCoverRelPath(key)).toBe(`midcovers/${keyHash(key)}.jpg`)
  })
})

describe('serializeTrackIndex / parseTrackIndex', () => {
  it('往返一致且按 addedAt 升序', () => {
    const a = entry({ key: 'a::1::1', addedAt: 200 })
    const b = entry({ key: 'b::2::2', addedAt: 100 })
    const parsed = parseTrackIndex(serializeTrackIndex([a, b]))
    expect(parsed.map((e) => e.key)).toEqual(['b::2::2', 'a::1::1'])
    expect(parsed[0]).toEqual(b)
  })

  it('带缩略图的记录往返一致；旧索引缺字段时回退 null/0/false（1.1.0 向后兼容）', () => {
    const withThumbs = entry({
      thumbPath: 'thumbs/ab12cd34.jpg',
      thumbSize: 3_000,
      midCoverPath: 'midcovers/ab12cd34.jpg',
      midCoverSize: 20_000,
      thumbDone: true,
    })
    const parsed = parseTrackIndex(serializeTrackIndex([withThumbs]))
    expect(parsed[0]).toEqual(withThumbs)

    const legacy = { ...entry() } as Record<string, unknown>
    delete legacy.thumbPath
    delete legacy.thumbSize
    delete legacy.midCoverPath
    delete legacy.midCoverSize
    delete legacy.thumbDone
    const parsedLegacy = parseTrackIndex(JSON.stringify({ version: 1, tracks: [legacy] }))
    expect(parsedLegacy[0].thumbPath).toBeNull()
    expect(parsedLegacy[0].thumbSize).toBe(0)
    expect(parsedLegacy[0].midCoverPath).toBeNull()
    expect(parsedLegacy[0].thumbDone).toBe(false)
  })

  it('无缩略图路径时 thumbSize / midCoverSize 归零', () => {
    const raw = JSON.stringify({
      version: 1,
      tracks: [entry({ thumbPath: null, thumbSize: 999, midCoverPath: null, midCoverSize: 888 })],
    })
    const parsed = parseTrackIndex(raw)
    expect(parsed[0].thumbSize).toBe(0)
    expect(parsed[0].midCoverSize).toBe(0)
  })

  it('坏数据返回空数组不抛错', () => {
    expect(parseTrackIndex(null)).toEqual([])
    expect(parseTrackIndex('')).toEqual([])
    expect(parseTrackIndex('not json')).toEqual([])
    expect(parseTrackIndex('{"tracks":42}')).toEqual([])
    expect(parseTrackIndex('[1,2]')).toEqual([])
  })

  it('缺 key 或 audioPath 的记录被丢弃，重复 key 只留一条', () => {
    const raw = JSON.stringify({
      version: 1,
      tracks: [entry(), entry({ audioPath: '' }), { name: '无 key' }, entry({ name: '重复 key 的第二条' }), 'garbage'],
    })
    const parsed = parseTrackIndex(raw)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].name).toBe('歌名')
  })

  it('字段类型不对时清洗为安全默认值，无封面时 coverSize 归零', () => {
    const raw = JSON.stringify({
      version: 1,
      tracks: [
        {
          key: 'k::1::1',
          audioPath: 'tracks/x.mp3',
          id: 'oops',
          dur: -5,
          lyrics: [{ t: 1, text: 'x' }, { t: '00:00', text: 'ok' }, null],
          coverPath: null,
          coverSize: 999,
        },
      ],
    })
    const [e] = parseTrackIndex(raw)
    expect(e.id).toBe(0)
    expect(e.dur).toBe(0)
    expect(e.lyrics).toEqual([{ t: '00:00', text: 'ok' }])
    expect(e.coverPath).toBeNull()
    expect(e.coverSize).toBe(0)
  })
})

describe('totalIndexSize', () => {
  it('累加音频与封面字节数', () => {
    expect(totalIndexSize([entry(), entry({ audioSize: 10, coverSize: 1 })])).toBe(5_050_011)
    expect(totalIndexSize([])).toBe(0)
    // 1.1.0：缩略图/中图字节数一并计入
    expect(
      totalIndexSize([
        entry({ thumbPath: 'thumbs/x.jpg', thumbSize: 100, midCoverPath: 'midcovers/x.jpg', midCoverSize: 200 }),
      ]),
    ).toBe(5_050_000 + 300)
  })
})
