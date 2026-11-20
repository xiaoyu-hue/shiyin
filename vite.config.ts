import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base 供 GitHub Pages 使用；本地开发自动兼容。仓库名 shiyin。
export default defineConfig(({ mode }) => ({
  base: '/shiyin/',
  plugins: [
    react(),
    tailwindcss(),
    // 网页版 CSP（审计 A-62）：仅默认（web）构建注入 meta 内容安全策略；
    // native/desktop 构建（--mode native/desktop）不注入——安卓靠 WebView 与
    // 插件桥、桌面靠 tauri.conf.json 的 CSP，meta 策略会误伤两者的本地服务与桥脚本
    ...(mode === 'native' || mode === 'desktop'
      ? []
      : [
          {
            name: 'shiyin-web-csp',
            transformIndexHtml(html: string) {
              return html.replace(
                '<meta name="theme-color"',
                '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' blob: data:; media-src \'self\' blob:; font-src \'self\' data:; connect-src \'self\'; object-src \'none\'; base-uri \'self\'" />\n    <meta name="theme-color"',
              )
            },
          },
        ]),
  ],
  // 验收构建标记（审计 A-09/A-65）：仅 CI 验收构建以 SHIYIN_ACCEPTANCE=1 注入，
  // 使 CI 测试钩子（test-import.json）与音频元素采样句柄进入产物；
  // 正式构建恒为 false，相关代码路径被打包器整段剔除，正式产物不含验收设施。
  define: {
    __SHIYIN_ACCEPTANCE__: JSON.stringify(process.env.SHIYIN_ACCEPTANCE === '1'),
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    // 覆盖率（审计 A-05）：报告制 + 基线阈值（2026-11 首测基线见审计修复记录，
    // 只对纯逻辑重心 lib/store 设行覆盖下限，低于基线留出余量防误红）
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/main.tsx', 'src/vite-env.d.ts'],
      reporter: ['text-summary', 'html'],
      thresholds: {
        // 基线（2026-11 批次二新测试落地后实测）：lib 行 77.47% / store 行 60.95%，
        // 阈值取基线下约 2–3 点，防日常波动误红；覆盖率提升后应同步上调
        'src/lib/**': { lines: 75 },
        'src/store/**': { lines: 58 },
      },
    },
  },
}))
