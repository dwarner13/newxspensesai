import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/', // Use relative base path for development
  plugins: [
    react(),
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
  },
  build: {
    minify: 'esbuild',
    sourcemap: false,
    cssCodeSplit: true,
    brotliSize: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      treeshake: true,
      external: ['tesseract.js', 'node-fetch'],
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-animations';
            }
            if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
              return 'vendor-charts';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('@radix-ui')) {
              return 'vendor-ui';
            }
            if (id.includes('@supabase') || id.includes('axios')) {
              return 'vendor-api';
            }
            if (id.includes('pdf') || id.includes('jspdf')) {
              return 'vendor-pdf';
            }
            // Other large libraries
            if (id.includes('date-fns') || id.includes('dayjs') || id.includes('jotai') || id.includes('zustand')) {
              return 'vendor-utils';
            }
            // Everything else goes to vendor-other
            return 'vendor-other';
          }
          
          // Page-specific chunks for large dashboard pages
          if (id.includes('src/pages/dashboard/')) {
            const pageName = id.split('/').pop()?.replace('.tsx', '') || 'unknown';
            if (['AICategorizationPage', 'AIFinancialAssistantPage', 'SmartImportAIPage', 'TaxAssistant'].includes(pageName)) {
              return `page-${pageName.toLowerCase()}`;
            }
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  server: {
    port: 5173,
    open: true,
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