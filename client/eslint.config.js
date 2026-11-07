import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'storybook-static', 'playwright-report', 'test-results', 'coverage']),
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
    },
  },
  {
    // Pre-existing file: features/auth/router.tsx exports a routes array
    // (authRoutes) next to the Guest/Protected components. react-refresh is a
    // dev-only HMR optimisation that doesn't apply to a routes module, and we're
    // not allowed to edit auth files — so disable the rule for that one file
    // rather than refactor auth. (authRoutes itself is unused by src/router.tsx.)
    files: ['src/features/auth/router.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
