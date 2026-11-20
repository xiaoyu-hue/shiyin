// @vitest-environment happy-dom
/**
 * 三端 TrackStore 契约测试（审计 A-03）：同一套行为断言分别跑在
 * web（IndexedDB / fake-indexeddb）、native（Capacitor 文件系统内存桩）、
 * tauri（plugin-fs 内存桩 + 窄命令桩）三种实现上，锁住接口语义一致：
 * 保存→按导入序恢复、字段往返、歌词/封面局部更新、删除、清空、占用统计。
 */
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StoredTrack } from './idb'
import type { TrackStore } from './trackStore'

/* ---------------- Capacitor 文件系统内存桩 ---------------- */
const capFiles = new Map<string, string>()
vi.mock('@capacitor/core', () => ({
  Capacitor: { convertFileSrc: (uri: string) => `webview:${uri}` },
}))
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Data: 'DATA' },
  Encoding: { UTF8: 'utf8' },
  Filesystem: {
    writeFile: async (o: { path: string; data: string }) => {
      capFiles.set(o.path, o.data)
    },
    appendFile: async (o: { path: string; data: string }) => {
      capFiles.set(o.path, (capFiles.get(o.path) ?? '') + o.data)
    },
    readFile: async (o: { path: string }) => {
      const data = capFiles.get(o.path)
      if (data === undefined) throw new Error('not found')
      return { data }
    },
    deleteFile: async (o: { path: string }) => {
      if (!capFiles.delete(o.path)) throw new Error('not found')
    },
    getUri: async (o: { path: string }) => ({ uri: `file:///appdata/${o.path}` }),
    rmdir: async (o: { path: string }) => {
      for (const k of [...capFiles.keys()]) if (k.startsWith(o.path + '/')) capFiles.delete(k)
    },
  },
}))

/* ---------------- Tauri plugin-fs / api 内存桩 ---------------- */
const tauriFiles = new Map<string, Uint8Array>()
/** 模拟用户磁盘上的源文件（copy_import_file 的拷贝来源） */
const srcFiles = new Map<string, Uint8Array>()
vi.mock('@tauri-apps/plugin-fs', () => ({
  writeFile: async (path: string, data: Uint8Array) => {
    tauriFiles.set(path, data)
  },
  writeTextFile: async (path: string, data: string) => {
    tauriFiles.set(path, new TextEncoder().encode(data))
  },
  readTextFile: async (path: string) => {
    const data = tauriFiles.get(path)
    if (!data) throw new Error('not found')
    return new TextDecoder().decode(data)
  },
  readFile: async (path: string) => {
    const data = tauriFiles.get(path)
    if (!data) throw new Error('not found')
    return data
  },
  remove: async (path: string, o?: { recursive?: boolean }) => {
    if (o?.recursive) {
      for (const k of [...tauriFiles.keys()]) if (k === path || k.startsWith(path + '/')) tauriFiles.delete(k)
      return
    }
    if (!tauriFiles.delete(path)) throw new Error('not found')
  },
  exists: async (path: string) => tauriFiles.has(path),
  mkdir: async () => undefined,
  readDir: async () => [],
  stat: async () => ({ size: 0, mtime: new Date(0) }),
}))
vi.mock('@tauri-apps/api/path', () => ({
  BaseDirectory: { AppData: 1 },
  appDataDir: async () => '/appdata',
  join: async (...parts: string[]) => parts.join('/').replace(/\/{2,}/g, '/'),
}))
vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: (abs: string) => `asset:${abs}`,
  invoke: async (cmd: string, args?: Record<string, unknown>) => {
    if (cmd === 'register_picked_paths') return undefined
    if (cmd === 'read_picked_file') {
      const bytes = srcFiles.get(args?.path as string)
      if (!bytes) throw new Error('not found')
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    }
    if (cmd === 'read_picked_file_meta') {
      const bytes = srcFiles.get(args?.path as string)
      if (!bytes) throw new Error('not found')
      return { size: bytes.byteLength, modifiedMs: 1700000000000 }
    }
    if (cmd === 'copy_import_file') {
      const bytes = srcFiles.get(args?.srcPath as string)
      if (!bytes) throw new Error('not found')
      tauriFiles.set(args?.destRelPath as string, bytes)
      return bytes.byteLength
    }
    throw new Error(`unknown command ${cmd}`)
  },
}))
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: async () => null }))

import { webTrackStore } from './webTrackStore'
import { nativeTrackStore } from './nativeTrackStore'
import { tauriTrackStore } from './tauriTrackStore'
import { filesFromPaths } from './tauriFiles'

/* ---------------- 通用构造 ---------------- */
function makeRec(key: string, addedAt: number, over: Partial<StoredTrack> = {}): StoredTrack {
  return {
    key,
    id: Math.abs([...key].reduce((a, c) => a + c.charCodeAt(0), 0)),
    name: `歌曲${key}`,
    artist: '测试歌手',
    album: '测试专辑',
    color: '#123456',
    dur: 123,
    addedAt,
    lyrics: [{ t: '00:00.00', text: '第一行' }],
    blob: new File([new Uint8Array([1, 2, 3, 4])], `${key}.mp3`, { type: 'audio/mpeg' }),
    cover: new Blob(['cover-bytes'], { type: 'image/jpeg' }),
    thumb: null,
    coverMid: null,
    thumbDone: false,
    ...over,
  }
}

/** 同一套契约断言，三个实现共用 */
function defineContract(name: string, store: TrackStore, reset: () => Promise<void>) {
  describe(`TrackStore 契约 · ${name}`, () => {
    beforeEach(reset)

    it('保存后按导入序恢复，元数据/歌词/封面往返一致', async () => {
      await store.saveTrack(makeRec('k1', 100))
      await store.saveTrack(makeRec('k2', 200, { cover: null }))
      const loaded = await store.loadTracks()
      expect(loaded.map((t) => t.key)).toEqual(['k1', 'k2'])
      const first = loaded[0]
      expect(first.name).toBe('歌曲k1')
      expect(first.artist).toBe('测试歌手')
      expect(first.dur).toBe(123)
      expect(first.lyrics).toEqual([{ t: '00:00.00', text: '第一行' }])
      expect(first.audioSrc).toBeTruthy()
      expect(first.coverSrc).toBeTruthy()
      expect(loaded[1].coverSrc).toBeNull()
    })

    it('updateTrackLyrics 只改歌词；不存在的 key 静默跳过', async () => {
      await store.saveTrack(makeRec('k1', 100))
      await store.updateTrackLyrics('k1', [{ t: '00:05.00', text: '新歌词' }])
      await expect(store.updateTrackLyrics('missing', [])).resolves.toBeUndefined()
      const loaded = await store.loadTracks()
      expect(loaded[0].lyrics).toEqual([{ t: '00:05.00', text: '新歌词' }])
      expect(loaded[0].name).toBe('歌曲k1')
    })

    it('updateTrackCovers 回填缩略图并标记 thumbDone', async () => {
      await store.saveTrack(makeRec('k1', 100))
      expect((await store.loadTracks())[0].thumbDone).toBe(false)
      await store.updateTrackCovers('k1', {
        thumb: new Blob(['thumb'], { type: 'image/jpeg' }),
        coverMid: new Blob(['mid'], { type: 'image/jpeg' }),
      })
      await expect(store.updateTrackCovers('missing', { thumb: null, coverMid: null })).resolves.toBeUndefined()
      const loaded = (await store.loadTracks())[0]
      expect(loaded.thumbDone).toBe(true)
      expect(loaded.thumbSrc).toBeTruthy()
      expect(loaded.midCoverSrc).toBeTruthy()
    })

    it('deleteTrack 移除单曲且不影响其他曲目', async () => {
      await store.saveTrack(makeRec('k1', 100))
      await store.saveTrack(makeRec('k2', 200))
      await store.deleteTrack('k1')
      await expect(store.deleteTrack('missing')).resolves.toBeUndefined()
      const loaded = await store.loadTracks()
      expect(loaded.map((t) => t.key)).toEqual(['k2'])
    })

    it('clearTracks 后曲库为空', async () => {
      await store.saveTrack(makeRec('k1', 100))
      await store.clearTracks()
      expect(await store.loadTracks()).toEqual([])
    })

    it('storageUsage 返回数字或 null（网页口径），不抛错', async () => {
      await store.saveTrack(makeRec('k1', 100))
      const usage = await store.storageUsage()
      expect(usage === null || (typeof usage === 'number' && usage >= 0)).toBe(true)
    })
  })
}

/* ---------------- 网页实现（fake-indexeddb） ---------------- */
;(URL as unknown as { createObjectURL: () => string }).createObjectURL = () => 'blob:mock'
defineContract('web/IndexedDB', webTrackStore, async () => {
  await webTrackStore.clearTracks()
})

/* ---------------- 安卓实现（文件桩） ---------------- */
vi.stubGlobal('fetch', async () => ({
  ok: true,
  blob: async () => new Blob(['cover-bytes'], { type: 'image/jpeg' }),
}))
defineContract('native/文件+索引', nativeTrackStore, async () => {
  capFiles.clear()
  await nativeTrackStore.clearTracks()
})

/* ---------------- 桌面实现（文件桩） ---------------- */
defineContract('tauri/文件+索引', tauriTrackStore, async () => {
  tauriFiles.clear()
  srcFiles.clear()
  await tauriTrackStore.clearTracks()
})

describe('TrackStore 契约 · tauri 特有路径', () => {
  beforeEach(async () => {
    tauriFiles.clear()
    srcFiles.clear()
    await tauriTrackStore.clearTracks()
  })

  it('带源路径的 File 走 copy_import_file 流式落盘并记账大小', async () => {
    const audio = new Uint8Array([9, 8, 7, 6, 5])
    srcFiles.set('/music/song.mp3', audio)
    const [file] = await filesFromPaths(['/music/song.mp3'])
    expect(file).toBeInstanceOf(File)
    await tauriTrackStore.saveTrack(makeRec('stream', 100, { blob: file }))
    const usage = await tauriTrackStore.storageUsage()
    // 音频 5 字节 + 封面 11 字节（cover-bytes）
    expect(usage).toBe(5 + 11)
    const loaded = await tauriTrackStore.loadTracks()
    expect(loaded[0].audioSrc).toContain('asset:')
  })

  it('storageUsage 与索引记账一致（native 同口径校验）', async () => {
    capFiles.clear()
    await nativeTrackStore.saveTrack(makeRec('n1', 100, { cover: null }))
    // 音频 File 4 字节，无封面/缩略图
    expect(await nativeTrackStore.storageUsage()).toBe(4)
  })
})
