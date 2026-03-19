import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'tests/**/*.ts',
      '**/__tests__/**/*.ts',
      'src/**/*.test.ts',
      'src/**/*.spec.ts'
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'netlify/functions_old/**',
      'netlify/functions_old/**/*',
    ],
    globals: false, // Use explicit imports instead of globals
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});





















