import { describe, expect, it } from 'vitest'
import { decodeLyricBytes, isLyricFileName, lyricsFromFileText, matchKeyOf, pairLyricFiles } from './lyricFile'

const utf8 = (s: string) => new TextEncoder().encode(s)

function utf16leWithBom(s: string): Uint8Array {
  const body: number[] = []
  for (const ch of s) {
    const cp = ch.codePointAt(0) ?? 0
    body.push(cp & 0xff, (cp >> 8) & 0xff)
  }
  return new Uint8Array([0xff, 0xfe, ...body])
}

describe('isLyricFileName / matchKeyOf', () => {
  it('识别 .lrc/.txt（大小写不敏感），其他扩展名不算', () => {
    expect(isLyricFileName('a.lrc')).toBe(true)
    expect(isLyricFileName('a.LRC')).toBe(true)
    expect(isLyricFileName('a.txt')).toBe(true)
    expect(isLyricFileName('a.mp3')).toBe(false)
    expect(isLyricFileName('lrc')).toBe(false)
  })

  it('配对键去扩展名、去空白、转小写', () => {
    expect(matchKeyOf('周杰伦 - 晴天.mp3')).toBe('周杰伦 - 晴天')
    expect(matchKeyOf(' Song Name .LRC')).toBe('song name')
    expect(matchKeyOf('noext')).toBe('noext')
  })
})

describe('decodeLyricBytes 编码探测', () => {
  it('UTF-8 正常解码（含 BOM 时剥 BOM）', () => {
    expect(decodeLyricBytes(utf8('[00:01.00]歌词'))).toBe('[00:01.00]歌词')
    const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...utf8('歌词')])
    expect(decodeLyricBytes(withBom)).toBe('歌词')
  })

  it('GBK 字节在 UTF-8 严格模式失败后回退 GB18030 解码', () => {
    // 「歌词」的 GBK 编码：歌 B8E8、词 B4CA
    const gbk = new Uint8Array([...utf8('[00:01.00]'), 0xb8, 0xe8, 0xb4, 0xca])
    expect(decodeLyricBytes(gbk)).toBe('[00:01.00]歌词')
  })

  it('UTF-16LE（带 BOM）正常解码', () => {
    expect(decodeLyricBytes(utf16leWithBom('[00:02.00]你好'))).toBe('[00:02.00]你好')
  })
})

describe('lyricsFromFileText', () => {
  it('同步歌词走 LRC 解析，纯文本走整段展示，空文本返回空', () => {
    expect(lyricsFromFileText('[00:01.50]第一句')).toEqual([{ t: '00:01.50', text: '第一句' }])
    expect(lyricsFromFileText('没有时间戳\n第二行')).toEqual([
      { t: '00:00', text: '没有时间戳' },
      { t: '00:00', text: '第二行' },
    ])
    expect(lyricsFromFileText('   ')).toEqual([])
  })
})

describe('pairLyricFiles 同名配对', () => {
  it('按同名配对，同名多个取第一个，未命中不入表', () => {
    const pairs = pairLyricFiles(
      ['周杰伦 - 晴天.mp3', '无歌词.mp3', 'Song.flac'],
      ['周杰伦 - 晴天.lrc', 'song.txt', 'Song.lrc', '孤儿.lrc'],
    )
    expect(pairs.get(0)).toBe(0)
    expect(pairs.has(1)).toBe(false)
    expect(pairs.get(2)).toBe(1) // song.txt 先于 Song.lrc 出现
    expect(pairs.size).toBe(2)
  })
})
