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
      '@': path.resolve(__dirname, './src'),
      // Mock OpenAI completely for frontend
      'openai': path.resolve(__dirname, './src/mocks/openai-mock.js'),
      'openai/_shims/auto/runtime': path.resolve(__dirname, './src/mocks/openai-mock.js'),
    },
  },
  optimizeDeps: {
    exclude: ['pdfjs-dist/build/pdf.worker.entry', 'openai', 'openai/_shims/auto/runtime'],
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'framer-motion',
      'motion-utils',
      'pdfjs-dist',
      'tesseract.js',
      'lucide-react',
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
      external: ['pdfjs-dist/build/pdf.worker.entry', 'openai', 'openai/_shims/auto/runtime', 'openai/_shims'],
      output: {
        format: 'esm', // Ensure ESM output
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
    port: 8888,
    open: false, // Disable auto-open to prevent hanging
    host: true, // Listen on all interfaces (equivalent to '0.0.0.0')
    hmr: {
      overlay: false, // Disable error overlay
    },
    watch: {
      usePolling: false,
      interval: 1000,
    },
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin'
    },
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    port: 3000,
    host: true,
  },
});