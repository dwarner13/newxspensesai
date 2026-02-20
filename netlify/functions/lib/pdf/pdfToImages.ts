import sharp from 'sharp';
let warnedMissingPdfPolyfills = false;
let loggedPdfPolyfillStatus = false;

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
};

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
  const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    disableWorker: true,
  });
  const doc = await loadingTask.promise;
  const totalPages = Number(doc.numPages || 0);
  const pagesToProcess = Math.min(totalPages, maxPages);
  const truncated = totalPages > maxPages;
  const pages: PdfPageImage[] = [];

  for (let idx = 1; idx <= pagesToProcess; idx += 1) {
    const page = await doc.getPage(idx);
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
    try {
      page.cleanup();
    } catch {
      // no-op
    }
  }

  return {
    pages,
    totalPages,
    processedPages: pagesToProcess,
    truncated,
    warning: truncated ? `PDF exceeded max pages (${maxPages}); processed first ${pagesToProcess}.` : undefined,
  };
}

