import sharp from 'sharp';
import os from 'node:os';
import path from 'node:path';
import { promises as fs, existsSync, readdirSync } from 'node:fs';
import { execFile, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
let warnedMissingPdfPolyfills = false;
let loggedPdfPolyfillStatus = false;
const execFileAsync = promisify(execFile);

export type PdfPageImage = {
  pageIndex: number;
  imageBuffer: Buffer;
  width: number;
  height: number;
};

export type PdfToImagesResult = {
  pages: PdfPageImage[];
  totalPages: number;
  processedPages: number;
  truncated: boolean;
  warning?: string;
};

type PdfToImagesOptions = {
  maxPages?: number;
  scale?: number;
  maxImageBytes?: number;
  onPageRendered?: (processedPages: number, totalPages: number) => Promise<void> | void;
  continueOnPageError?: boolean;
};

function resolveGhostscriptExecutable(): string | null {
  const configured = String(process.env.OCR_GHOSTSCRIPT_BIN || '').trim();
  if (configured) {
    if (existsSync(configured)) return configured;
    // Allow bare executable names configured in env.
    return configured;
  }
  if (process.platform === 'win32') {
    // First try direct executable resolution on PATH.
    try {
      const whereRes = spawnSync('where', ['gswin64c'], {
        encoding: 'utf8',
        windowsHide: true,
      });
      const stdout = String(whereRes?.stdout || '').trim();
      const first = stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
      if (first && existsSync(first)) return first;
    } catch {
      // no-op
    }

    // Fallback: scan standard install location.
    const gsRoot = 'C:\\Program Files\\gs';
    if (existsSync(gsRoot)) {
      try {
        const versions = readdirSync(gsRoot, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
          .sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }));
        for (const version of versions) {
          const candidate = path.join(gsRoot, version, 'bin', 'gswin64c.exe');
          if (existsSync(candidate)) return candidate;
        }
      } catch {
        // no-op
      }
    }
    return 'gswin64c';
  }
  return 'gs';
}

async function tryGhostscriptRasterize(params: {
  pdfBuffer: Buffer;
  dpi: number;
  maxPages: number;
  maxImageBytes: number;
}): Promise<PdfToImagesResult | null> {
  if (String(process.env.OCR_ENABLE_GHOSTSCRIPT_FALLBACK || '1') === '0') {
    console.warn('[OCR] ghostscript raster fallback skipped (disabled by env)');
    return null;
  }
  const gsBin = resolveGhostscriptExecutable();
  if (!gsBin) return null;
  console.log('[OCR] attempting ghostscript raster fallback', {
    bin: gsBin,
    dpi: params.dpi,
    maxPages: params.maxPages,
  });

  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'xspenses-gs-'));
  const inPdf = path.join(tmpRoot, 'input.pdf');
  const outPattern = path.join(tmpRoot, 'page-%03d.png');
  try {
    await fs.writeFile(inPdf, params.pdfBuffer);
    const args = [
      '-q',
      '-dSAFER',
      '-dBATCH',
      '-dNOPAUSE',
      '-sDEVICE=png16m',
      `-r${Math.max(72, Math.round(params.dpi))}`,
      '-o',
      outPattern,
      inPdf,
    ];
    await execFileAsync(gsBin, args, {
      timeout: Math.max(20000, Number(process.env.OCR_GHOSTSCRIPT_TIMEOUT_MS || 60000)),
      windowsHide: true,
      maxBuffer: 32 * 1024 * 1024,
    });

    const entries = (await fs.readdir(tmpRoot))
      .filter((name) => /^page-\d{3}\.png$/i.test(name))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (entries.length === 0) return null;

    const totalPages = entries.length;
    const selected = entries.slice(0, params.maxPages);
    const truncated = totalPages > params.maxPages;
    const pages: PdfPageImage[] = [];
    for (let idx = 0; idx < selected.length; idx += 1) {
      const pngPath = path.join(tmpRoot, selected[idx]);
      const pngBuffer = await fs.readFile(pngPath);
      const imageBuffer = await compressImage(pngBuffer, params.maxImageBytes);
      const meta = await sharp(pngBuffer).metadata().catch(() => null);
      pages.push({
        pageIndex: idx,
        imageBuffer,
        width: Number(meta?.width || 0),
        height: Number(meta?.height || 0),
      });
    }
    console.log('[OCR] ghostscript raster fallback success', {
      pagesGenerated: pages.length,
      totalPages,
      truncated,
      dpi: params.dpi,
    });
    return {
      pages,
      totalPages,
      processedPages: pages.length,
      truncated,
      warning: truncated
        ? `Ghostscript raster fallback truncated to first ${params.maxPages} pages.`
        : undefined,
    };
  } catch (error: any) {
    const stderrTail = String(error?.stderr || '')
      .trim()
      .slice(-500);
    const stdoutTail = String(error?.stdout || '')
      .trim()
      .slice(-500);
    console.warn('[OCR] ghostscript raster fallback failed', {
      error: String(error?.message || error || 'ghostscript_failed'),
      code: error?.code ?? null,
      signal: error?.signal ?? null,
      stderrTail: stderrTail || undefined,
      stdoutTail: stdoutTail || undefined,
      bin: gsBin,
    });
    return null;
  } finally {
    await fs.rm(tmpRoot, { recursive: true, force: true }).catch(() => undefined);
  }
}

function toBufferFromCanvas(canvas: any): Buffer {
  if (typeof canvas?.toBuffer === 'function') {
    return canvas.toBuffer('image/png');
  }
  if (typeof canvas?.encode === 'function') {
    const encoded = canvas.encode('png');
    return Buffer.isBuffer(encoded) ? encoded : Buffer.from(encoded);
  }
  if (typeof canvas?.toDataURL === 'function') {
    const dataUrl: string = canvas.toDataURL('image/png');
    const b64 = dataUrl.split(',')[1] || '';
    return Buffer.from(b64, 'base64');
  }
  throw new Error('Canvas does not support buffer export');
}

async function compressImage(buffer: Buffer, maxBytes: number): Promise<Buffer> {
  let quality = 85;
  let width: number | undefined;
  let output = buffer;
  const metadata = await sharp(buffer).metadata().catch(() => null);
  if (metadata?.width) {
    width = metadata.width;
  }
  for (let i = 0; i < 6; i += 1) {
    output = await sharp(buffer)
      .rotate()
      .resize(width ? { width, withoutEnlargement: true } : undefined)
      .jpeg({ quality })
      .toBuffer();
    if (output.length <= maxBytes) {
      return output;
    }
    quality = Math.max(55, quality - 8);
    if (width && i >= 2) {
      width = Math.max(1000, Math.round(width * 0.85));
    }
  }
  return output;
}

export async function pdfToImages(
  pdfBuffer: Buffer,
  options: PdfToImagesOptions = {}
): Promise<PdfToImagesResult> {
  const maxPages = Number.isFinite(options.maxPages) ? Math.max(1, Number(options.maxPages)) : 10;
  const scale = Number.isFinite(options.scale) ? Math.max(1, Number(options.scale)) : 2;
  const maxImageBytes = Number.isFinite(options.maxImageBytes) ? Math.max(300_000, Number(options.maxImageBytes)) : 950 * 1024;
  const continueOnPageError = options.continueOnPageError !== false;
  const renderDpi = Math.round(scale * 72);

  // Keep native canvas package runtime-resolved so bundlers don't try to inline .node binaries.
  const runtimeImport = new Function('m', 'return import(m)') as (m: string) => Promise<any>;
  const canvasPkg = process.env.OCR_CANVAS_PACKAGE || '@napi-rs/canvas';
  const canvasMod: any = await runtimeImport(canvasPkg);
  const createCanvas = canvasMod?.createCanvas;
  if (typeof createCanvas !== 'function') {
    throw new Error('Missing @napi-rs/canvas createCanvas');
  }
  // pdfjs in Node still expects browser-like globals for matrix/path APIs.
  if (typeof (globalThis as any).DOMMatrix === 'undefined' && canvasMod?.DOMMatrix) {
    (globalThis as any).DOMMatrix = canvasMod.DOMMatrix;
  }
  if (typeof (globalThis as any).ImageData === 'undefined' && canvasMod?.ImageData) {
    (globalThis as any).ImageData = canvasMod.ImageData;
  }
  if (typeof (globalThis as any).Path2D === 'undefined' && canvasMod?.Path2D) {
    (globalThis as any).Path2D = canvasMod.Path2D;
  }
  const polyfillsReady = {
    DOMMatrix: typeof (globalThis as any).DOMMatrix !== 'undefined',
    ImageData: typeof (globalThis as any).ImageData !== 'undefined',
    Path2D: typeof (globalThis as any).Path2D !== 'undefined',
  };
  if ((!polyfillsReady.DOMMatrix || !polyfillsReady.ImageData || !polyfillsReady.Path2D) && !warnedMissingPdfPolyfills) {
    console.warn('[OCR] PDF polyfill missing — scanned rendering may degrade');
    warnedMissingPdfPolyfills = true;
  }
  if (!loggedPdfPolyfillStatus) {
    console.log('[OCR] pdfjs polyfills ready', {
      ...polyfillsReady,
      runtime: process.env.NETLIFY === 'true' ? 'node/netlify' : 'node',
    });
    loggedPdfPolyfillStatus = true;
  }
  const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.js');

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    disableWorker: true,
    stopAtErrors: false,
    stopOnErrors: false,
    disableAutoFetch: true,
    disableStream: true,
    verbosity: 0,
  });
  let doc: any = null;
  try {
    doc = await loadingTask.promise;
  } catch (loadError: any) {
    const firstError = String(loadError?.message || loadError || 'pdf_load_error');
    console.warn('[OCR] pdfjs loadingTask rejected; retrying permissive load', {
      error: firstError,
    });
    try {
      const recoveryTask = pdfjs.getDocument({
        data: new Uint8Array(pdfBuffer),
        disableWorker: true,
        stopAtErrors: false,
        stopOnErrors: false,
        disableAutoFetch: true,
        disableStream: true,
        verbosity: 0,
      });
      doc = await recoveryTask.promise;
      console.log('[OCR] pdfjs loading recovery succeeded');
    } catch (recoveryError: any) {
      const secondError = String(recoveryError?.message || recoveryError || 'pdf_load_recovery_error');
      console.warn('[OCR] pdfjs loading recovery failed', {
        firstError,
        recoveryError: secondError,
      });
      console.warn('[OCR] pdfjs failed; invoking ghostscript fallback path');
      const gsFallback = await tryGhostscriptRasterize({
        pdfBuffer,
        dpi: renderDpi,
        maxPages,
        maxImageBytes,
      });
      if (gsFallback) {
        return gsFallback;
      }
      throw recoveryError;
    }
  }
  const totalPages = Number(doc.numPages || 0);
  const pagesToProcess = Math.min(totalPages, maxPages);
  const truncated = totalPages > maxPages;
  const pages: PdfPageImage[] = [];
  const failedPages: Array<{ pageIndex: number; error: string }> = [];

  for (let idx = 1; idx <= pagesToProcess; idx += 1) {
    let page: any = null;
    try {
      page = await doc.getPage(idx);
      const viewport = page.getViewport({ scale });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const ctx = canvas.getContext('2d');
      await page.render({
        canvasContext: ctx,
        viewport,
      }).promise;
      const pngBuffer = toBufferFromCanvas(canvas);
      const imageBuffer = await compressImage(pngBuffer, maxImageBytes);
      pages.push({
        pageIndex: idx - 1,
        imageBuffer,
        width: Math.ceil(viewport.width),
        height: Math.ceil(viewport.height),
      });
      if (options.onPageRendered) {
        await options.onPageRendered(idx, totalPages);
      }
    } catch (pageError: any) {
      const message = String(pageError?.message || pageError || 'page_render_error');
      failedPages.push({ pageIndex: idx - 1, error: message });
      console.warn('[OCR] pdfjs page render failed; skipping page', {
        pageIndex: idx - 1,
        error: message,
      });
      if (!continueOnPageError) {
        throw pageError;
      }
      continue;
    } finally {
      try {
        page?.cleanup?.();
      } catch {
        // no-op
      }
    }
  }

  const bypassed = failedPages.length > 0;
  if (bypassed) {
    console.log('[OCR] pdfjs rendering bypassed stream errors -> images generated', {
      requestedPages: pagesToProcess,
      generatedPages: pages.length,
      failedPages: failedPages.length,
    });
  }
  const warningParts: string[] = [];
  if (truncated) {
    warningParts.push(`PDF exceeded max pages (${maxPages}); processed first ${pagesToProcess}.`);
  }
  if (failedPages.length > 0) {
    warningParts.push(`Skipped ${failedPages.length} page(s) due to render errors.`);
  }

  return {
    pages,
    totalPages,
    processedPages: pages.length,
    truncated,
    warning: warningParts.length > 0 ? warningParts.join(' ') : undefined,
  };
}

