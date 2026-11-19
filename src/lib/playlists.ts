import type { Playlist } from '../data/types'

/**
 * 自建歌单的纯逻辑：序列化/清洗与增删改操作（全部不可变，返回新数组）。
 * 持久化介质是 localStorage（platform/prefs.ts），这里只管数据本身。
 */

/** 清洗一份未知数据为合法歌单数组：丢弃结构不合法的歌单，曲目 id 去重保序 */
export function cleanPlaylists(list: unknown): Playlist[] {
  if (!Array.isArray(list)) return []
  const out: Playlist[] = []
  const seenPlaylistIds = new Set<string>()
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue
    const p = raw as Record<string, unknown>
    const id = typeof p.id === 'string' ? p.id.trim() : ''
    const name = typeof p.name === 'string' ? p.name.trim() : ''
    if (!id || !name || seenPlaylistIds.has(id)) continue
    seenPlaylistIds.add(id)
    const trackIds: number[] = []
    const seenTracks = new Set<number>()
    if (Array.isArray(p.trackIds)) {
      for (const v of p.trackIds) {
        if (typeof v === 'number' && Number.isInteger(v) && v > 0 && !seenTracks.has(v)) {
          seenTracks.add(v)
          trackIds.push(v)
        }
      }
    }
    out.push({
      id,
      name,
      trackIds,
      createdAt: typeof p.createdAt === 'number' && Number.isFinite(p.createdAt) ? p.createdAt : 0,
    })
  }
  return out
}

export function serializePlaylists(list: Playlist[]): string {
  return JSON.stringify({ v: 1, playlists: cleanPlaylists(list) })
}

/** 解析落盘原文；格式不对时返回空数组（歌单丢了不能让应用崩） */
export function parsePlaylists(raw: string | null): Playlist[] {
  if (!raw) return []
  try {
    const data = JSON.parse(raw) as Record<string, unknown>
    return cleanPlaylists(data?.playlists)
  } catch {
    return []
  }
}

/** 新建歌单（id 由时间戳+随机后缀组成，避免碰撞） */
export function newPlaylist(name: string, now: number): Playlist {
  return {
    id: `pl-${now.toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    name: name.trim(),
    trackIds: [],
    createdAt: now,
  }
}

export function renameInList(list: Playlist[], id: string, name: string): Playlist[] {
  const trimmed = name.trim()
  if (!trimmed) return list
  return list.map((p) => (p.id === id ? { ...p, name: trimmed } : p))
}

export function removeFromList(list: Playlist[], id: string): Playlist[] {
  return list.filter((p) => p.id !== id)
}

/** 把曲目加入歌单（已在则不动，保持原顺序；新歌追加到末尾） */
export function addTrackToList(list: Playlist[], id: string, trackId: number): Playlist[] {
  return list.map((p) =>
    p.id === id && !p.trackIds.includes(trackId) ? { ...p, trackIds: [...p.trackIds, trackId] } : p,
  )
}

export function removeTrackFromList(list: Playlist[], id: string, trackId: number): Playlist[] {
  return list.map((p) => (p.id === id ? { ...p, trackIds: p.trackIds.filter((t) => t !== trackId) } : p))
}

/** 从所有歌单中剔除某曲目（删歌时的连带清理） */
export function purgeTrackFromAll(list: Playlist[], trackId: number): Playlist[] {
  return list.map((p) =>
    p.trackIds.includes(trackId) ? { ...p, trackIds: p.trackIds.filter((t) => t !== trackId) } : p,
  )
}
