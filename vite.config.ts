import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

// Plugin to replace Node.js modules with empty objects
const nodeModulesReplacement = () => ({
  name: 'node-modules-replacement',
  resolveId(id) {
    // Replace Node.js modules with empty objects
    if (['fs', 'path', 'os', 'crypto', 'buffer', 'util', 'events', 'stream'].includes(id)) {
      return id;
    }
  },
  load(id) {
    // Return empty module for Node.js built-ins
    if (['fs', 'path', 'os', 'crypto', 'buffer', 'util', 'events', 'stream'].includes(id)) {
      return 'export default {};';
    }
  }
});

// https://vitejs.dev/config/
export default defineConfig({
  base: '/', // Use relative base path for development
  plugins: [
    react({
      jsxRuntime: 'automatic',
      jsxImportSource: 'react',
    }),
    visualizer({ open: false }), // view bundle size with `npm run build`
    nodeModulesReplacement(), // Replace Node.js modules with empty objects
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
      external: (id) => {
        // Externalize all Node.js built-in modules
        if (id === 'fs' || id === 'path' || id === 'os' || id === 'crypto' || 
            id === 'buffer' || id === 'util' || id === 'events' || id === 'stream' ||
            id === 'http' || id === 'https' || id === 'url' || id === 'querystring' ||
            id === 'child_process' || id === 'cluster' || id === 'worker_threads' ||
            id === 'module' || id === 'assert' || id === 'constants' || id === 'domain' ||
            id === 'freelist' || id === 'punycode' || id === 'readline' || id === 'repl' ||
            id === 'string_decoder' || id === 'sys' || id === 'tls' || id === 'tty' ||
            id === 'vm' || id === 'zlib') {
          return true;
        }
        
        // Externalize server-side packages
        if (id === 'node-fetch' || id === 'jose' || id === 'zod-to-json-schema' ||
            id === 'tiktoken' || id === 'zod' || id === 'undici' || id === 'jsdom' ||
            id === '@mozilla/readability' || id === 'pdf-lib' || id === 'sharp' ||
            id === 'crypto-js') {
          return true;
        }
        
        return false;
      },
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