import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/', // Use relative base path for development
  plugins: [
    react({
      jsxRuntime: 'automatic',
      jsxImportSource: 'react',
    }),
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
      'motion-utils',
      'pdfjs-dist',
      'pdf-lib',
      'tesseract.js',
      '@radix-ui/react-compose-refs',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-portal',
      '@radix-ui/react-progress',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip'
    ],
    force: true,
    esbuildOptions: {
      target: 'es2020'
    }
  },
  define: {
    // Replace server-side modules with empty objects in client build
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    global: 'globalThis',
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
      external: ['pdfjs-dist/build/pdf.worker.entry'],
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