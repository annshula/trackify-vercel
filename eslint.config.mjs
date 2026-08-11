import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

/**
 * Flat config. eslint-config-next 16 ships native flat configs, so no
 * FlatCompat shim is needed (and the shim in fact crashes on it).
 */
const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'data/**',
      'next-env.d.ts',
      'design-system/**',
      'coverage/**',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // Test files legitimately reach into shapes that production code does not.
    files: ['__tests__/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];

export default config;
