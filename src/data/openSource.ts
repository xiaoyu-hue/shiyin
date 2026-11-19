/**
 * 开源许可与致谢数据：本项目自身许可证 + 主要第三方组件清单。
 *
 * 与仓库根目录 THIRD-PARTY-LICENSES.md 保持同源：这里只列主要组件，
 * 全量清单（含传递依赖）以该文件为准。第三方组件保持各自原始许可证，
 * 不因本项目的许可证而改变；MPL-2.0 组件以 keepOriginal 标注单独提示。
 */

export interface OpenSourceEntry {
  /** 组件名（与 package.json 中的包名或项目名一致） */
  name: string
  /** 许可证 SPDX 标识 */
  license: string
  /** 在本项目中的用途（一句话） */
  purpose: string
  /** 是否为需单独标注「保持其原始许可证」的组件（如 MPL-2.0） */
  keepOriginal?: boolean
}

export const PROJECT_COPYRIGHT = 'Copyright 2026 xiaoyu-hue'

export const PROJECT_CODE_LICENSE = {
  name: 'Apache License 2.0',
  short: 'Apache-2.0',
  summary: '诗音的源代码以 Apache-2.0 发布，可自由使用、修改与分发，须保留版权与许可证声明。',
}

export const PROJECT_DOCS_LICENSE = {
  name: 'Creative Commons Attribution 4.0 International',
  short: 'CC BY 4.0',
  summary: '诗音的文档（README 与 docs/ 项目文档）以 CC BY 4.0 发布，转载与改编须署名。',
}

export const OPEN_SOURCE_ENTRIES: OpenSourceEntry[] = [
  { name: 'React', license: 'MIT', purpose: '界面组件与渲染' },
  { name: 'Vite', license: 'MIT', purpose: '构建与开发服务器' },
  { name: 'Tailwind CSS', license: 'MIT', purpose: '样式与主题令牌' },
  { name: 'Zustand', license: 'MIT', purpose: '状态管理' },
  { name: 'Motion', license: 'MIT', purpose: '动画与手势' },
  { name: 'Lucide（lucide-react）', license: 'ISC', purpose: '界面图标' },
  { name: 'music-metadata', license: 'MIT', purpose: '音频内嵌标签、封面与歌词解析' },
  { name: 'Capacitor 及官方插件', license: 'MIT', purpose: '安卓打包与原生能力（文件、触觉、启动屏等）' },
  { name: '@capawesome/capacitor-file-picker', license: 'MIT', purpose: '安卓系统文件选择器' },
  {
    name: '@capgo/capacitor-media-session',
    license: 'MPL-2.0',
    purpose: '锁屏 / 通知栏媒体控制',
    keepOriginal: true,
  },
]
