/**
 * 封面缩略图生成（浏览器侧，1.1.0）：把封面原图 Blob 解码后按
 * lib/thumbnail 的档位决策画到 canvas，输出 JPEG Blob。
 * - thumb（≤128）供列表/菜单等小图；player（≤512）供播放页大封面；
 * - 原图不大于对应档位时该档为 null（调用方回退原图，不放大）；
 * - 任何失败（解码/绘制/编码）整体返回 null，调用方按无缩略图处理，
 *   绝不阻断导入与恢复。
 */
import { PLAYER_MAX, THUMB_MAX, planThumbnails, scaledSize } from './thumbnail'

export interface CoverThumbs {
  thumb: Blob | null
  player: Blob | null
}

async function decode(blob: Blob): Promise<{ draw: CanvasImageSource; w: number; h: number; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    const bmp = await createImageBitmap(blob)
    return { draw: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() }
  }
  const url = URL.createObjectURL(blob)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('封面解码失败'))
      el.src = url
    })
    return { draw: img, w: img.naturalWidth, h: img.naturalHeight, close: () => URL.revokeObjectURL(url) }
  } catch (err) {
    URL.revokeObjectURL(url)
    throw err
  }
}

function renderVariant(draw: CanvasImageSource, w: number, h: number, maxDim: number): Promise<Blob | null> {
  const { w: tw, h: th } = scaledSize(w, h, maxDim)
  const canvas = document.createElement('canvas')
  canvas.width = tw
  canvas.height = th
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve(null)
  ctx.drawImage(draw, 0, 0, tw, th)
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85)
  })
}

/** 由封面原图生成各档缩略图；不需要或失败时对应档为 null */
export async function generateCoverThumbs(cover: Blob): Promise<CoverThumbs | null> {
  try {
    const decoded = await decode(cover)
    try {
      const plan = planThumbnails(decoded.w, decoded.h)
      if (!plan.thumb && !plan.player) return { thumb: null, player: null }
      const thumb = plan.thumb ? await renderVariant(decoded.draw, decoded.w, decoded.h, THUMB_MAX) : null
      const player = plan.player ? await renderVariant(decoded.draw, decoded.w, decoded.h, PLAYER_MAX) : null
      return { thumb, player }
    } finally {
      decoded.close()
    }
  } catch {
    return null
  }
}
