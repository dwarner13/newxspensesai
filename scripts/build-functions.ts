#!/usr/bin/env tsx
/**
 * Build Netlify Functions with ESM format
 * 
 * This script builds all Netlify functions from netlify/functions directory
 * to netlify/functions-dist with ESM format to support import.meta
 */

import { build, context } from 'esbuild';
import { globSync } from 'glob';
import path from 'node:path';
import fs from 'node:fs';

// Detect watch mode: check if script is being run via 'tsx watch' or '--watch' flag
// When tsx watch runs, it doesn't pass special args, but we can check the parent process
// or use an environment variable. For simplicity, check for --watch flag or env var.
const isWatch = process.argv.includes('--watch') || process.env.FUNCTIONS_WATCH === 'true';

// Find all function files (exclude _shared, __archive, test files)
const functionFiles = globSync('netlify/functions/**/*.ts', {
  ignore: [
    '**/_shared/**',
    '**/__archive/**',
    '**/*.test.ts',
    '**/*.spec.ts',
  ],
});

if (functionFiles.length === 0) {
  console.warn('⚠️  No function files found');
  process.exit(0);
}

console.log(`📦 Building ${functionFiles.length} functions...`);

const buildOptions = {
  entryPoints: functionFiles,
  bundle: true,
  platform: 'node' as const,
  format: 'esm' as const,
  outdir: 'netlify/functions-dist',
  external: [
    '@supabase/supabase-js',
    'openai',
    'undici',
    'jsdom',
    '@mozilla/readability',
    '@netlify/functions',
  ],
  // Exclude src/ directory imports from bundling - they're TypeScript source files
  // These will be resolved at runtime by Node.js (functions run in Node environment)
  // Note: Netlify Dev may transpile these on-the-fly, but for build we exclude them
  outExtension: {
    '.js': '.mjs',
  },
  sourcemap: false,
  logLevel: 'info' as const,
  // Don't try to resolve src/ imports - they're outside the functions directory
  // Functions that import from src/ will need those files available at runtime
  // OR we need to copy/build those files separately
};

async function buildFunctions() {
  try {
    // Ensure output directory exists
    if (!fs.existsSync('netlify/functions-dist')) {
      fs.mkdirSync('netlify/functions-dist', { recursive: true });
    }

    if (isWatch) {
      console.log('👀 Watching for changes...');
      const ctx = await context(buildOptions);
      await ctx.watch();
      console.log('✅ Watching functions (press Ctrl+C to stop)');
      // Keep process alive
      process.on('SIGINT', async () => {
        await ctx.dispose();
        process.exit(0);
      });
    } else {
      await build(buildOptions);
      console.log('✅ Functions built successfully');
    }
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildFunctions();

