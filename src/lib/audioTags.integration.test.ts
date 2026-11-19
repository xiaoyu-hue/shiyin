import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { extractAudioTags } from './audioTags'
import { buildLocalTrack } from './localAudio'

/**
 * 真实文件集成测试：fixtures 为 ffmpeg 生成、mutagen 写入标准标签的短音频，
 * 内含歌名 / 歌手 / 专辑 / PNG 封面 / LRC 歌词，用于验证 music-metadata 的实际解析结果。
 */
function loadFixture(name: string, type: string): File {
  const path = fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url))
  const buf = readFileSync(path)
  return new File([buf], name, { type })
}

describe('extractAudioTags 真实文件解析', () => {
  it('MP3（ID3v2 USLT）：读出歌名、歌手、专辑、封面与 LRC 歌词', async () => {
    const tags = await extractAudioTags(loadFixture('tagged.mp3', 'audio/mpeg'))
    expect(tags?.title).toBe('标签歌名')
    expect(tags?.artist).toBe('标签歌手')
    expect(tags?.album).toBe('标签专辑')
    expect(tags?.duration).toBeGreaterThan(1.5)
    expect(tags?.coverBlob?.type).toBe('image/png')
    expect(tags?.lyrics).toEqual([
      { t: '00:00.50', text: '第一句歌词' },
      { t: '00:01.50', text: '第二句歌词' },
    ])
  })

  it('FLAC（Vorbis Comment）：读出歌名、歌手、专辑、封面与歌词', async () => {
    const tags = await extractAudioTags(loadFixture('tagged.flac', 'audio/flac'))
    expect(tags?.title).toBe('FLAC歌名')
    expect(tags?.artist).toBe('FLAC歌手')
    expect(tags?.album).toBe('FLAC专辑')
    expect(tags?.coverBlob).not.toBeNull()
    expect(tags?.lyrics.map((l) => l.text)).toEqual(['第一句歌词', '第二句歌词'])
  })

  it('损坏文件返回 null 而不是抛错', async () => {
    const broken = new File([new Uint8Array([0, 1, 2, 3])], 'broken.mp3', { type: 'audio/mpeg' })
    await expect(extractAudioTags(broken)).resolves.toBeNull()
  })
})

describe('buildLocalTrack 标签优先于文件名', () => {
  it('文件名故意写错时，曲目信息仍以标签为准且带封面', async () => {
    const path = fileURLToPath(new URL('./fixtures/tagged.mp3', import.meta.url))
    const buf = readFileSync(path)
    const file = new File([buf], '错歌手 - 错歌名.mp3', { type: 'audio/mpeg' })
    const track = await buildLocalTrack(file, 2001)
    expect(track.name).toBe('标签歌名')
    expect(track.artist).toBe('标签歌手')
    expect(track.album).toBe('标签专辑')
    expect(track.lyrics).toHaveLength(2)
    expect(track.coverSrc).toBeTruthy()
    expect(track.coverBlob?.type).toBe('image/png')
    expect(track.dur).toBeGreaterThanOrEqual(2)
  })
})
