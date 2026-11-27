/**
 * Browser PDF.js entry point (owner security GO 2026-11-27): self-hosted worker from the same
 * installed version, self-hosted cMaps / fonts, eval always off. Also covers the held-statement
 * discrepancy viewer's wiring and its honest on-screen wording.
 */
import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const calls: Array<Record<string, unknown>> = [];
const workerOptions: { workerSrc?: string } = {};
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: workerOptions,
  version: '6.5.438',
  getDocument: (args: Record<string, unknown>) => { calls.push(args); return { promise: Promise.resolve({ numPages: 1 }) }; },
}));
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: '/assets/pdf.worker.min-test.mjs' }));

const root = path.resolve(__dirname, '../../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('pdfjsBrowser', () => {
  it('sets a self-hosted worker (no CDN) on import', async () => {
    await import('../pdfjsBrowser');
    expect(workerOptions.workerSrc).toBe('/assets/pdf.worker.min-test.mjs');
    expect(String(workerOptions.workerSrc)).not.toMatch(/^https?:|^\/\//);
  });

  it('loadPdfDocument always disables eval, even if a caller tries to enable it, and uses self-hosted assets', async () => {
    const { loadPdfDocument } = await import('../pdfjsBrowser');
    calls.length = 0;
    loadPdfDocument({ url: '/signed/statement.pdf' }, { isEvalSupported: true });
    loadPdfDocument({ data: new Uint8Array([1, 2, 3]) });
    expect(calls).toHaveLength(2);
    for (const c of calls) {
      expect(c.isEvalSupported).toBe(false);
      expect(c.cMapUrl).toBe('/pdfjs/cmaps/');
      expect(c.standardFontDataUrl).toBe('/pdfjs/standard_fonts/');
    }
    expect(calls[0].url).toBe('/signed/statement.pdf');
  });
});

describe('browser PDF.js usage (static)', () => {
  const browserFiles = [
    'src/components/transactions/StatementPdfViewer.tsx',
    'src/client/pdf/extractText.ts',
    'src/client/pdf/pdfWorkerConfig.ts',
    'src/client/pdf/pdfjs.ts',
    'src/utils/pdfParser.ts',
    'src/components/tools/PDFToImageConverter.tsx',
    'src/components/chat/_legacy/ByteDocumentChat.tsx',
  ];

  it('no browser file loads PDF.js, its worker, cMaps or fonts from a CDN', () => {
    for (const f of browserFiles) {
      expect(read(f), f).not.toMatch(/cdnjs\.cloudflare\.com\/ajax\/libs\/pdf|unpkg\.com\/pdfjs|jsdelivr\.net\/npm\/pdfjs/);
    }
  });

  it('only pdfjsBrowser.ts imports pdfjs-dist in the browser bundle', () => {
    for (const f of browserFiles) {
      expect(read(f), f).not.toMatch(/from ['"]pdfjs-dist['"]|import\(['"]pdfjs-dist['"]\)/);
    }
  });

  it('Vite self-hosts the cMaps and standard fonts from the installed package', () => {
    const cfg = read('vite.config.ts');
    expect(cfg).toMatch(/pdfjsSelfHostedAssets\(\)/);
    expect(cfg).toMatch(/node_modules\/pdfjs-dist/);
  });
});

describe('held-statement discrepancy viewer', () => {
  const viewer = read('src/components/transactions/StatementPdfViewer.tsx');
  it('loads through the self-hosted, eval-disabled loader', () => {
    expect(viewer).toMatch(/import \{ loadPdfDocument \} from '\.\.\/\.\.\/client\/pdf\/pdfjsBrowser';/);
    expect(viewer).toMatch(/loadPdfDocument\(\{ url \}\)/);
    expect(viewer).not.toMatch(/window\.pdfjsLib|document\.createElement\('script'\)/);
  });
  it('still skips page 1 and covers the header band (behaviour preserved)', () => {
    expect(viewer).toMatch(/const REDACT_HEADER_PX = 80;/);
    expect(viewer).toMatch(/i \+ 2/);
  });
  it('never describes visual masking as redaction (owner direction 2026-11-27)', () => {
    expect(viewer).not.toMatch(/redacted for privacy/i);
    expect(viewer).toMatch(/Header hidden on screen \\u2014 this is the original statement, private to you/);
    expect(viewer).not.toMatch(/never uploaded to any server/i);
  });
});
