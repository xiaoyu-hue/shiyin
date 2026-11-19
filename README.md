# 诗音（Shiyin）

一个跨端音乐播放器的网页版。当前为**阶段一**：可导入本机音频并真实播放，音频保存在浏览器本地，不上传任何服务器。

在线访问：<https://xiaoyu-hue.github.io/shiyin/>

## 技术栈

| 层次 | 选型 |
| --- | --- |
| 界面 | React + TypeScript |
| 构建 | Vite |
| 样式 | Tailwind CSS（主题令牌驱动） |
| 状态 | Zustand（四个 slice） |
| 动画 | Motion |
| 图标 | Lucide |
| 测试 | Vitest |
| 持久化 | IndexedDB |

平台相关能力（计时、主题注入、音频播放）收口在 `src/platform/`，为后续接入 Tauri（Rust 核心）预留替换点。

## 本地运行

要求 Node.js 22+。

```bash
npm install       # 安装依赖
npm run dev       # 开发服务器
npm run build     # 类型检查 + 生产构建
npm test          # 运行单元测试
npm run preview   # 预览构建产物
```

## 功能

- 四个主视图：主页、搜索、发现、我的
- 迷你播放条 + 全屏播放器：切歌、播放/暂停、三种播放模式、收藏、进度拖动
- 歌词页：逐行高亮、点击跳转、高亮行平滑滚动居中
- 六套内置主题即时切换，默认「原木暖棕」
- **导入本地音乐并真实播放**：支持 mp3 / m4a / wav / flac / ogg，音视频文件不进服务器
- **导入结果持久化**：音频与元数据存于 IndexedDB，刷新或重开浏览器后仍在
- **偏好持久化**：收藏、最近播放历史（上限 100 条）与主题选择存于 localStorage，刷新后自动恢复
- 加载态、错误态、空态与错误边界

## 音频说明

- 导入的音频只在本机浏览器中读取与存储，不会上传。
- 曲名与歌手由文件名推断，约定「歌手 - 歌名」格式；无法识别时歌手记为「本地音乐」。
- 内置的 8 首示例曲目不含音频文件，播放时走模拟进度，界面上有明确标注。
- 本地曲目暂不解析内嵌歌词，歌词页对这类曲目显示空状态。
- 清除浏览器站点数据会同时清除已导入的音频。

## 目录结构

```
src/
├── data/        示例数据、类型与纯查询逻辑
├── lib/         纯函数：格式化、播放策略、歌词定位、主题映射、文件解析、动效配置
├── store/       Zustand 状态（player / ui / collection / theme 四切片）+ 启动装配
├── platform/    平台能力接口与 Web 实现（Ticker / StyleAdapter / AudioEngine）、IndexedDB
├── hooks/       useTicker / useTheme
├── components/  视图组件、ui 基础组件、common 通用态组件
└── App.tsx      根组件组装
```

## 演进路线

1. **阶段一（当前）**：网页版，已发布到 GitHub Pages。
2. **阶段二**：手机 App，Tauri + Rust 音频引擎，达到上架级质量标准。
3. **阶段三**：Windows 桌面版，复用同一套界面与核心逻辑。

详细的 Product Requirements、架构与实施计划见仓库根目录的三份文档。
