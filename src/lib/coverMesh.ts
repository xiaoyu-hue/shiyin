/**
 * 封面 mesh 氛围背景（1.4.0，取代 1.1.0 的预模糊位图 blurBackdrop）。
 *
 * 切歌时把封面一次性画成小尺寸弥散渐变位图：重模糊铺底 + 两处调色板
 * 径向光斑（左上鲜明色、右下同色系），每首歌有自己的氛围场。产物是静态
 * 位图（dataURL），铺满后零每帧成本——护栏：禁止逐帧现算模糊，氛围一律
 * 走这种预生成位图或纯渐变。缓存按「曲目 id + 源地址」留 8 张（FIFO）。
 */
import { dominantColor, paletteFromDominant, rgbCss, type CoverPalette } from './coverColor'
import { PromiseCache } from './promiseCache'

/** mesh 位图边长（px）：够小才够弥散，够大不至于色块化 */
export const MESH_SIZE = 144
/** 内存缓存上限（张） */
export const MESH_CACHE_LIMIT = 8

export function meshCacheKey(trackId: number, src: string): string {
  return `${trackId}|${src}`
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('封面图加载失败'))
    img.src = src
  })
}

/** 从已加载的封面图提取调色板（24px 采样，与光晕取色同口径） */
function extractPalette(img: HTMLImageElement): CoverPalette | null {
  try {
    const size = 24
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, size, size)
    const dom = dominantColor(ctx.getImageData(0, 0, size, size).data)
    return dom ? paletteFromDominant(dom) : null
  } catch {
    return null
  }
}

const cache = new PromiseCache<string | null>(MESH_CACHE_LIMIT)

/**
 * 取某首歌的 mesh 氛围图（dataURL）；失败返回 null，调用方回退纯渐变。
 * 同一键并发调用共享同一次生成。
 */
export function getCoverMesh(trackId: number, src: string): Promise<string | null> {
  const key = meshCacheKey(trackId, src)
  return cache.getOrCreate(key, async (): Promise<string | null> => {
    try {
      const img = await loadImage(src)
      const palette = extractPalette(img)
      const S = MESH_SIZE
      const canvas = document.createElement('canvas')
      canvas.width = S
      canvas.height = S
      const ctx = canvas.getContext('2d')
      if (!ctx) return null

      // 深底打底（无调色板时用中性深灰兜底）
      ctx.fillStyle = palette ? rgbCss(palette.deep) : '#3a352e'
      ctx.fillRect(0, 0, S, S)

      // 封面弥散铺底：先把封面缩到 18px 再平滑拉回大幅面，插值天然把
      // 细节糊成色雾——全引擎通用，不依赖 ctx.filter（旧 WebView 无此 API）
      const tiny = document.createElement('canvas')
      tiny.width = 18
      tiny.height = 18
      const tctx = tiny.getContext('2d')
      if (tctx) {
        const ts = Math.max(18 / img.naturalWidth, 18 / img.naturalHeight)
        tctx.drawImage(
          img,
          (18 - img.naturalWidth * ts) / 2,
          (18 - img.naturalHeight * ts) / 2,
          img.naturalWidth * ts,
          img.naturalHeight * ts,
        )
        ctx.imageSmoothingEnabled = true
        ctx.drawImage(tiny, -16, -16, S + 32, S + 32)
      }

      if (palette) {
        // 左上鲜明光斑 + 右下同色光斑，构成 mesh 的色彩张力
        const g1 = ctx.createRadialGradient(S * 0.28, S * 0.2, 0, S * 0.28, S * 0.2, S * 0.75)
        g1.addColorStop(0, rgbCss(palette.vivid, 0.55))
        g1.addColorStop(1, rgbCss(palette.vivid, 0))
        ctx.fillStyle = g1
        ctx.fillRect(0, 0, S, S)
        const g2 = ctx.createRadialGradient(S * 0.85, S * 0.9, 0, S * 0.85, S * 0.9, S * 0.7)
        g2.addColorStop(0, rgbCss(palette.vivid, 0.32))
        g2.addColorStop(1, rgbCss(palette.vivid, 0))
        ctx.fillStyle = g2
        ctx.fillRect(0, 0, S, S)
      }

      return canvas.toDataURL('image/jpeg', 0.85)
    } catch {
      return null
    }
  })
}
