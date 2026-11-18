import { describe, expect, it } from 'vitest'
import { fileKey, isAudioFile, parseTrackName, pickCover, stripExtension } from './localAudio'

const makeFile = (name: string, type = '') => new File([new Uint8Array([1, 2, 3])], name, { type })

describe('parseTrackName 文件名解析', () => {
  it('识别「歌手 - 歌名」', () => {
    expect(parseTrackName('周杰伦 - 晴天.mp3')).toEqual({ artist: '周杰伦', name: '晴天' })
  })

  it('去除开头的曲目序号', () => {
    expect(parseTrackName('01. 陈默 - 晚风遇见海.flac')).toEqual({ artist: '陈默', name: '晚风遇见海' })
    expect(parseTrackName('12、苏晚-雨天备忘录.m4a')).toEqual({ artist: '苏晚', name: '雨天备忘录' })
  })

  it('无连字符时整段作为歌名', () => {
    expect(parseTrackName('晴天.mp3')).toEqual({ artist: '本地音乐', name: '晴天' })
  })

  it('不误拆英文连字符名称', () => {
    expect(parseTrackName('Lo-Fi Beats.mp3')).toEqual({ artist: '本地音乐', name: 'Lo-Fi Beats' })
  })

  it('带空格的连字符按「歌手 - 歌名」拆分（行业惯例）', () => {
    expect(parseTrackName('Simon - Garfunkel.mp3')).toEqual({ artist: 'Simon', name: 'Garfunkel' })
  })

  it('无扩展名也能解析', () => {
    expect(parseTrackName('未命名').name).toBe('未命名')
  })
})

describe('stripExtension 与 isAudioFile', () => {
  it('去掉音频扩展名', () => {
    expect(stripExtension('a.MP3')).toBe('a')
    expect(stripExtension('b.flac')).toBe('b')
  })

  it('按 MIME 或扩展名识别音频', () => {
    expect(isAudioFile(makeFile('a.bin', 'audio/mpeg'))).toBe(true)
    expect(isAudioFile(makeFile('a.mp3'))).toBe(true)
    expect(isAudioFile(makeFile('a.ogg'))).toBe(true)
    expect(isAudioFile(makeFile('a.txt', 'text/plain'))).toBe(false)
  })
})

describe('fileKey 与 pickCover', () => {
  it('同名同大小同修改时间的文件得到相同 key', () => {
    const a = new File(['x'], 'a.mp3', { lastModified: 1000 })
    const b = new File(['x'], 'a.mp3', { lastModified: 1000 })
    expect(fileKey(a)).toBe(fileKey(b))
  })

  it('不同文件得到不同 key', () => {
    const a = new File(['x'], 'a.mp3', { lastModified: 1000 })
    const b = new File(['y'], 'b.mp3', { lastModified: 2000 })
    expect(fileKey(a)).not.toBe(fileKey(b))
  })

  it('同一 seed 取色稳定且落在色池内', () => {
    expect(pickCover('晴天')).toBe(pickCover('晴天'))
    expect(pickCover('晴天')).toMatch(/^#[0-9A-F]{6}$/i)
    expect(pickCover('')).toMatch(/^#[0-9A-F]{6}$/i)
  })
})
