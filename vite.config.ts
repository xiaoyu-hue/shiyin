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
  },
})
