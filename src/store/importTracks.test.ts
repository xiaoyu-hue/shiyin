/**
 * 导入管线分支测试（审计 A-04）：依赖经 ImportDeps 注入桩实现，
 * store 用真实状态机验证入库与自动播放语义。
 * 覆盖：无音频返回、新增入库+自动播放、外挂歌词优先于内嵌、
 * 重复跳过但补挂歌词、持久化失败不阻断、解析失败计跳过。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { importTracks, type ImportDeps } from './importTracks'
import { useStore } from './index'
import { fileKey } from '../lib/localAudio'
import { pairLyricFiles } from '../lib/lyricFile'
import type { Song } from '../data/types'

const EMBEDDED = [{ t: '00:01.00', text: '内嵌歌词' }]
const EXTERNAL = [{ t: '00:02.00', text: '外挂歌词' }]

function fakeDeps(over: Partial<ImportDeps> = {}): ImportDeps {
  return {
    buildLocalTrack: async (file: File, id: number): Promise<Song> => ({
      id,
      name: file.name.replace(/\.[^.]+$/, ''),
      artist: '测试歌手',
      album: '测试专辑',
      dur: 100,
      color: '#123456',
      lyrics: [...EMBEDDED],
      audioSrc: 'blob:fake',
    }),
    pairLyricFiles,
    readLyricFile: async () => [...EXTERNAL],
    attachLyricsToTrack: vi.fn(async () => undefined),
    nextLocalId: () => 9000,
    persistTrack: vi.fn(async () => undefined),
    ...over,
  }
}

function audioFile(name: string, size = 100): File {
  return new File([new Uint8Array(size)], name, { type: 'audio/mpeg' })
}

beforeEach(() => {
  useStore.setState({ tracks: [], cur: 0, playing: false, history: [] })
})

describe('importTracks 导入管线', () => {
  it('无音频时返回 no-audio；含歌词文件时 lyricOnly 为真', async () => {
    const deps = fakeDeps()
    await expect(importTracks([], undefined, deps)).resolves.toEqual({ kind: 'no-audio', lyricOnly: false })
    const lrc = new File(['[00:01.00]x'], '测试之歌.lrc', { type: 'text/plain' })
    await expect(importTracks([lrc], undefined, deps)).resolves.toEqual({ kind: 'no-audio', lyricOnly: true })
  })

  it('新增曲目入库、持久化被调用，并自动播放第一首新增', async () => {
    const deps = fakeDeps()
    const res = await importTracks([audioFile('测试之歌.mp3')], undefined, deps)
    expect(res).toEqual({ kind: 'done', added: 1, skipped: 0, lrc: 0 })
    expect(deps.persistTrack).toHaveBeenCalledTimes(1)
    const s = useStore.getState()
    expect(s.tracks).toHaveLength(1)
    expect(s.tracks[0].lyrics).toEqual(EMBEDDED)
    expect(s.cur).toBe(0)
  })

  it('同名外挂歌词优先于内嵌歌词', async () => {
    const deps = fakeDeps()
    const lrc = new File(['x'], '测试之歌.lrc', { type: 'text/plain' })
    const res = await importTracks([audioFile('测试之歌.mp3'), lrc], undefined, deps)
    expect(res).toMatchObject({ kind: 'done', added: 1, lrc: 1 })
    expect(useStore.getState().tracks[0].lyrics).toEqual(EXTERNAL)
  })

  it('重复曲目跳过入库，但同名歌词仍补挂到已入库曲目', async () => {
    const file = audioFile('测试之歌.mp3')
    const key = fileKey(file)
    const existing: Song = {
      id: 42,
      name: '测试之歌',
      artist: '测试歌手',
      album: '',
      dur: 100,
      color: '#123456',
      lyrics: [],
      localKey: key,
    }
    useStore.setState({ tracks: [existing] })
    const deps = fakeDeps()
    const lrc = new File(['x'], '测试之歌.lrc', { type: 'text/plain' })
    const res = await importTracks([file, lrc], undefined, deps)
    expect(res).toMatchObject({ kind: 'done', added: 0, skipped: 1, lrc: 1 })
    expect(deps.attachLyricsToTrack).toHaveBeenCalledWith(0, EXTERNAL)
    expect(deps.persistTrack).not.toHaveBeenCalled()
    expect(useStore.getState().tracks).toHaveLength(1)
  })

  it('持久化失败不阻断导入，曲目仍入库', async () => {
    const deps = fakeDeps({
      persistTrack: vi.fn(async () => {
        throw new Error('disk full')
      }),
    })
    const res = await importTracks([audioFile('测试之歌.mp3')], undefined, deps)
    expect(res).toMatchObject({ kind: 'done', added: 1, skipped: 0 })
    expect(useStore.getState().tracks).toHaveLength(1)
  })

  it('解析失败计入跳过且不入库', async () => {
    const deps = fakeDeps({
      buildLocalTrack: vi.fn(async () => {
        throw new Error('bad tags')
      }),
    })
    const res = await importTracks([audioFile('坏文件.mp3')], undefined, deps)
    expect(res).toMatchObject({ kind: 'done', added: 0, skipped: 1 })
    expect(useStore.getState().tracks).toHaveLength(0)
  })
})
