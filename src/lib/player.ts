import type { PlayMode } from '../data/types'

export type Step = 1 | -1

/** 顺序步进（环形取模）；len<=0 返回 0 */
export function stepIndex(len: number, cur: number, step: Step): number {
  if (len <= 0) return 0
  return ((cur + step) % len + len) % len
}

/** 随机选一首（集合大于 1 时排除当前曲） */
export function shuffleIndex(len: number, cur: number): number {
  if (len <= 1) return 0
  let n = Math.floor(Math.random() * (len - 1))
  if (n >= cur) n += 1
  return n
}

export type TailAction =
  | { kind: 'next'; index: number }
  | { kind: 'replay' }
  | { kind: 'shuffle'; index: number }

/** 到达尾部时按模式决定收尾动作 */
export function onTail(mode: PlayMode, len: number, cur: number): TailAction {
  if (mode === 'repeat') return { kind: 'replay' }
  if (mode === 'shuffle') return { kind: 'shuffle', index: shuffleIndex(len, cur) }
  return { kind: 'next', index: stepIndex(len, cur, 1) }
}
