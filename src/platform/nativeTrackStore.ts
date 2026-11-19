/**
 * 原生环境曲目存储（1.0.0 起）：音频/封面落真实文件 + JSON 索引。
 *
 * 布局（全部位于 App 数据目录 Directory.Data，卸载才清除，系统不会回收）：
 * - tracks/<哈希>.<扩展名>   音频原文件
 * - covers/<哈希>.<扩展名>   封面原图
 * - tracks-index.json        元数据索引（结构见 lib/trackIndex.ts）
 *
 * 大文件写盘取舍：@capacitor/filesystem 原生侧 writeFile/appendFile 只收
 * Base64 字符串（Blob 仅 Web 可用），整文件转 Base64 会多占约 1/3 内存且
 * 大文件有爆内存风险。因此按 512KB 分块：切片 → 逐块 Base64 → 首块
 * writeFile、后续 appendFile，每块独立编解码，内存占用恒定在单块量级。
 *
 * 本模块只在原生环境被 trackStore 选中；插件用动态 import 加载，
 * 网页构建产物不包含其代码。
 */
import { Capacitor } from '@capacitor/core'
import type {
  Directory as DirectoryType,
  Encoding as EncodingType,
  Filesystem as FilesystemType,
} from '@capacitor/filesystem'
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

const CHUNK_BYTES = 512 * 1024

type FilesystemPlugin = typeof FilesystemType
type DirectoryEnum = typeof DirectoryType
type EncodingEnum = typeof EncodingType

interface FsBundle {
  fs: FilesystemPlugin
  dir: DirectoryEnum['Data']
  utf8: EncodingEnum['UTF8']
}

let fsPromise: Promise<FsBundle> | null = null

function loadFs(): Promise<FsBundle> {
  if (!fsPromise) {
    fsPromise = import('@capacitor/filesystem').then((m) => ({
      fs: m.Filesystem,
      dir: m.Directory.Data,
      utf8: m.Encoding.UTF8,
    }))
  }
  return fsPromise
}

/** Blob 切片 → Base64（不含 data: 前缀）。FileReader 在 WebView 中稳定可用 */
function sliceToBase64(slice: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : ''
      const comma = url.indexOf(',')
      resolve(comma >= 0 ? url.slice(comma + 1) : '')
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(slice)
  })
}

/** 把 Blob 分块写入指定相对路径（首块 writeFile，其余 appendFile） */
async function writeBlobChunked(relPath: string, blob: Blob): Promise<void> {
  const { fs, dir } = await loadFs()
  if (blob.size === 0) {
    await fs.writeFile({ path: relPath, data: '', directory: dir, recursive: true })
    return
  }
  let offset = 0
  let first = true
  while (offset < blob.size) {
    const slice = blob.slice(offset, offset + CHUNK_BYTES)
    const data = await sliceToBase64(slice)
    if (first) {
      await fs.writeFile({ path: relPath, data, directory: dir, recursive: true })
      first = false
    } else {
      await fs.appendFile({ path: relPath, data, directory: dir })
    }
    offset += slice.size
  }
}

async function readIndex(): Promise<TrackIndexEntry[]> {
  const { fs, dir, utf8 } = await loadFs()
  try {
    const res = await fs.readFile({ path: INDEX_FILE, directory: dir, encoding: utf8 })
    return parseTrackIndex(typeof res.data === 'string' ? res.data : '')
  } catch {
    return []
  }
}

async function writeIndex(entries: TrackIndexEntry[]): Promise<void> {
  const { fs, dir, utf8 } = await loadFs()
  await fs.writeFile({
    path: INDEX_FILE,
    data: serializeTrackIndex(entries),
    directory: dir,
    encoding: utf8,
    recursive: true,
  })
}

/** 索引读-改-写串行化，避免并发保存互相覆盖 */
let indexChain: Promise<unknown> = Promise.resolve()
function withIndex<T>(fn: (entries: TrackIndexEntry[]) => Promise<T>): Promise<T> {
  const run = indexChain.then(async () => {
    const entries = await readIndex()
    return fn(entries)
  })
  indexChain = run.catch(() => undefined)
  return run
}

/** 相对路径 → WebView 可直接播放/展示的地址（经 App 内置文件服务） */
async function toRuntimeSrc(relPath: string): Promise<string> {
  const { fs, dir } = await loadFs()
  const { uri } = await fs.getUri({ path: relPath, directory: dir })
  return Capacitor.convertFileSrc(uri)
}

async function deleteFileQuiet(relPath: string | null): Promise<void> {
  if (!relPath) return
  const { fs, dir } = await loadFs()
  await fs.deleteFile({ path: relPath, directory: dir }).catch(() => undefined)
}

export const nativeTrackStore: TrackStore = {
  async saveTrack(rec: StoredTrack): Promise<void> {
    const fileName = (rec.blob as File).name || `${rec.key}.bin`
    const audioPath = audioRelPath(rec.key, fileName)
    await writeBlobChunked(audioPath, rec.blob)

    let coverPath: string | null = null
    let coverSize = 0
    if (rec.cover) {
      coverPath = coverRelPath(rec.key, rec.cover.type || 'image/jpeg')
      await writeBlobChunked(coverPath, rec.cover)
      coverSize = rec.cover.size
    }

    // 缩略图/中图（1.1.0）：导入时已生成则随曲目一并落盘，路径按 key 固定
    let thumbPath: string | null = null
    let thumbSize = 0
    if (rec.thumb) {
      thumbPath = thumbRelPath(rec.key)
      await writeBlobChunked(thumbPath, rec.thumb)
      thumbSize = rec.thumb.size
    }
    let midCoverPath: string | null = null
    let midCoverSize = 0
    if (rec.coverMid) {
      midCoverPath = midCoverRelPath(rec.key)
      await writeBlobChunked(midCoverPath, rec.coverMid)
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
      audioSize: rec.blob.size,
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
      // 同 key 覆盖保存且路径变化时，清掉旧文件避免孤儿
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
        // 封面原图顺带取回（海报生成与再次落盘需要）；失败按无封面处理，不阻断恢复
        coverBlob = await fetch(coverSrc)
          .then((r) => (r.ok ? r.blob() : null))
          .catch(() => null)
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
    // 先落文件再改索引：中途失败时索引仍指向旧状态，不会出现路径悬空
    let thumbPath: string | null = null
    let midCoverPath: string | null = null
    if (covers.thumb) {
      thumbPath = thumbRelPath(key)
      await writeBlobChunked(thumbPath, covers.thumb)
    }
    if (covers.coverMid) {
      midCoverPath = midCoverRelPath(key)
      await writeBlobChunked(midCoverPath, covers.coverMid)
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
    const { fs, dir } = await loadFs()
    await fs.rmdir({ path: TRACKS_DIR, directory: dir, recursive: true }).catch(() => undefined)
    await fs.rmdir({ path: COVERS_DIR, directory: dir, recursive: true }).catch(() => undefined)
    await fs.rmdir({ path: THUMBS_DIR, directory: dir, recursive: true }).catch(() => undefined)
    await fs.rmdir({ path: MIDCOVERS_DIR, directory: dir, recursive: true }).catch(() => undefined)
    await deleteFileQuiet(INDEX_FILE)
  },

  /** 占用 = 索引中记录的音频+封面字节数之和（落盘时实测，不含索引文件本身的微小体积） */
  async storageUsage(): Promise<number | null> {
    const entries = await readIndex()
    return totalIndexSize(entries)
  },
}
