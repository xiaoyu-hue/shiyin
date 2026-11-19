/**
 * 封面缩略图的尺寸决策（纯逻辑，1.1.0）。
 *
 * 列表行实际只显示约 48px 的封面，却直接解码上千像素原图是滚动卡顿
 * 的头号来源。导入/恢复补图时按原图尺寸决定生成哪几档：
 * - thumb：最长边压到 128px，列表/菜单/队列等小图场景用；
 * - player：最长边压到 512px，播放页 256px 大封面用（2 倍图足够）；
 * 原图本身不大于目标档时不生成该档（放大没有意义，调用方回退原图）。
 */

export const THUMB_MAX = 128
export const PLAYER_MAX = 512

export interface ThumbPlan {
  /** 是否需要生成列表缩略图 */
  thumb: boolean
  /** 是否需要生成播放页中图 */
  player: boolean
}

/** 按原图尺寸决定要生成的档位；宽高非法（≤0/非有限）时都不生成 */
export function planThumbnails(width: number, height: number): ThumbPlan {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { thumb: false, player: false }
  }
  const maxDim = Math.max(width, height)
  return { thumb: maxDim > THUMB_MAX, player: maxDim > PLAYER_MAX }
}

/** 等比缩放后的尺寸：最长边压到 maxDim，永不放大；结果至少 1px */
export function scaledSize(width: number, height: number, maxDim: number): { w: number; h: number } {
  const maxSrc = Math.max(width, height)
  if (maxSrc <= maxDim || maxSrc <= 0) return { w: Math.max(1, Math.round(width)), h: Math.max(1, Math.round(height)) }
  const ratio = maxDim / maxSrc
  return {
    w: Math.max(1, Math.round(width * ratio)),
    h: Math.max(1, Math.round(height * ratio)),
  }
}
