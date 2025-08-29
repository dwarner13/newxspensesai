import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Remove base path for better Netlify compatibility
  plugins: [
    react(),
    visualizer({ open: false }), // view bundle size with `npm run build`
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
  },
  build: {
    minify: 'esbuild',
    sourcemap: false,
    cssCodeSplit: true,
    brotliSize: false,
    rollupOptions: {
      treeshake: true,
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['framer-motion', 'react-hot-toast'],
          charts: ['chart.js', 'react-chartjs-2'],
          utils: ['jotai', 'date-fns'],
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  server: {
    port: 3000,
    open: true,
    host: 'localhost',
    hmr: false, // Completely disable HMR to stop all updates
    watch: {
      usePolling: false,
      interval: 5000, // Increase to 5 seconds
    },
  },
  preview: {
    port: 3000,
    host: true,
  },
});