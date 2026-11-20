import { describe, it, expect } from 'vitest'
import {
  springSheet,
  springDrawer,
  springBar,
  springGentle,
  springSnappy,
  scrimTransition,
  fadeTransition,
  pageTransition,
  TOAST_DURATION_MS,
} from './motion'

const springs = { springSheet, springDrawer, springBar, springGentle, springSnappy }

describe('动效令牌（1.4.0 收口）', () => {
  it('弹簧家族齐全且都是 spring 类型、参数为正数', () => {
    for (const [name, s] of Object.entries(springs)) {
      expect(s.type, name).toBe('spring')
      expect(s.stiffness, name).toBeGreaterThan(0)
      expect(s.damping, name).toBeGreaterThan(0)
    }
  })

  it('抽屉弹簧只有一组（同种抽屉不许再分叉）', () => {
    // 队列/菜单/睡眠/海报共用 springDrawer；条与页是不同语义，参数可不同
    expect(springDrawer).toEqual({ type: 'spring', stiffness: 300, damping: 30 })
    expect(springSheet).toEqual({ type: 'spring', stiffness: 320, damping: 34 })
  })

  it('遮罩与淡入时长成规', () => {
    expect(scrimTransition.duration).toBe(0.18)
    expect(fadeTransition.duration).toBe(0.2)
    expect(pageTransition.duration).toBeGreaterThan(0)
  })

  it('Toast 停留时长为正且在可读区间（1.5s–3s）', () => {
    expect(TOAST_DURATION_MS).toBeGreaterThanOrEqual(1500)
    expect(TOAST_DURATION_MS).toBeLessThanOrEqual(3000)
  })
})
