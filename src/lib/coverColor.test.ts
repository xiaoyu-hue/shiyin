import { describe, expect, it } from 'vitest'
import { dominantColor, paletteFromDominant, parseHexColor, rgbCss, scaleColor, softenColor } from './coverColor'

/** 构造纯色 RGBA 像素数据 */
function solid(r: number, g: number, b: number, n = 16): Uint8ClampedArray {
  const data = new Uint8ClampedArray(n * 4)
  for (let i = 0; i < n; i++) {
    data[i * 4] = r
    data[i * 4 + 1] = g
    data[i * 4 + 2] = b
    data[i * 4 + 3] = 255
  }
  return data
}

describe('dominantColor 主色提取', () => {
  it('纯色封面返回该色', () => {
    expect(dominantColor(solid(184, 61, 90))).toEqual({ r: 184, g: 61, b: 90 })
  })

  it('大面积灰白 + 少量鲜明色时取鲜明色', () => {
    const gray = solid(220, 220, 220, 90)
    const red = solid(200, 40, 40, 10)
    const data = new Uint8ClampedArray(gray.length + red.length)
    data.set(gray)
    data.set(red, gray.length)
    const c = dominantColor(data)
    expect(c).toEqual({ r: 200, g: 40, b: 40 })
  })

  it('全灰封面退回全体平均', () => {
    expect(dominantColor(solid(128, 128, 128))).toEqual({ r: 128, g: 128, b: 128 })
  })

  it('全透明或空数据返回 null', () => {
    expect(dominantColor(new Uint8ClampedArray(0))).toBeNull()
    expect(dominantColor(new Uint8ClampedArray(16))).toBeNull()
  })
})

describe('softenColor 与 rgbCss', () => {
  it('向白色混合变柔和', () => {
    expect(softenColor({ r: 100, g: 100, b: 100 }, 0.5)).toEqual({ r: 178, g: 178, b: 178 })
    expect(softenColor({ r: 255, g: 255, b: 255 })).toEqual({ r: 255, g: 255, b: 255 })
  })

  it('输出 CSS 颜色字符串', () => {
    expect(rgbCss({ r: 1, g: 2, b: 3 })).toBe('rgb(1, 2, 3)')
    expect(rgbCss({ r: 1, g: 2, b: 3 }, 0.5)).toBe('rgba(1, 2, 3, 0.5)')
  })
})

describe('parseHexColor 兜底色解析', () => {
  it('解析 #RRGGBB', () => {
    expect(parseHexColor('#B83D5A')).toEqual({ r: 184, g: 61, b: 90 })
    expect(parseHexColor('365FA3')).toEqual({ r: 54, g: 95, b: 163 })
  })

  it('非法输入返回 null', () => {
    expect(parseHexColor('#12345')).toBeNull()
    expect(parseHexColor('red')).toBeNull()
    expect(parseHexColor('')).toBeNull()
  })
})

describe('scaleColor 与 paletteFromDominant（1.4.0 mesh 氛围调色板）', () => {
  it('按比例压暗并钳制', () => {
    expect(scaleColor({ r: 200, g: 100, b: 50 }, 0.5)).toEqual({ r: 100, g: 50, b: 25 })
    expect(scaleColor({ r: 200, g: 100, b: 50 }, 2)).toEqual({ r: 255, g: 200, b: 100 })
    expect(scaleColor({ r: 10, g: 10, b: 10 }, -1)).toEqual({ r: 0, g: 0, b: 0 })
  })

  it('调色板：鲜明色轻柔化、深底色压到 45%', () => {
    const p = paletteFromDominant({ r: 184, g: 61, b: 90 })
    expect(p.deep).toEqual({ r: 83, g: 27, b: 41 })
    // vivid = 向白混 12%：每通道都比原色亮
    expect(p.vivid.r).toBeGreaterThan(184)
    expect(p.vivid.g).toBeGreaterThan(61)
    expect(p.vivid.b).toBeGreaterThan(90)
  })
})
