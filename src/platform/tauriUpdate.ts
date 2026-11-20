/**
 * 桌面版自动更新与开机自启（Tauri 专属，1.3.0）。网页/安卓环境全部为空操作。
 *
 * 自动更新走官方 updater 插件：检查地址在 src-tauri/tauri.conf.json 里
 * 指向 GitHub Releases 的 latest.json，更新包用 minisign 验签
 *（公钥在应用配置里；私钥只存 GitHub Secrets 与用户保管的原件，绝不入仓）。
 * 下载安装完成后经 process 插件重启应用生效。
 *
 * 本模块把检查结果收敛为大白话状态，设置页/关于页只负责渲染：
 * - idle       还没检查过
 * - checking   正在检查
 * - latest     已是最新版
 * - available  发现新版（带版本号），可一键更新
 * - updating   正在下载安装（带进度百分比，未知时为 null）
 * - error      检查失败（多半是没联网）
 *
 * 启动静默检查：bindTauriDesktop 在 Tauri 环境启动时调一次
 * startSilentUpdateCheck()，发现新版只更新状态、不打扰用户，
 * 用户在设置页看到提示后再决定是否更新。
 */
import { isTauriPlatform } from './env'

export type UpdateStatus =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'latest' }
  | { kind: 'available'; version: string }
  | { kind: 'updating'; percent: number | null }
  | { kind: 'error' }

let status: UpdateStatus = { kind: 'idle' }
const listeners = new Set<() => void>()

function setStatus(next: UpdateStatus): void {
  status = next
  listeners.forEach((fn) => fn())
}

export function getUpdateStatus(): UpdateStatus {
  return status
}

export function subscribeUpdateStatus(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** 更新下载进度事件（与 updater 插件的事件结构对齐的最小子集） */
export type UpdateProgressEvent =
  | { event: 'Started'; data: { contentLength?: number } }
  | { event: 'Progress'; data: { chunkLength: number } }
  | { event: 'Finished'; data: Record<string, never> }

/** 一次待安装更新的最小句柄（插件的 Update 对象结构兼容） */
export interface UpdateHandle {
  version: string
  downloadAndInstall: (onEvent: (event: UpdateProgressEvent) => void) => Promise<void>
}

/** 更新状态机的外部依赖（审计 A-37 可测性）：默认即生产实现，测试可注入桩 */
export interface UpdateDeps {
  isTauri: () => boolean
  check: () => Promise<UpdateHandle | null>
  relaunch: () => Promise<void>
}

const defaultDeps: UpdateDeps = {
  isTauri: isTauriPlatform,
  check: async () => {
    const { check } = await import('@tauri-apps/plugin-updater')
    return (await check()) as UpdateHandle | null
  },
  relaunch: async () => {
    const { relaunch } = await import('@tauri-apps/plugin-process')
    await relaunch()
  },
}

let pending: UpdateHandle | null = null
let checking: Promise<void> | null = null

/** 执行一次检查（并发调用合并为同一次）；结果写入模块状态 */
export function checkForUpdate(deps: UpdateDeps = defaultDeps): Promise<void> {
  if (!deps.isTauri()) return Promise.resolve()
  if (checking) return checking
  checking = (async () => {
    setStatus({ kind: 'checking' })
    try {
      pending = await deps.check()
      if (pending) setStatus({ kind: 'available', version: pending.version })
      else setStatus({ kind: 'latest' })
    } catch {
      pending = null
      setStatus({ kind: 'error' })
    } finally {
      checking = null
    }
  })()
  return checking
}

let silentStarted = false

/** 启动时静默检查一次（仅 Tauri 环境、整个生命周期只跑一次） */
export function startSilentUpdateCheck(): void {
  if (silentStarted) return
  silentStarted = true
  if (!isTauriPlatform()) return
  void checkForUpdate()
}

/** 下载并安装已发现的更新，完成后自动重启应用；失败回到 error 状态 */
export async function installPendingUpdate(deps: UpdateDeps = defaultDeps): Promise<void> {
  if (!pending) return
  const update = pending
  setStatus({ kind: 'updating', percent: null })
  try {
    let total = 0
    let got = 0
    await update.downloadAndInstall((event) => {
      if (event.event === 'Started') {
        total = event.data.contentLength ?? 0
      } else if (event.event === 'Progress') {
        got += event.data.chunkLength
        setStatus({
          kind: 'updating',
          percent: total > 0 ? Math.min(100, Math.round((got / total) * 100)) : null,
        })
      }
    })
    await deps.relaunch()
  } catch {
    setStatus({ kind: 'error' })
  }
}

/** 读取开机自启真实状态（注册表 Run 项）；非 Tauri 环境返回 false */
export async function getAutostartEnabled(): Promise<boolean> {
  if (!isTauriPlatform()) return false
  try {
    const { isEnabled } = await import('@tauri-apps/plugin-autostart')
    return await isEnabled()
  } catch {
    return false
  }
}

/** 设置开机自启；失败抛错由调用方提示 */
export async function setAutostartEnabled(enabled: boolean): Promise<void> {
  const mod = await import('@tauri-apps/plugin-autostart')
  if (enabled) await mod.enable()
  else await mod.disable()
}
