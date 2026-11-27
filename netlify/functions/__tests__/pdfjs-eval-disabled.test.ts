/**
 * CVE-2024-4367 (PDF.js arbitrary JavaScript execution through a crafted font; GHSA-wgrm-67xf-hhpq):
 * every PDF.js document load must pass `isEvalSupported: false`, in the browser AND in Netlify
 * functions. Owner GO 2026-11-27. Architecture regression test: fails when ANY `getDocument(`
 * call in src/, netlify/ or scripts/ omits the option, including new code.
 *
 * Static only. The vulnerability is never exercised (owner instruction: do not attempt to exploit).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../../..');
const SCAN_DIRS = ['src', 'netlify', 'scripts'];
const SKIP = new Set(['node_modules', 'dist', '.netlify', '__tests__']);

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p);
  }
  return out;
}

/** The argument text of each `getDocument(` call (up to the matching close paren). */
function getDocumentCalls(src: string): Array<{ line: number; args: string }> {
  const calls: Array<{ line: number; args: string }> = [];
  const re = /\bgetDocument\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    let depth = 1;
    let i = m.index + m[0].length;
    for (; i < src.length && depth > 0; i++) {
      if (src[i] === '(') depth++;
      else if (src[i] === ')') depth--;
    }
    calls.push({ line: src.slice(0, m.index).split('\n').length, args: src.slice(m.index + m[0].length, i - 1) });
  }
  return calls;
}

// Not PDF.js: a database helper that happens to be called getDocument(documentId).
const NOT_PDFJS = [/^\s*documentId\s*$/, /^\s*options\.documentId\s*$/];

describe('CVE-2024-4367: PDF.js eval is disabled at every document load', () => {
  const files = SCAN_DIRS.flatMap((d) => walk(path.join(root, d)));

  it('scans the known browser and server entry points (guards against an empty scan)', () => {
    const rel = files.map((f) => path.relative(root, f).replace(/\\/g, '/'));
    for (const expected of [
      'src/components/transactions/StatementPdfViewer.tsx',
      'netlify/functions/lib/pdf/pdfToImages.ts',
      'netlify/functions/_lib/pdfText.ts',
      'netlify/functions/_shared/documentPurpose.ts',
      'netlify/functions/smart-import-ocr-background.ts',
    ]) {
      expect(rel).toContain(expected);
    }
  });

  it('every getDocument(...) call passes isEvalSupported: false', () => {
    const offenders: string[] = [];
    let checked = 0;
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      for (const c of getDocumentCalls(src)) {
        if (NOT_PDFJS.some((r) => r.test(c.args))) continue;
        checked++;
        if (!/isEvalSupported\s*:\s*false/.test(c.args)) {
          offenders.push(`${path.relative(root, f)}:${c.line}`);
        }
      }
    }
    expect(offenders).toEqual([]);
    // 14 call sites before the 6.x upgrade; browser loads now go through the single
    // src/client/pdf/pdfjsBrowser.ts loadPdfDocument, so there are fewer, never zero.
    expect(checked).toBeGreaterThanOrEqual(7);
  });

  it('no call enables eval explicitly', () => {
    for (const f of files) {
      expect(fs.readFileSync(f, 'utf8'), path.relative(root, f)).not.toMatch(/isEvalSupported\s*:\s*true/);
    }
  });
});
