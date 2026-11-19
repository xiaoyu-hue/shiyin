/**
 * 预模糊氛围背景（1.1.0）：播放页/歌词页的大面积封面氛围背景。
 *
 * 原实现用 CSS blur-3xl 对原图实时模糊铺满整屏，每帧重算代价高。
 * 改法：切歌时把封面缩到约 56px 宽画一次到 canvas，得到一张本身
 * 就糊的小位图（dataURL），铺满放大时天然更糊，之后是静态图片、
 * 零每帧成本。结果按「曲目 id + 源地址」在内存缓存，最多留 8 张。
 */

/** 预模糊位图的目标宽度（px）：足够小才够糊，又不至于色块化 */
export const BLUR_TARGET_W = 56
/** 内存缓存上限（张），超出按先进先出淘汰 */
export const BLUR_CACHE_LIMIT = 8

/** 缓存键：曲目 id 与源地址共同决定（同一首歌换了封面源也要重算） */
export function blurCacheKey(trackId: number, src: string): string {
  return `${trackId}|${src}`
}

/** 等比缩放：把图压到目标宽度（永不放大），返回画布尺寸 */
export function blurCanvasSize(naturalW: number, naturalH: number, targetW = BLUR_TARGET_W): { w: number; h: number } {
  if (!Number.isFinite(naturalW) || !Number.isFinite(naturalH) || naturalW <= 0 || naturalH <= 0) {
    return { w: targetW, h: targetW }
  }
  const w = Math.min(targetW, naturalW)
  const h = Math.max(1, Math.round((naturalH * w) / naturalW))
  return { w, h }
}

const cache = new Map<string, Promise<string | null>>()

/**
 * 取某首歌的预模糊背景图（dataURL）；加载/绘制失败返回 null，
 * 调用方回退纯渐变背景。同一键并发调用共享同一次生成。
 */
export function getBlurredBackdrop(trackId: number, src: string): Promise<string | null> {
  const key = blurCacheKey(trackId, src)
  const hit = cache.get(key)
  if (hit) return hit
  const job = (async (): Promise<string | null> => {
    try {
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('封面图加载失败'))
        img.src = src
      })
      const { w, h } = blurCanvasSize(img.naturalWidth, img.naturalHeight)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      ctx.drawImage(img, 0, 0, w, h)
      return canvas.toDataURL('image/jpeg', 0.82)
    } catch {
      return null
    }
  })()
  cache.set(key, job)
  while (cache.size > BLUR_CACHE_LIMIT) {
    const oldest = cache.keys().next().value
    if (oldest === undefined) break
    cache.delete(oldest)
  }
  return job
}
