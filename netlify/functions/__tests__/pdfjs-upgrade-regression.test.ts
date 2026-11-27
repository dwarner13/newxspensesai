/**
 * PDF.js security upgrade regression (owner GO 2026-11-27): pdfjs-dist 6.5.438 on Node 22.
 * Advisories cleared: GHSA-wgrm-67xf-hhpq / CVE-2024-4367 (<= 4.1.392) and
 * GHSA-hq66-cqwq-w95j / CVE-2026-16633 (>= 5.6.83, < 6.2.108).
 *
 * Real PDF.js on synthetic PDFs built with pdf-lib: page rendering, text extraction and page
 * counting through the production helpers. Nothing exercises the vulnerabilities (owner
 * instruction: do not attempt to exploit).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const root = path.resolve(__dirname, '../../..');
let pdf: Buffer;

beforeAll(async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 3; i++) {
    const p = doc.addPage([400, 300]);
    p.drawText(`Synthetic Bank page ${i + 1}`, { x: 20, y: 260, size: 12, font });
    p.drawText('Closing totals 300.00 200.00', { x: 20, y: 240, size: 10, font });
  }
  pdf = Buffer.from(await doc.save());
});

describe('installed PDF.js', () => {
  it('is exactly 6.5.438, outside both known advisory ranges, and the lockfile pins it', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/pdfjs-dist/package.json'), 'utf8'));
    expect(pkg.version).toBe('6.5.438');
    const app = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(app.dependencies['pdfjs-dist']).toBe('6.5.438');
    expect(fs.readFileSync(path.join(root, 'pnpm-lock.yaml'), 'utf8')).toMatch(/pdfjs-dist@6\.5\.438/);
  });

  it('ONE @napi-rs/canvas version, inside the range pdfjs-dist 6 declares (deploy resolution unambiguous)', () => {
    const app = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const pdfjsPkg = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/pdfjs-dist/package.json'), 'utf8'));
    const range = String({ ...pdfjsPkg.dependencies, ...pdfjsPkg.optionalDependencies }['@napi-rs/canvas'] || '');
    const pinned = String(app.dependencies['@napi-rs/canvas']);
    expect(pinned).toMatch(/^\d+\.\d+\.\d+$/); // exact pin
    // Caret range check: same major, and not below the range's minimum.
    const [rMaj, rMin, rPat] = range.replace(/^\^/, '').split('.').map(Number);
    const [pMaj, pMin, pPat] = pinned.split('.').map(Number);
    expect(range.startsWith('^')).toBe(true);
    expect(pMaj).toBe(rMaj);
    expect(pMin > rMin || (pMin === rMin && pPat >= rPat)).toBe(true);
    const lock = fs.readFileSync(path.join(root, 'pnpm-lock.yaml'), 'utf8');
    const versions = new Set([...lock.matchAll(/'?@napi-rs\/canvas@(\d+\.\d+\.\d+)/g)].map((m) => m[1]));
    expect([...versions]).toEqual([pinned]);
  });

  it('the app targets Node 22 (pdfjs-dist 6 requires >= 22.13)', () => {
    expect(fs.readFileSync(path.join(root, '.nvmrc'), 'utf8').trim()).toBe('22');
    const [major, minor] = process.versions.node.split('.').map(Number);
    expect(major > 22 || (major === 22 && minor >= 13)).toBe(true);
  });
});

describe('server helpers on PDF.js 6 (synthetic statement)', () => {
  it('page counting: countPdfPages', async () => {
    const { countPdfPages } = await import('../_shared/documentPurpose');
    expect(await countPdfPages(pdf)).toBe(3);
  });

  it('text extraction: extractPdfTextWithLayout keeps the printed totals line', async () => {
    const { extractPdfTextWithLayout } = await import('../_lib/pdfText');
    const text = await extractPdfTextWithLayout(pdf);
    expect(text).toMatch(/Synthetic Bank page 1/);
    expect(text).toMatch(/Closing totals 300\.00 200\.00/);
  });

  it('statement page rendering: pdfToImages renders real page images (bundled as Netlify does, run on Node)', async () => {
    // pdfToImages loads PDF.js through a runtime import() that the test VM cannot host, so this
    // runs the production shape: an esbuild CJS bundle (pdfjs-dist / canvas external, as in
    // netlify.toml) executed by a real Node process.
    const esbuild = await import('esbuild');
    // Inside the project so the bundle's ESM import() of pdfjs-dist resolves node_modules like a deploy.
    const cacheDir = path.join(root, 'node_modules', '.cache');
    fs.mkdirSync(cacheDir, { recursive: true });
    const dir = fs.mkdtempSync(path.join(cacheDir, 'pdfjs-render-'));
    try {
      const pdfPath = path.join(dir, 'synthetic.pdf');
      fs.writeFileSync(pdfPath, pdf);
      const entry = path.join(dir, 'entry.ts');
      fs.writeFileSync(entry, [
        `import { pdfToImages } from ${JSON.stringify(path.join(root, 'netlify/functions/lib/pdf/pdfToImages').replace(/\\/g, '/'))};`,
        `import * as fs from 'fs';`,
        `console.log = () => undefined; console.warn = () => undefined;`,
        `pdfToImages(fs.readFileSync(${JSON.stringify(pdfPath.replace(/\\/g, '/'))}), { maxPages: 2 })`,
        `  .then((o: any) => { process.stdout.write('RESULT ' + JSON.stringify(o.pages.map((p: any) => ({ bytes: p.imageBuffer.length, width: p.width })))); process.exit(0); })`,
        `  .catch((e: any) => { process.stdout.write('ERROR ' + String(e && e.message)); process.exit(1); });`,
      ].join('\n'));
      const out = path.join(dir, 'bundle.cjs');
      await esbuild.build({
        entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', target: 'node22', outfile: out, logLevel: 'silent',
        external: ['pdfjs-dist', '@napi-rs/canvas', 'pdf-lib', 'sharp', 'undici', 'jsdom', '@mozilla/readability'],
        nodePaths: [path.join(root, 'node_modules')],
      });
      const stdout = execFileSync(process.execPath, [out], { cwd: root, encoding: 'utf8', env: { ...process.env, NODE_PATH: path.join(root, 'node_modules') }, timeout: 60_000 });
      const m = stdout.match(/RESULT (.*)$/m);
      expect(m, stdout.slice(0, 300)).toBeTruthy();
      const pages = JSON.parse(m![1]) as Array<{ bytes: number; width: number }>;
      expect(pages).toHaveLength(2);
      for (const p of pages) {
        expect(p.bytes).toBeGreaterThan(1000);
        expect(p.width).toBeGreaterThan(0);
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }, 120_000);
});

describe('server loads the ESM legacy build (v4+ layout)', () => {
  it('no server file imports the removed legacy/build/pdf.js path', () => {
    for (const f of ['netlify/functions/_lib/pdfText.ts', 'netlify/functions/_shared/documentPurpose.ts', 'netlify/functions/lib/pdf/pdfToImages.ts', 'netlify/functions/smart-import-ocr-background.ts']) {
      const src = fs.readFileSync(path.join(root, f), 'utf8');
      expect(src, f).not.toMatch(/pdfjs-dist\/legacy\/build\/pdf\.js['"]/);
      expect(src, f).toMatch(/pdfjs-dist\/legacy\/build\/pdf\.mjs['"]/);
    }
  });
});
