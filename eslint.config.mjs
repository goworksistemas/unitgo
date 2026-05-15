// @ts-check
// Flat config (ESLint 9+) — TypeScript + React + Hooks + Refresh.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default tseslint.config(
  {
    // Ignorar saidas, deps e migracoes/funcoes Deno
    ignores: [
      'dist/**',
      'node_modules/**',
      'public/**',
      'supabase/**',
      'temp/**',
      'coverage/**',
      'vite.config.ts.timestamp-*',
    ],
  },

  // Recomendados base
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Configuracao para arquivos TS/TSX
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // React
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      'react/prop-types': 'off',

      // Hooks
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'warn',

      // Refresh (Vite/HMR)
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // TS — relaxar regras que pegariam codigo legitimo
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-empty-pattern': 'off',
    },
  },

  // Arquivos de config (Node.js)
  {
    files: ['*.config.{js,cjs,mjs,ts}', 'eslint.config.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
);
