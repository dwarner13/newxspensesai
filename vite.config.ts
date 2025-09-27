import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/', // Use relative base path for development
  plugins: [
    react({
      jsxRuntime: 'automatic',
      jsxImportSource: 'react',
    }),
    visualizer({ open: false }), // view bundle size with `npm run build`
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
    force: true,
  },
  build: {
    minify: 'esbuild',
    sourcemap: false,
    cssCodeSplit: true,
    brotliSize: false,
    chunkSizeWarningLimit: 2000,
    target: 'esnext',
    format: 'es',
    rollupOptions: {
      treeshake: true,
      external: [
        // Server-side packages
        'tesseract.js', 
        'node-fetch',
        'jose',
        'zod-to-json-schema',
        'tiktoken',
        'zod',
        'undici',
        'jsdom',
        '@mozilla/readability',
        'pdf-lib',
        'pdf-parse',
        'sharp',
        // Node.js built-in modules
        'crypto',
        'fs',
        'path',
        'os',
        'stream',
        'util',
        'events',
        'http',
        'https',
        'url',
        'querystring',
        'buffer',
        'child_process',
        'cluster',
        'worker_threads',
        'crypto-js'
      ],
      output: {
        // Simplified chunking - let Vite handle it automatically
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  server: {
    port: 5173,
    open: false, // Disable auto-open to prevent hanging
    host: 'localhost',
    hmr: true, // Enable HMR for better development experience
    watch: {
      usePolling: false,
      interval: 1000,
    },
  },
  preview: {
    port: 3000,
    host: true,
  },
});