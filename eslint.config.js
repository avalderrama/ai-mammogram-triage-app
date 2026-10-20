import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Onion rings of the frontend: each ring may only import from the rings inside it (CA-DEP-001). */
const ring = (files, forbidden) => ({
  files,
  rules: {
    'no-restricted-imports': ['error', {
      patterns: forbidden.map((group) => ({ group: [group], message: 'This import breaks the onion dependency rule.' })),
    }],
  },
});

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'public/sw.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  ring(['src/domain/**'], ['react', 'react-dom', '@modelcontextprotocol/*', 'zod', '**/application/**', '**/infrastructure/**', '**/presentation/**']),
  ring(['src/application/**'], ['react', 'react-dom', '@modelcontextprotocol/*', 'zod', '**/infrastructure/**', '**/presentation/**']),
  ring(['src/infrastructure/**'], ['react', 'react-dom', '**/presentation/**']),
  ring(['src/presentation/**'], ['@modelcontextprotocol/*', 'zod', '**/infrastructure/**']),
);
