import { afterEach, describe, expect, it, vi } from 'vitest'

// 可控的 Capacitor 原生判定：env.ts 的 getRuntimeEnv 先查 capacitor，
// 用模块 mock 把这条通道捏在手里，逐环境验证布局映射
const capState = vi.hoisted(() => ({ native: false }))
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => capState.native },
}))

import { getLayoutMode, resolveLayoutMode } from './layout'

afterEach(() => {
  capState.native = false
  vi.unstubAllGlobals()
})

describe('resolveLayoutMode（纯映射）', () => {
  it('tauri → desktop', () => {
    expect(resolveLayoutMode('tauri')).toBe('desktop')
  })

  it('capacitor → mobile（安卓永远手机布局）', () => {
    expect(resolveLayoutMode('capacitor')).toBe('mobile')
  })

  it('web → mobile（网页永远手机布局）', () => {
    expect(resolveLayoutMode('web')).toBe('mobile')
  })
})

describe('getLayoutMode（经环境判定）', () => {
  it('Capacitor 原生环境 → mobile', () => {
    capState.native = true
    expect(getLayoutMode()).toBe('mobile')
  })

  it('注入 __TAURI_INTERNALS__ → desktop', () => {
    vi.stubGlobal('window', { __TAURI_INTERNALS__: {} })
    expect(getLayoutMode()).toBe('desktop')
  })

  it('普通网页（无注入）→ mobile', () => {
    vi.stubGlobal('window', {})
    expect(getLayoutMode()).toBe('mobile')
  })

  it('Capacitor 优先于 Tauri 注入（判定顺序与 env.ts 一致）', () => {
    capState.native = true
    vi.stubGlobal('window', { __TAURI_INTERNALS__: {} })
    expect(getLayoutMode()).toBe('mobile')
  })
})
