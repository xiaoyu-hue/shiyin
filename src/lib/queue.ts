/**
 * 播放队列的纯逻辑。队列是「曲目下标的排列」：下标指 tracks 数组位置，
 * 与历史记录、当前曲目用的是同一套坐标。队列内不允许重复下标，
 * 位置（queuePos）始终可用 queue.indexOf(cur) 由当前曲目反推。
 */

/** 自然顺序队列：0..len-1 */
export function naturalQueue(len: number): number[] {
  return Array.from({ length: len }, (_, i) => i)
}

/** 在队列中定位当前曲目；找不到（或队列为空）返回 0 */
export function posOf(queue: number[], trackIndex: number): number {
  const p = queue.indexOf(trackIndex)
  return p >= 0 ? p : 0
}

/** 「下一首播放」：把曲目移到当前播放位置的正后方（已在队列则移动，不在则插入；就是当前曲目时不动） */
export function insertNext(queue: number[], curPos: number, trackIndex: number): number[] {
  if (queue[curPos] === trackIndex) return queue
  const without = queue.filter((t) => t !== trackIndex)
  const curTrack = queue[curPos]
  const newCurPos = without.indexOf(curTrack)
  const insertAt = (newCurPos >= 0 ? newCurPos : curPos) + 1
  const out = [...without]
  out.splice(Math.min(insertAt, out.length), 0, trackIndex)
  return out
}

/** 加入队列末尾（已在队列则先移除再追加，保证不重复） */
export function appendToQueue(queue: number[], trackIndex: number): number[] {
  return [...queue.filter((t) => t !== trackIndex), trackIndex]
}

/** 拖拽重排：把 from 处的曲目移动到 to 处 */
export function moveInQueue(queue: number[], from: number, to: number): number[] {
  if (from === to || from < 0 || to < 0 || from >= queue.length || to >= queue.length) return queue
  const out = [...queue]
  const [item] = out.splice(from, 1)
  out.splice(to, 0, item)
  return out
}

/** 移除队列中某一位置的曲目 */
export function removeAtPos(queue: number[], pos: number): number[] {
  return queue.filter((_, i) => i !== pos)
}

/**
 * 删除一首曲目（tracks 数组下标 removed）后的下标重映射：
 * 等于 removed 的剔除，大于 removed 的减 1。队列与历史记录共用。
 */
export function remapAfterRemove(indices: number[], removed: number): number[] {
  const out: number[] = []
  for (const i of indices) {
    if (i === removed) continue
    out.push(i > removed ? i - 1 : i)
  }
  return out
}

/** 删除曲目后当前下标的重映射：删的就是当前曲时钳制到新数组范围内 */
export function remapCurrent(cur: number, removed: number, newLen: number): number {
  if (newLen <= 0) return 0
  if (cur > removed) return cur - 1
  if (cur === removed) return Math.min(cur, newLen - 1)
  return cur
}
