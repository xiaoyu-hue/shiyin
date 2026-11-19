/**
 * 本地曲目的浏览器持久化（IndexedDB）。
 * 只存音频 Blob 与元数据；blob URL 不持久化，每次启动重新生成。
 */
import type { LyricLine } from '../data/types'

const DB_NAME = 'shiyin'
const DB_VERSION = 1
const STORE = 'tracks'

export interface StoredTrack {
  key: string
  /** 曲目 id，持久化以保证刷新后收藏等引用关系不变 */
  id: number
  name: string
  artist: string
  album: string
  color: string
  dur: number
  blob: Blob
  addedAt: number
  /** 内嵌歌词（0.4.0 起）；旧记录无此字段，恢复时按无歌词处理 */
  lyrics?: LyricLine[]
  /** 内嵌封面图原图（0.4.0 起）；旧记录无此字段，恢复时按无封面处理 */
  cover?: Blob | null
  /** 封面缩略图（≤128px，1.1.0 起）；旧记录无此字段，恢复时异步补生成 */
  thumb?: Blob | null
  /** 封面中图（≤512px，1.1.0 起）；旧记录无此字段，恢复时异步补生成 */
  coverMid?: Blob | null
  /** 缩略图是否已生成/确认过（1.1.0 起）；旧记录无此字段视为未确认 */
  thumbDone?: boolean
}

function hasIDB(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  if (!hasIDB()) return Promise.reject(new Error('当前环境不支持本地存储'))
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const req = fn(tx.objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
        tx.oncomplete = () => db.close()
      }),
  )
}

export function saveTrack(rec: StoredTrack): Promise<IDBValidKey> {
  return run('readwrite', (store) => store.put(rec))
}

export function loadTracks(): Promise<StoredTrack[]> {
  return run<StoredTrack[]>('readonly', (store) => store.getAll() as IDBRequest<StoredTrack[]>).then(
    (list) => (Array.isArray(list) ? list.sort((a, b) => a.addedAt - b.addedAt) : []),
    () => [],
  )
}

export function deleteTrack(key: string): Promise<undefined> {
  return run<undefined>('readwrite', (store) => store.delete(key) as IDBRequest<undefined>)
}

/** 只更新某条记录的歌词字段（外挂歌词补挂用）；记录不存在时静默跳过 */
export async function updateTrackLyrics(key: string, lyrics: LyricLine[]): Promise<void> {
  if (!hasIDB()) return
  const db = await openDB()
  return new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const getReq = store.get(key)
    getReq.onsuccess = () => {
      const rec = getReq.result as StoredTrack | undefined
      if (rec) store.put({ ...rec, lyrics })
    }
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      resolve()
    }
  })
}

/** 只更新某条记录的缩略图字段并标记已确认（补图回存用）；记录不存在时静默跳过 */
export async function updateTrackCovers(
  key: string,
  covers: { thumb: Blob | null; coverMid: Blob | null },
): Promise<void> {
  if (!hasIDB()) return
  const db = await openDB()
  return new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const getReq = store.get(key)
    getReq.onsuccess = () => {
      const rec = getReq.result as StoredTrack | undefined
      if (rec) store.put({ ...rec, thumb: covers.thumb, coverMid: covers.coverMid, thumbDone: true })
    }
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      resolve()
    }
  })
}

export function clearTracks(): Promise<undefined> {
  return run<undefined>('readwrite', (store) => store.clear() as IDBRequest<undefined>)
}
