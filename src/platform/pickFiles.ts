import { getRuntimeEnv } from './env'
import { pickFilesNative } from './nativeFiles'
import { pickFilesTauri } from './tauriFiles'

/**
 * 选文件三路分流的统一入口（审计 A-32）：导入音乐与单曲挂歌词两个入口共用，
 * 不再各写一份平台判断。
 * - 原生 / 桌面：直接调系统选择器，返回选中的 File 数组（取消时为空数组）；
 * - 网页：没有可编程的系统选择器，返回 null，调用方据此点开自己的隐藏
 *   `<input type="file">` 并在 onChange 里接住文件。
 * limit 语义与两端实现一致：0 表示不限（多选），1 表示单选。
 */
export async function pickFiles(limit = 0): Promise<File[] | null> {
  const env = getRuntimeEnv()
  if (env === 'capacitor') return pickFilesNative(limit)
  if (env === 'tauri') return pickFilesTauri(limit)
  return null
}
