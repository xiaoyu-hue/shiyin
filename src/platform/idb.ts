/**
 * 本地曲目的浏览器持久化（IndexedDB）。
 * 只存音频 Blob 与元数据；blob URL 不持久化，每次启动重新生成。
 */

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

export function clearTracks(): Promise<undefined> {
  return run<undefined>('readwrite', (store) => store.clear() as IDBRequest<undefined>)
}
