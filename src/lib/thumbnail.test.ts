import { describe, expect, it } from 'vitest'
import { PLAYER_MAX, THUMB_MAX, planThumbnails, scaledSize } from './thumbnail'

describe('planThumbnails（缩略图档位决策）', () => {
  it('小图（≤128）两档都不生成', () => {
    expect(planThumbnails(128, 128)).toEqual({ thumb: false, player: false })
    expect(planThumbnails(100, 60)).toEqual({ thumb: false, player: false })
  })

  it('中图（129~512）只生成列表缩略图', () => {
    expect(planThumbnails(300, 200)).toEqual({ thumb: true, player: false })
    expect(planThumbnails(512, 512)).toEqual({ thumb: true, player: false })
  })

  it('大图（>512）两档都生成', () => {
    expect(planThumbnails(1000, 800)).toEqual({ thumb: true, player: true })
    expect(planThumbnails(513, 100)).toEqual({ thumb: true, player: true })
  })

  it('非法尺寸都不生成', () => {
    expect(planThumbnails(0, 100)).toEqual({ thumb: false, player: false })
    expect(planThumbnails(Number.NaN, 100)).toEqual({ thumb: false, player: false })
  })

  it('档位常量与方案一致', () => {
    expect(THUMB_MAX).toBe(128)
    expect(PLAYER_MAX).toBe(512)
  })
})

describe('scaledSize（等比缩放）', () => {
  it('最长边压到目标值且保持比例', () => {
    expect(scaledSize(1000, 500, 128)).toEqual({ w: 128, h: 64 })
    expect(scaledSize(500, 1000, 512)).toEqual({ w: 256, h: 512 })
  })

  it('原图小于目标时不放大', () => {
    expect(scaledSize(100, 80, 128)).toEqual({ w: 100, h: 80 })
  })

  it('极端比例下短边至少 1px', () => {
    expect(scaledSize(4000, 3, 128).h).toBe(1)
  })
})
