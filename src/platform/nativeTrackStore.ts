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
 * 索引管理与条目组装等共享逻辑在 platform/fileTrackStore.ts（审计 A-21），
 * 本文件只实现 Capacitor 文件系统适配。插件用动态 import 加载，
 * 网页构建产物不包含其代码。
 */
import { Capacitor } from '@capacitor/core'
import type {
  Directory as DirectoryType,
  Encoding as EncodingType,
  Filesystem as FilesystemType,
} from '@capacitor/filesystem'
import type { StoredTrack } from './idb'
import type { TrackStore } from './trackTypes'
import { createFileTrackStore, type FileTrackStoreAdapter } from './fileTrackStore'
import { INDEX_FILE } from '../lib/trackIndex'

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

/** 把 Blob 分块写入指定相对路径（首块 writeFile，其余 appendFile；recursive 自带建目录） */
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

/** 相对路径 → WebView 可直接播放/展示的地址（经 App 内置文件服务） */
async function toRuntimeSrc(relPath: string): Promise<string> {
  const { fs, dir } = await loadFs()
  const { uri } = await fs.getUri({ path: relPath, directory: dir })
  return Capacitor.convertFileSrc(uri)
}

const nativeAdapter: FileTrackStoreAdapter = {
  /** writeFile 带 recursive，目录自动创建，无需预建 */
  async ensureDirs(): Promise<void> {},

  async readIndexText(): Promise<string | null> {
    const { fs, dir, utf8 } = await loadFs()
    try {
      const res = await fs.readFile({ path: INDEX_FILE, directory: dir, encoding: utf8 })
      return typeof res.data === 'string' ? res.data : null
    } catch {
      return null
    }
  },

  async writeIndexText(text: string): Promise<void> {
    const { fs, dir, utf8 } = await loadFs()
    await fs.writeFile({ path: INDEX_FILE, data: text, directory: dir, encoding: utf8, recursive: true })
  },

  writeBlob: writeBlobChunked,

  async saveAudio(rec: StoredTrack, audioPath: string): Promise<number> {
    await writeBlobChunked(audioPath, rec.blob)
    return rec.blob.size
  },

  async deleteFile(relPath: string): Promise<void> {
    const { fs, dir } = await loadFs()
    await fs.deleteFile({ path: relPath, directory: dir }).catch(() => undefined)
  },

  async removeDir(relPath: string): Promise<void> {
    const { fs, dir } = await loadFs()
    await fs.rmdir({ path: relPath, directory: dir, recursive: true }).catch(() => undefined)
  },

  toRuntimeSrc,

  async readCover(relPath: string): Promise<Blob | null> {
    const src = await toRuntimeSrc(relPath)
    return fetch(src)
      .then((r) => (r.ok ? r.blob() : null))
      .catch(() => null)
  },
}

export const nativeTrackStore: TrackStore = createFileTrackStore(nativeAdapter)
