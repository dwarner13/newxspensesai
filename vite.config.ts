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
      '@': path.resolve(__dirname, './src')
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react', 'pdfjs-dist/build/pdf.worker.entry'],
    include: [
      'react', 
      'react-dom', 
      'react-router-dom', 
      'framer-motion',
      'pdfjs-dist',
      'pdf-lib',
      'tesseract.js'
    ],
    force: true,
    esbuildOptions: {
      target: 'es2020'
    }
  },
  build: {
    minify: 'esbuild',
    sourcemap: false,
    cssCodeSplit: true,
    brotliSize: false,
    chunkSizeWarningLimit: 2000,
    target: 'es2020',
    format: 'esm',
    rollupOptions: {
      maxParallelFileOps: 2,
      treeshake: true,
      external: [
        // Server-side packages
        'node-fetch',
        'jose',
        'zod-to-json-schema',
        'tiktoken',
        'zod',
        'undici',
        'jsdom',
        '@mozilla/readability',
        'pdf-lib',
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
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
          charts: ['chart.js', 'react-chartjs-2'],
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  worker: {
    format: 'es'
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
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },
  preview: {
    port: 3000,
    host: true,
  },
});