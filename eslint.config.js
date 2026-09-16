import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const tsconfigRootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig([
  globalIgnores(['dist', 'node_modules']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { tsconfigRootDir },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      // Hạ 2 rule RC quá khắt khe của eslint-plugin-react-hooks v7 về cảnh báo:
      //  • set-state-in-effect: các effect ở đây đồng bộ state theo sự kiện ngoài
      //    (mở sheet, đổi route/auth) — hợp lệ, không thể tính-trong-render.
      //  • only-export-components: chỉ ảnh hưởng HMR lúc dev (file context export
      //    Provider + hook), không ảnh hưởng runtime/build.
      // Giữ ở 'warn' để vẫn thấy trong log; cân nhắc refactor riêng nếu bật React Compiler.
      'react-hooks/set-state-in-effect': 'warn',
      'react-refresh/only-export-components': 'warn',
    },
  },
])
