/**
 * 桌面自动更新状态机测试（审计 A-37）：依赖经 UpdateDeps 注入桩，
 * 模块状态用 vi.resetModules + 动态 import 逐例重置。
 */
import { describe, expect, it, vi } from 'vitest'
import type { UpdateDeps, UpdateHandle } from './tauriUpdate'

async function freshModule() {
  vi.resetModules()
  return import('./tauriUpdate')
}

function deps(over: Partial<UpdateDeps> = {}): UpdateDeps {
  return {
    isTauri: () => true,
    check: async () => null,
    relaunch: vi.fn(async () => undefined),
    ...over,
  }
}

function fakeUpdate(over: Partial<UpdateHandle> = {}): UpdateHandle {
  return {
    version: '9.9.9',
    downloadAndInstall: async () => undefined,
    ...over,
  }
}

describe('tauriUpdate 状态机', () => {
  it('非 Tauri 环境检查为空操作，状态保持 idle', async () => {
    const m = await freshModule()
    const d = deps({ isTauri: () => false, check: vi.fn(async () => fakeUpdate()) })
    await m.checkForUpdate(d)
    expect(m.getUpdateStatus()).toEqual({ kind: 'idle' })
    expect(d.check).not.toHaveBeenCalled()
  })

  it('无更新时落 latest', async () => {
    const m = await freshModule()
    await m.checkForUpdate(deps())
    expect(m.getUpdateStatus()).toEqual({ kind: 'latest' })
  })

  it('有更新时落 available 并带版本号；并发检查合并为一次', async () => {
    const m = await freshModule()
    const check = vi.fn(async () => fakeUpdate())
    const d = deps({ check })
    await Promise.all([m.checkForUpdate(d), m.checkForUpdate(d)])
    expect(check).toHaveBeenCalledTimes(1)
    expect(m.getUpdateStatus()).toEqual({ kind: 'available', version: '9.9.9' })
  })

  it('检查抛错时落 error', async () => {
    const m = await freshModule()
    const d = deps({
      check: async () => {
        throw new Error('offline')
      },
    })
    await m.checkForUpdate(d)
    expect(m.getUpdateStatus()).toEqual({ kind: 'error' })
  })

  it('安装按进度事件推进百分比，完成后重启', async () => {
    const m = await freshModule()
    const seen: string[] = []
    m.subscribeUpdateStatus(() => seen.push(JSON.stringify(m.getUpdateStatus())))
    const update = fakeUpdate({
      downloadAndInstall: async (onEvent) => {
        onEvent({ event: 'Started', data: { contentLength: 200 } })
        onEvent({ event: 'Progress', data: { chunkLength: 50 } })
        onEvent({ event: 'Progress', data: { chunkLength: 150 } })
        onEvent({ event: 'Finished', data: {} })
      },
    })
    const d = deps({ check: async () => update })
    await m.checkForUpdate(d)
    await m.installPendingUpdate(d)
    expect(d.relaunch).toHaveBeenCalledTimes(1)
    expect(seen).toContain('{"kind":"updating","percent":25}')
    expect(seen).toContain('{"kind":"updating","percent":100}')
  })

  it('无待安装更新时安装为空操作；安装失败落 error', async () => {
    const m = await freshModule()
    const d = deps()
    await m.installPendingUpdate(d)
    expect(m.getUpdateStatus()).toEqual({ kind: 'idle' })

    const failing = fakeUpdate({
      downloadAndInstall: async () => {
        throw new Error('disk')
      },
    })
    const d2 = deps({ check: async () => failing })
    await m.checkForUpdate(d2)
    await m.installPendingUpdate(d2)
    expect(m.getUpdateStatus()).toEqual({ kind: 'error' })
    expect(d2.relaunch).not.toHaveBeenCalled()
  })
})
