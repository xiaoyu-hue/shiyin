/**
 * 封面取色：从专辑封面提取主色，用于播放页光晕背景与玻璃染色。
 * 纯计算部分（像素统计）与浏览器取图部分分离，前者可单测。
 */

export interface Rgb {
  r: number
  g: number
  b: number
}

/** 像素的饱和度（0~1），用于判断颜色是否"鲜明" */
function saturationOf(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === 0) return 0
  return (max - min) / max
}

/**
 * 从 RGBA 像素数据中提取主色：
 * 优先统计鲜明像素（饱和度 ≥ 0.18 且明度适中）的平均色，避免灰白封面把结果冲淡；
 * 鲜明像素太少时退回全体像素平均。无有效像素返回 null。
 */
export function dominantColor(data: Uint8ClampedArray): Rgb | null {
  let vr = 0
  let vg = 0
  let vb = 0
  let vn = 0
  let ar = 0
  let ag = 0
  let ab = 0
  let an = 0
  for (let i = 0; i + 4 <= data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]
    if (a < 200) continue
    ar += r
    ag += g
    ab += b
    an += 1
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    if (saturationOf(r, g, b) >= 0.18 && max <= 245 && min >= 10) {
      vr += r
      vg += g
      vb += b
      vn += 1
    }
  }
  if (an === 0) return null
  // 鲜明像素占比超过 5% 才采用鲜明平均，否则用全体平均
  if (vn > 0 && vn / an >= 0.05) {
    return { r: Math.round(vr / vn), g: Math.round(vg / vn), b: Math.round(vb / vn) }
  }
  return { r: Math.round(ar / an), g: Math.round(ag / an), b: Math.round(ab / an) }
}

/** 把主色调亮并降低强度，得到适合做背景光晕的柔和色 */
export function softenColor(c: Rgb, mix = 0.35): Rgb {
  const toward = 255
  return {
    r: Math.round(c.r + (toward - c.r) * mix),
    g: Math.round(c.g + (toward - c.g) * mix),
    b: Math.round(c.b + (toward - c.b) * mix),
  }
}

export function rgbCss(c: Rgb, alpha?: number): string {
  return alpha === undefined ? `rgb(${c.r}, ${c.g}, ${c.b})` : `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`
}

/** 按比例缩放颜色（factor<1 压暗、>1 提亮，结果钳制到 0–255） */
export function scaleColor(c: Rgb, factor: number): Rgb {
  const cl = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return { r: cl(c.r * factor), g: cl(c.g * factor), b: cl(c.b * factor) }
}

/** 氛围调色板：由封面主色派生「鲜明色 + 深底色」两色，供 mesh 氛围背景叠色 */
export interface CoverPalette {
  vivid: Rgb
  deep: Rgb
}

export function paletteFromDominant(dom: Rgb): CoverPalette {
  return {
    vivid: softenColor(dom, 0.12),
    deep: scaleColor(dom, 0.45),
  }
}

/** 解析 #RRGGBB 颜色（曲目兜底色 song.color 的格式），失败返回 null */
export function parseHexColor(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

const cache = new Map<string, Promise<string | null>>()

/**
 * 从封面图地址提取柔和主色（CSS rgb 字符串）。结果按地址缓存；
 * 取图或解析失败返回 null，调用方回退曲目自带颜色。
 */
export function extractCoverGlow(src: string): Promise<string | null> {
  const hit = cache.get(src)
  if (hit) return hit
  const job = (async (): Promise<string | null> => {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('封面图加载失败'))
        img.src = src
      })
      const size = 24
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      ctx.drawImage(img, 0, 0, size, size)
      const data = ctx.getImageData(0, 0, size, size).data
      const dom = dominantColor(data)
      return dom ? rgbCss(softenColor(dom)) : null
    } catch {
      return null
    }
  })()
  cache.set(src, job)
  return job
}
