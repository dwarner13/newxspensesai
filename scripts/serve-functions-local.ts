#!/usr/bin/env tsx
/**
 * Local Functions Server — replaces `netlify functions:serve`
 *
 * Pre-builds ALL functions as CJS via esbuild, then serves them on port 9999
 * with the same `/.netlify/functions/<name>` routing Netlify uses.
 *
 * Why: `netlify functions:serve` bundles on-demand on first request, which
 * causes a 30-90s hang for large functions like chat.ts (426KB).  Pre-building
 * eliminates the cold-start entirely.
 */

import { build } from 'esbuild';
import { globSync } from 'glob';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Mimic netlify dev environment flags
process.env.NETLIFY_DEV = 'true';

// Keep local dev server alive when a function/library emits an unhandled rejection.
// This is dev-only hardening so one OCR parse edge-case does not kill all functions.
if (process.env.NETLIFY_DEV === 'true') {
  const noisyRejectionCooldownMs = 5000;
  let lastNoisyRejectionAt = 0;
  const isKnownNoisyPdfRejection = (reason: unknown): boolean => {
    const msg = String((reason as any)?.message || reason || '').toLowerCase();
    return msg.includes('bad encoding in flate stream') || msg.includes('invalid pdf structure');
  };
  process.on('unhandledRejection', (reason) => {
    if (isKnownNoisyPdfRejection(reason)) {
      const now = Date.now();
      if (now - lastNoisyRejectionAt > noisyRejectionCooldownMs) {
        lastNoisyRejectionAt = now;
        console.warn('⚠️  Suppressing repeated pdf parser rejection spam (continuing in dev)');
      }
      return;
    }
    console.error('⚠️  Unhandled promise rejection (continuing in dev):', reason);
  });
  process.on('uncaughtException', (error) => {
    console.error('⚠️  Uncaught exception (continuing in dev):', error);
  });
}

// Load .env manually (no dotenv dependency needed)
function loadEnv(envPath: string) {
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv(path.join(ROOT, '.env'));
loadEnv(path.join(ROOT, '.env.local'));
loadEnv(path.join(ROOT, 'worker', '.env.local'));

const OUT_DIR = path.join(ROOT, '.netlify', 'functions-local');
const PORT = parseInt(process.env.FUNCTIONS_PORT || '9999', 10);
const FUNCTION_HANDLER_TIMEOUT_MS = parseInt(process.env.LOCAL_FUNCTION_HANDLER_TIMEOUT_MS || '45000', 10);

function copyPdfJsWorkerForLocalRender() {
  // smart-import-ocr's bundled pdfjs runtime may resolve "./pdf.worker.js"
  // relative to the built function output directory. Ensure that file exists.
  const workerCandidates = [
    path.join(ROOT, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.js'),
    path.join(ROOT, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.js'),
  ];
  const source = workerCandidates.find((candidate) => fs.existsSync(candidate));
  if (!source) {
    console.warn('⚠️  pdf.worker.js not found in node_modules/pdfjs-dist');
    return;
  }
  const target = path.join(OUT_DIR, 'pdf.worker.js');
  try {
    fs.copyFileSync(source, target);
  } catch (error) {
    console.warn('⚠️  Failed to copy pdf.worker.js for local OCR fallback:', error);
  }
}

// ── 1. Build ──────────────────────────────────────────────────────────────────

async function buildAll() {
  const entryPoints = globSync('netlify/functions/**/*.ts', {
    cwd: ROOT,
    ignore: [
      '**/_shared/**',
      '**/_lib/**',
      '**/__archive/**',
      '**/__tests__/**',
      '**/*.test.ts',
      '**/*.spec.ts',
    ],
  });

  if (entryPoints.length === 0) {
    console.error('No function entry points found');
    process.exit(1);
  }

  // Ensure output dir
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const start = Date.now();
  console.log(`⚡ Building ${entryPoints.length} functions (CJS) …`);

  await build({
    entryPoints: entryPoints.map(f => path.join(ROOT, f)),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outdir: OUT_DIR,
    // Flatten output — put all .js files directly in OUT_DIR
    outbase: path.join(ROOT, 'netlify', 'functions'),
    external: [
      // Match netlify.toml external_node_modules
      '@supabase/supabase-js',
      'openai',
      'undici',
      'jsdom',
      '@mozilla/readability',
      'pdf-parse',
      'pdf-lib',
      '@napi-rs/canvas',
      '@napi-rs/canvas-win32-x64-msvc',
      'canvas',
      'zod',
      'zod-to-json-schema',
      // Netlify types
      '@netlify/functions',
      // Node built-ins are auto-external with platform: 'node'
    ],
    sourcemap: false,
    logLevel: 'warning',
    // Suppress specific warnings about require() of ES modules
    logOverride: {
      'commonjs-variable-in-esm': 'silent',
    },
  });
  copyPdfJsWorkerForLocalRender();

  console.log(`✅ Built in ${Date.now() - start}ms → ${OUT_DIR}`);
}

// ── 2. Serve ──────────────────────────────────────────────────────────────────

/** Convert an http.IncomingMessage into a Netlify-like event object */
function buildEvent(req: http.IncomingMessage, body: string): Record<string, any> {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === 'string') headers[k] = v;
    else if (Array.isArray(v)) headers[k] = v.join(', ');
  }

  return {
    path: url.pathname,
    httpMethod: (req.method || 'GET').toUpperCase(),
    headers,
    queryStringParameters: Object.fromEntries(url.searchParams.entries()),
    body: body || null,
    isBase64Encoded: false,
    rawUrl: url.toString(),
    rawQuery: url.search.replace(/^\?/, ''),
  };
}

/** Cache of loaded handler modules */
const handlerCache = new Map<string, any>();

async function ensureFunctionBundleFresh(name: string): Promise<void> {
  if (process.env.NETLIFY_DEV !== 'true') return;
  const srcPath = path.join(ROOT, 'netlify', 'functions', `${name}.ts`);
  const jsPath = path.join(OUT_DIR, `${name}.js`);
  if (!fs.existsSync(srcPath)) return;
  if (!fs.existsSync(jsPath)) {
    await buildAll();
    handlerCache.clear();
    return;
  }

  const srcMtime = fs.statSync(srcPath).mtimeMs;
  const jsMtime = fs.statSync(jsPath).mtimeMs;
  if (srcMtime > jsMtime) {
    console.log(`♻️ Rebuilding functions for updated source: ${name}.ts`);
    await buildAll();
    handlerCache.clear();
  }
}

function loadHandler(name: string) {
  if (handlerCache.has(name)) return handlerCache.get(name);

  const jsPath = path.join(OUT_DIR, `${name}.js`);
  if (!fs.existsSync(jsPath)) return null;

  // Clear require cache for the module so hot-reloads work if we add watch later
  try {
    delete require.cache[require.resolve(jsPath)];
  } catch { /* first load */ }

  const mod = require(jsPath);
  const handler = mod.handler || mod.default?.handler || mod.default;
  if (typeof handler !== 'function') {
    console.error(`⚠ ${name}: no handler export found`);
    return null;
  }

  handlerCache.set(name, handler);
  return handler;
}

function startServer() {
  const server = http.createServer(async (req, res) => {
    // Parse function name from path: /.netlify/functions/<name>
    const match = req.url?.match(/^\/.netlify\/functions\/([^/?]+)/);
    if (!match) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not a function path' }));
      return;
    }

    const fnName = match[1];

    // Collect body
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', async () => {
      const body = Buffer.concat(chunks).toString();
      const event = buildEvent(req, body);

      await ensureFunctionBundleFresh(fnName);

      const handler = loadHandler(fnName);
      if (!handler) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Function "${fnName}" not found` }));
        return;
      }

      try {
        const result = await new Promise<any>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Function "${fnName}" timed out after ${FUNCTION_HANDLER_TIMEOUT_MS}ms`));
          }, FUNCTION_HANDLER_TIMEOUT_MS);
          Promise.resolve(handler(event, {}))
            .then((value) => {
              clearTimeout(timeout);
              resolve(value);
            })
            .catch((error) => {
              clearTimeout(timeout);
              reject(error);
            });
        });

        // Support streaming responses (callback-style)
        if (result === undefined) {
          // Handler may have already written to a callback — shouldn't happen
          // with our simple event model. Return 204.
          if (!res.writableEnded) {
            res.writeHead(204);
            res.end();
          }
          return;
        }

        const statusCode = result.statusCode || 200;
        const headers = result.headers || {};

        // Merge multiValueHeaders if present
        if (result.multiValueHeaders) {
          for (const [k, vals] of Object.entries(result.multiValueHeaders)) {
            if (Array.isArray(vals)) {
              headers[k] = (vals as string[]).join(', ');
            }
          }
        }

        res.writeHead(statusCode, headers);

        if (result.isBase64Encoded && result.body) {
          res.end(Buffer.from(result.body, 'base64'));
        } else {
          res.end(result.body || '');
        }
      } catch (err: any) {
        console.error(`❌ ${fnName}:`, err);
        if (!res.writableEnded) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      }
    });
  });

  server.listen(PORT, () => {
    console.log(`🚀 Functions server listening on http://localhost:${PORT}`);
    console.log(`   Route: /.netlify/functions/<name>`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n🛑 Shutting down functions server');
    server.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// ── 3. Main ───────────────────────────────────────────────────────────────────

async function main() {
  try {
    await buildAll();
    startServer();
  } catch (err) {
    console.error('Fatal:', err);
    process.exit(1);
  }
}

main();
