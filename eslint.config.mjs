// ESLint 扁平配置（审计 A-19）：只上纠错类规则，不做风格一刀切
// （格式化归 Prettier，见 .prettierrc）。typescript-eslint 暂不支持 TS 7，
// 项目 TypeScript 钉在 6.0.x 与之配套（见 package.json）。
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'android/**', 'src-tauri/**', 'e2e/**', 'coverage/**'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended, prettier],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      // 异步漏处理是本项目最现实的缺陷源（void 前缀是既定豁免写法）
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      // 存量基线（A-19）：react-hooks v7 新增的编译器类规则命中的多为既有合法
      // 模式（effect 同步外部状态、渲染期读拖拽 ref、useMemo 内随机抽样），
      // 先记 warn 不阻断，后续随组件治理逐条收紧，不在本版改行为
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
  {
    files: ['*.{js,mjs,ts}', 'scripts/**/*.{js,mjs}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended, prettier],
    languageOptions: { globals: globals.node },
  },
)
