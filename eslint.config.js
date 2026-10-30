// ESLint: the linter — finds problems and enforces the rules Prettier (the
// formatter) does not cover. Run `npm run lint`, or `npm run lint:fix` to let
// it fix what it can. Shared by all four Huntrix projects; keep them in step.
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

export default defineConfig(
  {
    ignores: [
      'dist/',
      'node_modules/',
      'test-results/',
      'playwright-report/',
      'src/lib/notation/glyphdata.ts',
      'src/lib/notation/icons.ts',
    ],
  },
  js.configs.recommended,
  ts.configs.recommended,
  svelte.configs.recommended,
  prettier,
  svelte.configs.prettier,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  {
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    languageOptions: {
      parserOptions: { parser: ts.parser, extraFileExtensions: ['.svelte'], svelteConfig },
    },
  },
  {
    rules: {
      // readability: a body always gets braces and its own lines
      curly: ['error', 'all'],
      // one variable per declaration: no "const a = 1, b = 2"
      'one-var': ['error', 'never'],
      'prefer-const': 'error',
      // a leading underscore marks a name that is deliberately unused
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // a ? b : c ? d : e is hard to read; flagged, rewritten by hand over time
      'no-nested-ternary': 'warn',
      // the apps draw their SVG as strings they build themselves, and insert
      // them with {@html}; nothing user-typed ever goes through it
      'svelte/no-at-html-tags': 'off',
    },
  },
);
