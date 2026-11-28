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
        `import { pdfToImages, pdfRenderTaskStats } from ${JSON.stringify(path.join(root, 'netlify/functions/lib/pdf/pdfToImages').replace(/\\/g, '/'))};`,
        `import * as fs from 'fs';`,
        `console.log = () => undefined; console.warn = () => undefined;`,
        `const buf = fs.readFileSync(${JSON.stringify(pdfPath.replace(/\\/g, '/'))});`,
        `(async () => {`,
        `  const o: any = await pdfToImages(buf, { maxPages: 2 });`,
        `  const afterOk = { ...pdfRenderTaskStats };`,
        // A render that throws mid-document (continueOnPageError false): the task must still be released.
        `  let threw = false;`,
        `  try { await pdfToImages(buf, { maxPages: 2, continueOnPageError: false, onPageRendered: async () => { throw new Error('render failed'); } }); } catch { threw = true; }`,
        `  const afterThrow = { ...pdfRenderTaskStats };`,
        `  process.stdout.write('RESULT ' + JSON.stringify({ pages: o.pages.map((p: any) => ({ bytes: p.imageBuffer.length, width: p.width })), afterOk, afterThrow, threw }));`,
        `  process.exit(0);`,
        `})().catch((e: any) => { process.stdout.write('ERROR ' + String(e && e.message)); process.exit(1); });`,
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
      type Stats = { opened: number; released: number };
      const result = JSON.parse(m![1]) as { pages: Array<{ bytes: number; width: number }>; afterOk: Stats; afterThrow: Stats; threw: boolean };
      expect(result.pages).toHaveLength(2);
      for (const p of result.pages) {
        expect(p.bytes).toBeGreaterThan(1000);
        expect(p.width).toBeGreaterThan(0);
      }
      // pdfjs-dist 6 releases documents only via the loading task: released after a normal render...
      expect(result.afterOk).toEqual({ opened: 1, released: 1 });
      // ...and after a render that throws.
      expect(result.threw).toBe(true);
      expect(result.afterThrow).toEqual({ opened: 2, released: 2 });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }, 120_000);
});

describe('server loads the ESM legacy build (v4+ layout)', () => {
  it('no server file imports the removed legacy/build/pdf.js path', () => {
    // The two modules that load pdfjs-dist themselves (documentPurpose and the OCR background page
    // count now go through _lib/pdfText's shared loader; see the resource-release tests below).
    for (const f of ['netlify/functions/_lib/pdfText.ts', 'netlify/functions/lib/pdf/pdfToImages.ts']) {
      const src = fs.readFileSync(path.join(root, f), 'utf8');
      expect(src, f).not.toMatch(/pdfjs-dist\/legacy\/build\/pdf\.js['"]/);
      expect(src, f).toMatch(/pdfjs-dist\/legacy\/build\/pdf\.mjs['"]/);
    }
    for (const f of ['netlify/functions/_shared/documentPurpose.ts', 'netlify/functions/smart-import-ocr-background.ts']) {
      expect(fs.readFileSync(path.join(root, f), 'utf8'), f).not.toMatch(/pdfjs-dist\/legacy\/build\/pdf\.js['"]/);
    }
  });
});

describe('PDF.js 6 resource release: one shared server loader (withPdfDocument)', () => {
  it('real pdfjs-dist 6 API: the document has no destroy(); the loading task does', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task = pdfjs.getDocument({ isEvalSupported: false, data: new Uint8Array(pdf), verbosity: 0 });
    const doc = await task.promise;
    expect(typeof (doc as unknown as { destroy?: unknown }).destroy).toBe('undefined');
    expect(typeof task.destroy).toBe('function');
    await task.destroy();
  });

  it('every server entry point counts/reads a real PDF on pdfjs 6 with no TypeError', async () => {
    const { readPdfPageCount, extractPdfTextPlain, extractPdfTextWithLayout, extractPdfTextFirst } = await import('../_lib/pdfText');
    const { countPdfPages } = await import('../_shared/documentPurpose');
    // OCR background page count (the live Vision path; this threw on pdfjs 6 before the fix)
    await expect(readPdfPageCount(pdf)).resolves.toBe(3);
    // documentPurpose (chat-document page count)
    await expect(countPdfPages(pdf)).resolves.toBe(3);
    // plain text reader (pdf-parse replacement)
    await expect(extractPdfTextPlain(pdf)).resolves.toContain('Closing totals');
    // layout text reader
    await expect(extractPdfTextWithLayout(pdf)).resolves.toContain('Closing totals');
    // text-first path (its page count was the silent doc.destroy() site)
    const first = await extractPdfTextFirst(pdf);
    expect(first.pageCount).toBe(3);
    expect(first.layoutError).toBeUndefined();
  });

  it('readPdfPageCount still THROWS on an unreadable PDF (the caller maps it to ocr_page_count_invalid)', async () => {
    const { readPdfPageCount } = await import('../_lib/pdfText');
    await expect(readPdfPageCount(Buffer.from('not a pdf'))).rejects.toBeTruthy();
  });

  it('the document is really released afterwards, including when the work throws', async () => {
    const { withPdfDocument } = await import('../_lib/pdfText');
    let kept: { getPage: (n: number) => Promise<unknown> } | null = null;
    await withPdfDocument(pdf, { verbosity: 0 }, (doc) => { kept = doc; return doc.numPages; });
    // A released document can no longer reach its transport (pdfjs throws/rejects on use).
    await expect((async () => kept!.getPage(1))()).rejects.toBeTruthy();

    let kept2: { getPage: (n: number) => Promise<unknown> } | null = null;
    await expect(withPdfDocument(pdf, { verbosity: 0 }, (doc) => { kept2 = doc; throw new Error('work failed'); }))
      .rejects.toThrow('work failed'); // the original error, not a release error
    await expect((async () => kept2!.getPage(1))()).rejects.toBeTruthy();
  });

  it('the OCR background function counts pages through the shared helper', () => {
    const src = fs.readFileSync(path.join(root, 'netlify/functions/smart-import-ocr-background.ts'), 'utf8');
    expect(src).toMatch(/totalPages = await readPdfPageCount\(buf\);/);
  });

  const SKIP = new Set(['node_modules', 'dist', '.netlify', '__tests__', 'functions_old']);
  const walk = (dir: string, out: string[] = []): string[] => {
    if (!fs.existsSync(dir)) return out;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP.has(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else if (/\.(ts|js|mjs|cjs)$/.test(e.name)) out.push(p);
    }
    return out;
  };

  it('guard: server getDocument() only in the shared helper (+ the documented pdfToImages render path)', () => {
    // pdfToImages keeps its own load (retry + Ghostscript fallback across rendering); tracked separately.
    const ALLOWED = new Set(['netlify/functions/_lib/pdfText.ts', 'netlify/functions/lib/pdf/pdfToImages.ts']);
    const callers = walk(path.join(root, 'netlify'))
      .filter((f) => /\bgetDocument\(/.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(root, f).split(path.sep).join('/'));
    expect(callers.filter((f) => !ALLOWED.has(f))).toEqual([]);
    const helper = fs.readFileSync(path.join(root, 'netlify/functions/_lib/pdfText.ts'), 'utf8');
    expect(helper.match(/\bgetDocument\(/g)?.length).toBe(1);
  });

  it('guard: no server code or script calls destroy() on a PDF.js document object', () => {
    const offenders = ['netlify', 'scripts']
      .flatMap((d) => walk(path.join(root, d)))
      .filter((f) => {
        const s = fs.readFileSync(f, 'utf8');
        return /pdfjs-dist|_lib\/pdfText/.test(s) && /\b(pdfDoc|doc|pdf|document)\??\.destroy\(/.test(s);
      })
      .map((f) => path.relative(root, f));
    expect(offenders).toEqual([]);
  });
});
