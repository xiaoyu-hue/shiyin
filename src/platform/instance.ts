/**
 * 平台实例出口。
 * 上层统一从这里取平台能力，不直接依赖具体实现文件；
 * 阶段二/三替换实现时只改这里的一行。
 */
import { webPlatform } from './web'

export const platform = webPlatform
