/**
 * Tauri 桌面文件选择与任意路径读取（Windows 阶段验证包）。
 *
 * 为什么不全走 plugin-fs：fs 插件的 capability scope 只放行应用数据目录
 *（$APPDATA/**，见 src-tauri/capabilities），用户在系统对话框里选的、
 * 或拖进窗口的源文件都在该目录之外，fs 插件读不了。因此源文件字节统一
 * 走 Rust 侧的窄命令 read_picked_file（见 src-tauri/src/lib.rs）：它只被
 * 本模块调用，入参只来自系统对话框返回路径、窗口拖放事件路径与
 * CI 测试钩子清单——三者都是用户手势/受控来源，不接受页面内任意构造。
 *
 * 对话框不设 filters：.lrc 歌词文件没有标准 MIME/扩展名过滤口径，
 * 按扩展名过滤会误伤（安卓阶段既有教训），选完由导入管线按扩展名分拣。
 *
 * 本模块只在 Tauri 环境被调用；插件与命令桥用动态 import，
 * 网页/安卓构建产物不包含其代码。
 */

const MIME_BY_EXT: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
  opus: 'audio/opus',
  lrc: 'text/plain',
  txt: 'text/plain',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

function baseName(path: string): string {
  const parts = path.split(/[\\/]/)
  return parts[parts.length - 1] || path
}

function mimeOf(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return MIME_BY_EXT[ext] ?? ''
}

interface PickedFileMeta {
  size: number
  modifiedMs: number | null
}

/** 一组绝对路径 → File 数组（拖放、测试钩子、对话框三路共用）；读失败的单个文件跳过 */
export async function filesFromPaths(paths: string[]): Promise<File[]> {
  const { invoke } = await import('@tauri-apps/api/core')
  const files: File[] = []
  for (const path of paths) {
    try {
      const buf = await invoke<ArrayBuffer>('read_picked_file', { path })
      const meta = await invoke<PickedFileMeta>('read_picked_file_meta', { path }).catch(() => null)
      const name = baseName(path)
      files.push(
        new File([buf], name, {
          type: mimeOf(name),
          lastModified: meta?.modifiedMs ?? Date.now(),
        }),
      )
    } catch {
      // 单个文件读失败不阻断整批导入（与网页/安卓管线口径一致）
    }
  }
  return files
}

/** 系统文件对话框多选（limit=0 不限）/ 单选，返回 File 数组；用户取消返回空数组 */
export async function pickFilesTauri(limit = 0): Promise<File[]> {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog')
    // multiple 用字面量分支：插件的返回类型随该字段的字面量类型收窄（单选 string / 多选 string[]）
    let paths: string[] = []
    if (limit === 1) {
      const one = await open({ multiple: false, directory: false })
      if (one) paths = [one]
    } else {
      const many = await open({ multiple: true, directory: false })
      if (many) paths = many
    }
    const limited = limit > 0 ? paths.slice(0, limit) : paths
    return filesFromPaths(limited)
  } catch {
    return []
  }
}
