import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base 供 GitHub Pages 使用；本地开发自动兼容。仓库名 shiyin。
export default defineConfig({
  base: '/shiyin/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
