/**
 * Tauri 桌面专属接线（Windows 阶段验证包）：仅在 Tauri 环境启用，
 * 网页/安卓下两个导出都是空操作。
 *
 * 1. 原生拖放导入：监听窗口 drag-drop 事件，drop 时把文件路径经
 *    tauriFiles 转成 File 数组喂导入管线（与对话框导入同一条管线）。
 * 2. CI 测试钩子：restore 完成后检查应用数据目录根下的
 *    test-import.json（内容为待导入文件绝对路径的 JSON 数组，CI 预置）；
 *    存在则走真实导入管线导入，处理完（无论成败）删除钩子文件，
 *    避免下次启动重复导入。普通用户环境没有此文件，行为为零。
 *    正式版上线前应移除本钩子或保留此「无文件即无操作」的形态。
 */
import { importTracks } from '../store/importTracks'
import { restoreLocalTracks } from '../store/bootstrap'
import { isTauriPlatform } from './env'
import { filesFromPaths } from './tauriFiles'
import { startSilentUpdateCheck } from './tauriUpdate'

const TEST_HOOK_FILE = 'test-import.json'

let bound = false

/** 应用生命周期内只绑定一次：拖放监听 + 恢复后测试钩子检查 */
export function bindTauriDesktop(): void {
  if (bound) return
  bound = true
  if (!isTauriPlatform()) return

  void (async () => {
    const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow')
    await getCurrentWebviewWindow().onDragDropEvent((event) => {
      if (event.payload.type === 'drop' && event.payload.paths.length) {
        void filesFromPaths(event.payload.paths).then((files) => {
          if (files.length) void importTracks(files)
        })
      }
    })
  })().catch(() => undefined)

  // 测试钩子必须在曲库恢复完成后检查（restoreLocalTracks 是记忆化 Promise，重复调用安全）
  void restoreLocalTracks()
    .then(() => runTestImportHook())
    .catch(() => undefined)

  // 启动静默检查更新（1.3.0）：发现新版只在设置页提示，不打扰使用
  startSilentUpdateCheck()
}

/** 解析钩子内容：只接受字符串数组，其余形状按无钩子处理 */
export function parseTestHook(raw: string): string[] {
  try {
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data.filter((x): x is string => typeof x === 'string' && x.length > 0)
  } catch {
    return []
  }
}

async function runTestImportHook(): Promise<void> {
  const fs = await import('@tauri-apps/plugin-fs')
  const { BaseDirectory } = await import('@tauri-apps/api/path')
  const baseDir = BaseDirectory.AppData
  try {
    const raw = await fs.readTextFile(TEST_HOOK_FILE, { baseDir }).catch(() => null)
    if (raw === null) return
    try {
      const paths = parseTestHook(raw)
      if (paths.length) {
        const files = await filesFromPaths(paths)
        if (files.length) await importTracks(files)
      }
    } finally {
      // 无论导入成败都删钩子，避免下次启动重复触发
      await fs.remove(TEST_HOOK_FILE, { baseDir }).catch(() => undefined)
    }
  } catch {
    // 钩子是 CI 专用通道，任何异常都不影响正常启动
  }
}
