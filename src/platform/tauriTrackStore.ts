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
 * 索引管理与条目组装等共享逻辑在 platform/fileTrackStore.ts（审计 A-21），
 * 本文件只实现 Tauri 文件系统适配。插件用动态 import 加载，
 * 网页/安卓构建产物不包含其代码。
 */
import type { StoredTrack } from './idb'
import type { TrackStore } from './trackTypes'
import { createFileTrackStore, type FileTrackStoreAdapter } from './fileTrackStore'
import { COVERS_DIR, INDEX_FILE, MIDCOVERS_DIR, THUMBS_DIR, TRACKS_DIR } from '../lib/trackIndex'
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

/** Blob 整文件读入内存后一次写入（取舍说明见文件头） */
async function writeBlob(relPath: string, blob: Blob): Promise<void> {
  const { fs, appData } = await loadFs()
  const buf = new Uint8Array(await blob.arrayBuffer())
  await fs.writeFile(relPath, buf, { baseDir: appData })
}

/** 相对路径 → WebView 可直接播放/展示的 asset 协议地址 */
async function toRuntimeSrc(relPath: string): Promise<string> {
  const { core, path } = await loadFs()
  const abs = await path.join(await path.appDataDir(), relPath)
  return core.convertFileSrc(abs)
}

/** 封面文件扩展名 → MIME（读回 Blob 时标注用） */
function coverMime(relPath: string): string {
  if (relPath.endsWith('.png')) return 'image/png'
  if (relPath.endsWith('.webp')) return 'image/webp'
  if (relPath.endsWith('.gif')) return 'image/gif'
  return 'image/jpeg'
}

const tauriAdapter: FileTrackStoreAdapter = {
  /** 确保四个曲库子目录存在（recursive 创建，连带应用数据目录本身） */
  async ensureDirs(): Promise<void> {
    const { fs, appData } = await loadFs()
    for (const dir of [TRACKS_DIR, COVERS_DIR, THUMBS_DIR, MIDCOVERS_DIR]) {
      await fs.mkdir(dir, { baseDir: appData, recursive: true }).catch(() => undefined)
    }
  },

  async readIndexText(): Promise<string | null> {
    const { fs, appData } = await loadFs()
    try {
      return await fs.readTextFile(INDEX_FILE, { baseDir: appData })
    } catch {
      return null
    }
  },

  async writeIndexText(text: string): Promise<void> {
    const { fs, appData } = await loadFs()
    await fs.writeTextFile(INDEX_FILE, text, { baseDir: appData })
  },

  writeBlob,

  async saveAudio(rec: StoredTrack, audioPath: string): Promise<number> {
    // 音频落盘优先流式拷贝（源路径已知时）；回退整读仅作兜底
    const srcPath = srcPathOf(rec.blob as File)
    if (srcPath) {
      const { core } = await loadFs()
      return core.invoke<number>('copy_import_file', { srcPath, destRelPath: audioPath })
    }
    await writeBlob(audioPath, rec.blob)
    return rec.blob.size
  },

  async deleteFile(relPath: string): Promise<void> {
    const { fs, appData } = await loadFs()
    await fs.remove(relPath, { baseDir: appData }).catch(() => undefined)
  },

  async removeDir(relPath: string): Promise<void> {
    const { fs, appData } = await loadFs()
    await fs.remove(relPath, { baseDir: appData, recursive: true }).catch(() => undefined)
  },

  toRuntimeSrc,

  async readCover(relPath: string): Promise<Blob | null> {
    try {
      const { fs, appData } = await loadFs()
      const bytes = await fs.readFile(relPath, { baseDir: appData })
      return new Blob([bytes as BlobPart], { type: coverMime(relPath) })
    } catch {
      return null
    }
  },
}

export const tauriTrackStore: TrackStore = createFileTrackStore(tauriAdapter)
