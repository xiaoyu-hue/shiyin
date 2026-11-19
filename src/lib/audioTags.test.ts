import { describe, expect, it } from 'vitest'
import {
  formatLyricTime,
  lyricsFromSyncText,
  lyricsFromText,
  mergeTrackMeta,
  parseLrcText,
  plainTextLyrics,
  sanitizeLyricLines,
} from './audioTags'
import { toSeconds } from './format'

describe('mergeTrackMeta 标签优先、文件名兜底', () => {
  const fallback = { name: '文件名歌名', artist: '文件名歌手' }

  it('标签齐全时全用标签值', () => {
    expect(mergeTrackMeta(fallback, { title: '晴天', artist: '周杰伦', album: '叶惠美' })).toEqual({
      name: '晴天',
      artist: '周杰伦',
      album: '叶惠美',
    })
  })

  it('标签缺失或空白时逐项回退', () => {
    expect(mergeTrackMeta(fallback, { title: '  ', artist: undefined, album: undefined })).toEqual({
      name: '文件名歌名',
      artist: '文件名歌手',
      album: '本地音乐',
    })
    expect(mergeTrackMeta(fallback, null)).toEqual({
      name: '文件名歌名',
      artist: '文件名歌手',
      album: '本地音乐',
    })
  })

  it('标签值会去首尾空白', () => {
    expect(mergeTrackMeta(fallback, { title: ' 晴天 ' }).name).toBe('晴天')
  })
})

describe('formatLyricTime', () => {
  it('整秒不带小数', () => {
    expect(formatLyricTime(0)).toBe('00:00')
    expect(formatLyricTime(65000)).toBe('01:05')
  })

  it('带厘秒时保留两位小数且可被 toSeconds 还原', () => {
    expect(formatLyricTime(83456)).toBe('01:23.45')
    expect(toSeconds(formatLyricTime(83456))).toBeCloseTo(83.45, 5)
  })

  it('非法输入回退 00:00', () => {
    expect(formatLyricTime(-1)).toBe('00:00')
    expect(formatLyricTime(Number.NaN)).toBe('00:00')
  })
})

describe('parseLrcText LRC 解析', () => {
  it('解析带厘秒的时间戳并按时间排序', () => {
    const lines = parseLrcText('[00:16.50]第二行\n[00:00.00]第一行')
    expect(lines).toEqual([
      { t: '00:00', text: '第一行' },
      { t: '00:16.50', text: '第二行' },
    ])
  })

  it('一行多时间戳展开为多行', () => {
    const lines = parseLrcText('[00:10.00][00:20.00]重复的副歌')
    expect(lines).toHaveLength(2)
    expect(lines.map((l) => l.t)).toEqual(['00:10', '00:20'])
  })

  it('忽略元信息行、无时间戳行与空歌词行', () => {
    const lines = parseLrcText('[ti:歌名]\n[ar:歌手]\n没有时间戳的一行\n[00:05.00]\n[00:06.00]真正的歌词')
    expect(lines).toEqual([{ t: '00:06', text: '真正的歌词' }])
  })

  it('支持毫秒三位与冒号分隔的小数', () => {
    expect(parseLrcText('[01:02.345]甲')).toEqual([{ t: '01:02.34', text: '甲' }])
    expect(parseLrcText('[01:02:50]乙')).toEqual([{ t: '01:02.50', text: '乙' }])
  })

  it('支持整秒与一位小数的时间戳（外挂歌词常见变体）', () => {
    expect(parseLrcText('[00:07]整秒')).toEqual([{ t: '00:07', text: '整秒' }])
    expect(parseLrcText('[00:07.5]一位小数')).toEqual([{ t: '00:07.50', text: '一位小数' }])
  })

  it('[offset:] 全局偏移：正偏移提前、负偏移延后，不小于 0', () => {
    expect(parseLrcText('[offset:+500]\n[00:10.00]甲')).toEqual([{ t: '00:09.50', text: '甲' }])
    expect(parseLrcText('[offset:-500]\n[00:10.00]甲')).toEqual([{ t: '00:10.50', text: '甲' }])
    expect(parseLrcText('[offset:+2000]\n[00:01.00]甲')).toEqual([{ t: '00:00', text: '甲' }])
  })

  it('剥离行内逐词标签，只保留行文本', () => {
    const lines = parseLrcText('[00:10.00]<00:10.00>逐<00:10.50>词<00:11.00>歌词')
    expect(lines).toEqual([{ t: '00:10', text: '逐词歌词' }])
  })

  it('逐词方括号时间戳（[mm:ss.xx] 夹在字间）只取行首时间、剥净全部时间戳、不重复展开', () => {
    const lines = parseLrcText('[00:22.68]会[00:23.03]在[00:23.28]何[00:23.59]处')
    expect(lines).toEqual([{ t: '00:22.68', text: '会在何处' }])
  })

  it('行首无时间戳但字间有时间戳时，取第一个时间戳为行时间', () => {
    const lines = parseLrcText('会[00:23.03]在[00:23.28]何')
    expect(lines).toEqual([{ t: '00:23.03', text: '会在何' }])
  })
})

describe('lyricsFromText 与 plainTextLyrics', () => {
  it('含 LRC 时间戳时按同步歌词处理', () => {
    expect(lyricsFromText('[00:01.00]你好')).toEqual([{ t: '00:01', text: '你好' }])
  })

  it('纯文本逐行保留、时间统一 00:00、过滤空行', () => {
    expect(plainTextLyrics('第一行\n\n  第二行  \n')).toEqual([
      { t: '00:00', text: '第一行' },
      { t: '00:00', text: '第二行' },
    ])
    expect(lyricsFromText('第一行\n第二行')).toHaveLength(2)
  })

  it('空文本返回空数组', () => {
    expect(lyricsFromText('')).toEqual([])
    expect(lyricsFromText('   ')).toEqual([])
    expect(lyricsFromText(undefined)).toEqual([])
    expect(lyricsFromText(null)).toEqual([])
  })
})

describe('lyricsFromSyncText 同步歌词条目', () => {
  it('毫秒时间戳转为歌词行并排序', () => {
    expect(
      lyricsFromSyncText([
        { text: '第二行', timestamp: 16500 },
        { text: '第一行', timestamp: 0 },
      ]),
    ).toEqual([
      { t: '00:00', text: '第一行' },
      { t: '00:16.50', text: '第二行' },
    ])
  })

  it('丢弃无时间戳、负时间戳与空文本条目', () => {
    expect(
      lyricsFromSyncText([
        { text: '无时间' },
        { text: '负时间', timestamp: -5 },
        { text: '  ', timestamp: 1000 },
        { text: '有效', timestamp: 1000 },
      ]),
    ).toEqual([{ t: '00:01', text: '有效' }])
  })

  it('条目文本里夹带的逐词时间戳会被剥净（某些工具把逐词歌词写进同步歌词帧）', () => {
    expect(
      lyricsFromSyncText([
        { text: '会[00:23.03]在[00:23.28]何[00:23.59]处', timestamp: 22680 },
        { text: '[00:27.94]', timestamp: 27940 },
      ]),
    ).toEqual([{ t: '00:22.68', text: '会在何处' }])
  })
})

describe('sanitizeLyricLines 已存歌词清洗', () => {
  it('剥净行文本中的方括号/尖括号时间戳并丢弃变空的行', () => {
    expect(
      sanitizeLyricLines([
        { t: '00:22.68', text: '会[00:23.03]在[00:23.28]何' },
        { t: '00:25.00', text: '<00:25.00>' },
        { t: '00:27.94', text: '莫非前尘' },
      ]),
    ).toEqual([
      { t: '00:22.68', text: '会在何' },
      { t: '00:27.94', text: '莫非前尘' },
    ])
  })

  it('纯文本歌词里的时间戳残留同样剥净', () => {
    expect(plainTextLyrics('[00:23.03 ]带残留的一行')).toEqual([{ t: '00:00', text: '带残留的一行' }])
  })
})
