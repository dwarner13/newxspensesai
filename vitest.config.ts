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
    globals: false, // Use explicit imports instead of globals
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});



