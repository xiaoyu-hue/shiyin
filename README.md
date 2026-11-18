# 诗音（Shiyin）

一个跨端音乐播放器的网页原型。当前版本为**阶段一 · 网页版**：使用内置示例曲目与模拟进度，聚焦界面质感与交互手感，不播放真实音频、不做数据持久化。

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

平台相关副作用（计时、主题注入）收口在 `src/platform/`，为后续接入 Tauri（Rust 核心）预留替换点。

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
- 加载态、错误态、空态与错误边界

## 目录结构

```
src/
├── data/        示例数据与纯查询逻辑
├── lib/         纯函数：格式化、播放策略、歌词定位、主题映射、动效配置
├── store/       Zustand 状态，按 player / ui / collection / theme 分切片
├── platform/    平台能力接口与 Web 实现（Ticker / StyleAdapter）
├── hooks/       useTicker / useTheme
├── components/  视图组件、ui 基础组件、common 通用态组件
└── App.tsx      根组件组装
```

## 数据说明

曲目元信息取自产品需求文档的内置示例（8 首）；歌词为示例文本，阶段二接入真实音频后替换。收藏与历史仅存于当前会话内存，刷新后清空。

## 演进路线

1. **阶段一（当前）**：网页版，发布到 GitHub Pages。
2. **阶段二**：手机 App，Tauri + Rust 音频引擎，接入真实音频，达到上架级质量标准。
3. **阶段三**：Windows 桌面版，复用同一套界面与核心逻辑。

详细的 Product Requirements、架构与实施计划见仓库根目录的三份文档。
