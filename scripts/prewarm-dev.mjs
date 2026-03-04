#!/usr/bin/env node
/**
 * prewarm-dev.mjs
 *
 * Fires lightweight requests at key Netlify functions right after
 * `netlify dev` starts. Auth will fail (no real token) but esbuild
 * still bundles the function — so the first real page-load request
 * hits an already-warm bundle instead of waiting 2-30s.
 *
 * Functions targeted (critical page-load path):
 *   prime-state   — called on every page load via PrimeContext
 *   activity-feed — called by 3 components on mount
 *   prime-summary — called after imports complete
 *   chat          — largest file (426KB), 10-30s cold start without pre-warm
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Fix: root package.json has "type":"module" but netlify dev generates CJS shim
// files (.js) in .netlify/functions-serve/. Without this override, Node treats
// the CJS shims as ESM and throws "module is not defined in ES module scope".
const fnServeDir = path.join(__dirname, '..', '.netlify', 'functions-serve');
const fnServePkg = path.join(fnServeDir, 'package.json');
try {
  fs.mkdirSync(fnServeDir, { recursive: true });
  fs.writeFileSync(fnServePkg, '{"type":"commonjs"}\n', { flag: 'w' });
} catch {
  // Non-fatal — dev server will still start, just might have module errors
}

const BASE = 'http://localhost:8888';
const MAX_WAIT_MS = 45_000;
const POLL_INTERVAL_MS = 2000;

async function waitForServer() {
  const start = Date.now();
  process.stdout.write('[prewarm] Waiting for dev server on :8888');
  let lastLogAt = 0;
  while (Date.now() - start < MAX_WAIT_MS) {
    try {
      // Ping an actual function endpoint — the SPA catch-all proxy can hang on HEAD /
      const res = await fetch(`${BASE}/.netlify/functions/prime-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(60000),
      });
      // Any HTTP response (even 401/400) means the server + function are up
      if (res.status < 600) {
        console.log(` ready (HTTP ${res.status}).`);
        return true;
      }
    } catch (err) {
      // still starting — log first error type to help debug
      if (Date.now() - start < 2000) {
        process.stdout.write(`(${err?.code ?? err?.name})`);
      }
    }
    const elapsed = Date.now() - start;
    if (elapsed - lastLogAt >= 10_000) {
      process.stdout.write(` ${Math.floor(elapsed / 1000)}s`);
      lastLogAt = elapsed;
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  console.log('\n[prewarm] Timed out waiting for server.');
  return false;
}

async function prewarm(label, method, path, body) {
  const start = Date.now();
  try {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(35_000),
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE}/.netlify/functions/${path}`, opts);
    const ms = Date.now() - start;
    console.log(`[prewarm] ✓ ${label.padEnd(16)} bundled in ${ms}ms  (HTTP ${res.status})`);
  } catch (err) {
    const ms = Date.now() - start;
    const msg = err?.name === 'TimeoutError' ? 'timeout' : err?.message ?? String(err);
    console.log(`[prewarm] ⚠ ${label.padEnd(16)} ${ms}ms — ${msg}`);
  }
}

async function main() {
  const ready = await waitForServer();
  if (!ready) return;

  console.log('[prewarm] Bundling critical functions in parallel…');
  const t0 = Date.now();

  // Warm lightweight functions first (parallel) — auth fails but bundling succeeds
  await Promise.all([
    prewarm('prime-state',   'POST', 'prime-state',   {}),
    prewarm('activity-feed', 'GET',  'activity-feed?userId=prewarm&limit=1', null),
    prewarm('prime-summary', 'POST', 'prime-summary',  { importId: 'prewarm' }),
  ]);

  // Warm chat separately — it's the biggest file and takes longest
  // This runs while you're still loading the browser tab
  await prewarm('chat', 'POST', 'chat', {
    employee: 'prime',
    message: '__prewarm__',
    userId: 'prewarm',
  });

  console.log(`[prewarm] All functions warm  (${Date.now() - t0}ms total)`);
}

main().catch((err) => {
  console.error('[prewarm] Fatal error:', err);
});
