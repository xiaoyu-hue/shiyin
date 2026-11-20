import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base 供 GitHub Pages 使用；本地开发自动兼容。仓库名 shiyin。
export default defineConfig({
  base: '/shiyin/',
  plugins: [react(), tailwindcss()],
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
})
