/**
 * Tauri 桌面环境曲目存储（Windows 阶段验证包）：与安卓原生实现同构——
 * 音频/封面落真实文件 + JSON 索引，绝不复用网页的 IndexedDB
 *（桌面 WebView 的 IDB 有升级丢数据的实证，见 Windows 阶段调研报告）。
 *
 * 布局（全部位于应用数据目录 BaseDirectory.AppData，即
 * %APPDATA%/com.shiyin.player，卸载才清除）：
 * - tracks/、covers/、thumbs/、midcovers/ 与 tracks-index.json，
 *   路径与字段复用 lib/trackIndex.ts（与安卓索引格式完全一致）。
 *
 * 播放/封面地址用 convertFileSrc 把绝对路径转成 asset 协议地址，
 * assetProtocol 的 scope 在 tauri.conf.json 里只放行 $APPDATA/**。
 *
 * 大文件写盘（1.3.0）：音频落盘走 Rust 窄命令 copy_import_file 流式复制
 *（256KB 缓冲逐块拷贝，落盘环节内存占用与文件大小无关），源路径由
 * tauriFiles 在构造 File 时登记（对话框/拖放/钩子三路都有真实路径）。
 * 查不到源路径时（理论上桌面端不发生）回退 plugin-fs 整读写入。
 * 如实说明：导入解析阶段（标签解析管线）仍需持有 File 对象本体，
 * 内存峰值约一份文件量级；要连解析也零整读需重构解析管线，不在本版范围。
 * 封面/缩略图等小文件维持整读写入。
 *
 * 本模块只在 Tauri 环境被 trackStore 选中；插件用动态 import 加载，
 * 网页/安卓构建产物不包含其代码。
 */
import type { LyricLine } from '../data/types'
import type { StoredTrack } from './idb'
import type { LoadedTrack, TrackStore } from './trackStore'
import {
  COVERS_DIR,
  INDEX_FILE,
  MIDCOVERS_DIR,
  THUMBS_DIR,
  TRACKS_DIR,
  audioRelPath,
  coverRelPath,
  midCoverRelPath,
  parseTrackIndex,
  serializeTrackIndex,
  thumbRelPath,
  totalIndexSize,
  type TrackIndexEntry,
} from '../lib/trackIndex'
import { srcPathOf } from './tauriFiles'

interface TauriFsBundle {
  fs: typeof import('@tauri-apps/plugin-fs')
  core: typeof import('@tauri-apps/api/core')
  path: typeof import('@tauri-apps/api/path')
  appData: import('@tauri-apps/api/path').BaseDirectory
}

let fsPromise: Promise<TauriFsBundle> | null = null

function loadFs(): Promise<TauriFsBundle> {
  if (!fsPromise) {
    fsPromise = Promise.all([
      import('@tauri-apps/plugin-fs'),
      import('@tauri-apps/api/core'),
      import('@tauri-apps/api/path'),
    ]).then(([fs, core, path]) => ({ fs, core, path, appData: path.BaseDirectory.AppData }))
  }
  return fsPromise
}

/** 确保四个曲库子目录存在（recursive 创建，连带应用数据目录本身） */
async function ensureDirs(): Promise<void> {
  const { fs, appData } = await loadFs()
  for (const dir of [TRACKS_DIR, COVERS_DIR, THUMBS_DIR, MIDCOVERS_DIR]) {
    await fs.mkdir(dir, { baseDir: appData, recursive: true }).catch(() => undefined)
  }
}

/** Blob 整文件读入内存后一次写入（取舍说明见文件头） */
async function writeBlob(relPath: string, blob: Blob): Promise<void> {
  const { fs, appData } = await loadFs()
  const buf = new Uint8Array(await blob.arrayBuffer())
  await fs.writeFile(relPath, buf, { baseDir: appData })
}

async function readIndex(): Promise<TrackIndexEntry[]> {
  const { fs, appData } = await loadFs()
  try {
    const raw = await fs.readTextFile(INDEX_FILE, { baseDir: appData })
    return parseTrackIndex(raw)
  } catch {
    return []
  }
}

async function writeIndex(entries: TrackIndexEntry[]): Promise<void> {
  const { fs, appData } = await loadFs()
  await fs.writeTextFile(INDEX_FILE, serializeTrackIndex(entries), { baseDir: appData })
}

/** 索引读-改-写串行化，避免并发保存互相覆盖（与安卓实现同策略） */
let indexChain: Promise<unknown> = Promise.resolve()
function withIndex<T>(fn: (entries: TrackIndexEntry[]) => Promise<T>): Promise<T> {
  const run = indexChain.then(async () => {
    const entries = await readIndex()
    return fn(entries)
  })
  indexChain = run.catch(() => undefined)
  return run
}

/** 相对路径 → WebView 可直接播放/展示的 asset 协议地址 */
async function toRuntimeSrc(relPath: string): Promise<string> {
  const { core, path } = await loadFs()
  const abs = await path.join(await path.appDataDir(), relPath)
  return core.convertFileSrc(abs)
}

async function deleteFileQuiet(relPath: string | null): Promise<void> {
  if (!relPath) return
  const { fs, appData } = await loadFs()
  await fs.remove(relPath, { baseDir: appData }).catch(() => undefined)
}

/** 封面文件扩展名 → MIME（读回 Blob 时标注用） */
function coverMime(relPath: string): string {
  if (relPath.endsWith('.png')) return 'image/png'
  if (relPath.endsWith('.webp')) return 'image/webp'
  if (relPath.endsWith('.gif')) return 'image/gif'
  return 'image/jpeg'
}

export const tauriTrackStore: TrackStore = {
  async saveTrack(rec: StoredTrack): Promise<void> {
    await ensureDirs()
    const fileName = (rec.blob as File).name || `${rec.key}.bin`
    const audioPath = audioRelPath(rec.key, fileName)
    // 音频落盘优先流式拷贝（源路径已知时）；回退整读仅作兜底
    let audioSize = rec.blob.size
    const srcPath = srcPathOf(rec.blob as File)
    if (srcPath) {
      const { core } = await loadFs()
      audioSize = await core.invoke<number>('copy_import_file', {
        srcPath,
        destRelPath: audioPath,
      })
    } else {
      await writeBlob(audioPath, rec.blob)
    }

    let coverPath: string | null = null
    let coverSize = 0
    if (rec.cover) {
      coverPath = coverRelPath(rec.key, rec.cover.type || 'image/jpeg')
      await writeBlob(coverPath, rec.cover)
      coverSize = rec.cover.size
    }

    let thumbPath: string | null = null
    let thumbSize = 0
    if (rec.thumb) {
      thumbPath = thumbRelPath(rec.key)
      await writeBlob(thumbPath, rec.thumb)
      thumbSize = rec.thumb.size
    }
    let midCoverPath: string | null = null
    let midCoverSize = 0
    if (rec.coverMid) {
      midCoverPath = midCoverRelPath(rec.key)
      await writeBlob(midCoverPath, rec.coverMid)
      midCoverSize = rec.coverMid.size
    }

    const entry: TrackIndexEntry = {
      key: rec.key,
      id: rec.id,
      name: rec.name,
      artist: rec.artist,
      album: rec.album,
      color: rec.color,
      dur: rec.dur,
      addedAt: rec.addedAt,
      lyrics: rec.lyrics ?? [],
      audioPath,
      audioSize,
      coverPath,
      coverSize,
      thumbPath,
      thumbSize,
      midCoverPath,
      midCoverSize,
      thumbDone: rec.thumbDone === true,
    }

    await withIndex(async (entries) => {
      const at = entries.findIndex((e) => e.key === rec.key)
      const old = at >= 0 ? entries[at] : null
      if (at >= 0) entries[at] = entry
      else entries.push(entry)
      await writeIndex(entries)
      if (old && old.audioPath !== audioPath) await deleteFileQuiet(old.audioPath)
      if (old && old.coverPath && old.coverPath !== coverPath) await deleteFileQuiet(old.coverPath)
      if (old && old.thumbPath && old.thumbPath !== thumbPath) await deleteFileQuiet(old.thumbPath)
      if (old && old.midCoverPath && old.midCoverPath !== midCoverPath) await deleteFileQuiet(old.midCoverPath)
    })
  },

  async loadTracks(): Promise<LoadedTrack[]> {
    const entries = await readIndex()
    const out: LoadedTrack[] = []
    for (const e of entries) {
      const audioSrc = await toRuntimeSrc(e.audioPath)
      let coverSrc: string | null = null
      let coverBlob: Blob | null = null
      if (e.coverPath) {
        coverSrc = await toRuntimeSrc(e.coverPath)
        // 封面原图顺带取回（海报生成与补图需要）；失败按无封面处理，不阻断恢复
        try {
          const { fs, appData } = await loadFs()
          const bytes = await fs.readFile(e.coverPath, { baseDir: appData })
          coverBlob = new Blob([bytes as BlobPart], { type: coverMime(e.coverPath) })
        } catch {
          coverBlob = null
        }
      }
      out.push({
        key: e.key,
        id: e.id,
        name: e.name,
        artist: e.artist,
        album: e.album,
        color: e.color,
        dur: e.dur,
        addedAt: e.addedAt,
        lyrics: e.lyrics,
        audioSrc,
        coverSrc,
        coverBlob,
        thumbSrc: e.thumbPath ? await toRuntimeSrc(e.thumbPath) : null,
        midCoverSrc: e.midCoverPath ? await toRuntimeSrc(e.midCoverPath) : null,
        thumbDone: e.thumbDone === true,
      })
    }
    return out
  },

  async deleteTrack(key: string): Promise<void> {
    await withIndex(async (entries) => {
      const at = entries.findIndex((e) => e.key === key)
      if (at < 0) return
      const [removed] = entries.splice(at, 1)
      await writeIndex(entries)
      await deleteFileQuiet(removed.audioPath)
      await deleteFileQuiet(removed.coverPath)
      await deleteFileQuiet(removed.thumbPath ?? null)
      await deleteFileQuiet(removed.midCoverPath ?? null)
    })
  },

  async updateTrackLyrics(key: string, lyrics: LyricLine[]): Promise<void> {
    await withIndex(async (entries) => {
      const entry = entries.find((e) => e.key === key)
      if (!entry) return
      entry.lyrics = lyrics
      await writeIndex(entries)
    })
  },

  async updateTrackCovers(key: string, covers): Promise<void> {
    await ensureDirs()
    let thumbPath: string | null = null
    let midCoverPath: string | null = null
    if (covers.thumb) {
      thumbPath = thumbRelPath(key)
      await writeBlob(thumbPath, covers.thumb)
    }
    if (covers.coverMid) {
      midCoverPath = midCoverRelPath(key)
      await writeBlob(midCoverPath, covers.coverMid)
    }
    await withIndex(async (entries) => {
      const entry = entries.find((e) => e.key === key)
      if (!entry) return
      const oldThumb = entry.thumbPath ?? null
      const oldMid = entry.midCoverPath ?? null
      entry.thumbPath = thumbPath
      entry.thumbSize = covers.thumb ? covers.thumb.size : 0
      entry.midCoverPath = midCoverPath
      entry.midCoverSize = covers.coverMid ? covers.coverMid.size : 0
      entry.thumbDone = true
      await writeIndex(entries)
      if (oldThumb && oldThumb !== thumbPath) await deleteFileQuiet(oldThumb)
      if (oldMid && oldMid !== midCoverPath) await deleteFileQuiet(oldMid)
    })
  },

  async clearTracks(): Promise<void> {
    const { fs, appData } = await loadFs()
    for (const dir of [TRACKS_DIR, COVERS_DIR, THUMBS_DIR, MIDCOVERS_DIR]) {
      await fs.remove(dir, { baseDir: appData, recursive: true }).catch(() => undefined)
    }
    await deleteFileQuiet(INDEX_FILE)
  },

  /** 占用 = 索引中记录的文件字节数之和（与安卓实现同口径） */
  async storageUsage(): Promise<number | null> {
    const entries = await readIndex()
    return totalIndexSize(entries)
  },
}
