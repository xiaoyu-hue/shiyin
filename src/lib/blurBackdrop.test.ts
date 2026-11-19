import { describe, expect, it } from 'vitest'
import { BLUR_TARGET_W, blurCacheKey, blurCanvasSize } from './blurBackdrop'

describe('blurCacheKey（预模糊缓存键）', () => {
  it('由曲目 id 与源地址共同组成', () => {
    expect(blurCacheKey(1001, 'blob:x')).toBe('1001|blob:x')
    expect(blurCacheKey(1001, 'blob:x')).not.toBe(blurCacheKey(1002, 'blob:x'))
    expect(blurCacheKey(1001, 'blob:x')).not.toBe(blurCacheKey(1001, 'blob:y'))
  })
})

describe('blurCanvasSize（预模糊画布尺寸）', () => {
  it('大图压到目标宽度并保持比例', () => {
    expect(blurCanvasSize(1000, 500)).toEqual({ w: BLUR_TARGET_W, h: BLUR_TARGET_W / 2 })
    expect(blurCanvasSize(500, 1000)).toEqual({ w: BLUR_TARGET_W, h: BLUR_TARGET_W * 2 })
  })

  it('小图不放大', () => {
    expect(blurCanvasSize(40, 30)).toEqual({ w: 40, h: 30 })
  })

  it('非法尺寸回退正方形', () => {
    expect(blurCanvasSize(0, 0)).toEqual({ w: BLUR_TARGET_W, h: BLUR_TARGET_W })
    expect(blurCanvasSize(Number.NaN, 100)).toEqual({ w: BLUR_TARGET_W, h: BLUR_TARGET_W })
  })

  it('极端比例下高度至少 1px', () => {
    expect(blurCanvasSize(10000, 1).h).toBe(1)
  })
})
