//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'
import unusedImports from 'eslint-plugin-unused-imports'

export default [
  ...tanstackConfig,
  {
    plugins: {
      'unused-imports': unusedImports,
    },
    languageOptions: {
      parserOptions: {
        // tsconfig.json uses the automatic JSX runtime ("jsx": "react-jsx"),
        // so React never needs to be in scope. Without this, the parser
        // implicitly treats "React" as referenced in every JSX file (a
        // holdover default for the classic runtime), which hides genuinely
        // unused `import React from 'react'` statements from every
        // unused-vars/unused-imports rule.
        jsxPragma: null,
        jsxFragmentName: null,
      },
    },
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    ignores: ['eslint.config.js', 'prettier.config.js', '.output/**', '.nitro/**', '.tanstack/**', '.vinxi/**'],
  },
]
