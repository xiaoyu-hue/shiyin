/**
 * 文件型曲目存储的共享骨架（审计 A-21）：安卓（Capacitor）与桌面（Tauri）
 * 两套实现此前同构复制了索引管理、条目组装与局部更新逻辑（约 600 行），
 * 现收敛为本工厂——索引读改写串行化、保存/恢复/删除/歌词与封面回填、
 * 占用统计全部在此一处；平台差异（文件如何读写、地址如何转换、音频如何
 * 落盘）收敛为 FileTrackStoreAdapter 的小接口，由各平台模块实现。
 * 网页实现走 IndexedDB，模型不同，不在此列。
 */
import type { StoredTrack } from './idb'
import type { LoadedTrack, TrackStore } from './trackTypes'
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

export interface FileTrackStoreAdapter {
  /** 确保存储子目录存在（写文件自带建目录语义的平台可为空操作） */
  ensureDirs(): Promise<void>
  /** 读索引原文；不存在/读失败返回 null */
  readIndexText(): Promise<string | null>
  /** 写索引原文 */
  writeIndexText(text: string): Promise<void>
  /** 写小文件（封面/缩略图/中图） */
  writeBlob(relPath: string, blob: Blob): Promise<void>
  /** 音频落盘，返回实际落盘字节数 */
  saveAudio(rec: StoredTrack, audioPath: string): Promise<number>
  /** 删单个文件（不存在不报错） */
  deleteFile(relPath: string): Promise<void>
  /** 删整个子目录（不存在不报错） */
  removeDir(relPath: string): Promise<void>
  /** 相对路径 → 当前环境可直接播放/展示的地址 */
  toRuntimeSrc(relPath: string): Promise<string>
  /** 读回封面原图 Blob（失败返回 null，不阻断恢复） */
  readCover(relPath: string): Promise<Blob | null>
}

export function createFileTrackStore(adapter: FileTrackStoreAdapter): TrackStore {
  async function readIndex(): Promise<TrackIndexEntry[]> {
    try {
      return parseTrackIndex(await adapter.readIndexText())
    } catch {
      return []
    }
  }

  function writeIndex(entries: TrackIndexEntry[]): Promise<void> {
    return adapter.writeIndexText(serializeTrackIndex(entries))
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

  return {
    async saveTrack(rec: StoredTrack): Promise<void> {
      await adapter.ensureDirs()
      const fileName = (rec.blob as File).name || `${rec.key}.bin`
      const audioPath = audioRelPath(rec.key, fileName)
      const audioSize = await adapter.saveAudio(rec, audioPath)

      let coverPath: string | null = null
      let coverSize = 0
      if (rec.cover) {
        coverPath = coverRelPath(rec.key, rec.cover.type || 'image/jpeg')
        await adapter.writeBlob(coverPath, rec.cover)
        coverSize = rec.cover.size
      }

      let thumbPath: string | null = null
      let thumbSize = 0
      if (rec.thumb) {
        thumbPath = thumbRelPath(rec.key)
        await adapter.writeBlob(thumbPath, rec.thumb)
        thumbSize = rec.thumb.size
      }
      let midCoverPath: string | null = null
      let midCoverSize = 0
      if (rec.coverMid) {
        midCoverPath = midCoverRelPath(rec.key)
        await adapter.writeBlob(midCoverPath, rec.coverMid)
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
        // 同 key 覆盖保存且路径变化时，清掉旧文件避免孤儿
        if (old && old.audioPath !== audioPath) await adapter.deleteFile(old.audioPath)
        if (old && old.coverPath && old.coverPath !== coverPath) await adapter.deleteFile(old.coverPath)
        if (old && old.thumbPath && old.thumbPath !== thumbPath) await adapter.deleteFile(old.thumbPath)
        if (old && old.midCoverPath && old.midCoverPath !== midCoverPath) await adapter.deleteFile(old.midCoverPath)
      })
    },

    async loadTracks(): Promise<LoadedTrack[]> {
      const entries = await readIndex()
      const out: LoadedTrack[] = []
      for (const e of entries) {
        const audioSrc = await adapter.toRuntimeSrc(e.audioPath)
        let coverSrc: string | null = null
        let coverBlob: Blob | null = null
        if (e.coverPath) {
          coverSrc = await adapter.toRuntimeSrc(e.coverPath)
          // 封面原图顺带取回（海报生成与再次落盘需要）；失败按无封面处理，不阻断恢复
          coverBlob = await adapter.readCover(e.coverPath)
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
          thumbSrc: e.thumbPath ? await adapter.toRuntimeSrc(e.thumbPath) : null,
          midCoverSrc: e.midCoverPath ? await adapter.toRuntimeSrc(e.midCoverPath) : null,
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
        await adapter.deleteFile(removed.audioPath)
        if (removed.coverPath) await adapter.deleteFile(removed.coverPath)
        if (removed.thumbPath) await adapter.deleteFile(removed.thumbPath)
        if (removed.midCoverPath) await adapter.deleteFile(removed.midCoverPath)
      })
    },

    async updateTrackLyrics(key: string, lyrics): Promise<void> {
      await withIndex(async (entries) => {
        const entry = entries.find((e) => e.key === key)
        if (!entry) return
        entry.lyrics = lyrics
        await writeIndex(entries)
      })
    },

    async updateTrackCovers(key: string, covers): Promise<void> {
      await adapter.ensureDirs()
      // 先落文件再改索引：中途失败时索引仍指向旧状态，不会出现路径悬空
      let thumbPath: string | null = null
      let midCoverPath: string | null = null
      if (covers.thumb) {
        thumbPath = thumbRelPath(key)
        await adapter.writeBlob(thumbPath, covers.thumb)
      }
      if (covers.coverMid) {
        midCoverPath = midCoverRelPath(key)
        await adapter.writeBlob(midCoverPath, covers.coverMid)
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
        if (oldThumb && oldThumb !== thumbPath) await adapter.deleteFile(oldThumb)
        if (oldMid && oldMid !== midCoverPath) await adapter.deleteFile(oldMid)
      })
    },

    async clearTracks(): Promise<void> {
      for (const dir of [TRACKS_DIR, COVERS_DIR, THUMBS_DIR, MIDCOVERS_DIR]) {
        await adapter.removeDir(dir)
      }
      await adapter.deleteFile(INDEX_FILE)
    },

    /** 占用 = 索引中记录的音频+封面字节数之和（落盘时实测，不含索引文件本身的微小体积） */
    async storageUsage(): Promise<number | null> {
      const entries = await readIndex()
      return totalIndexSize(entries)
    },
  }
}
