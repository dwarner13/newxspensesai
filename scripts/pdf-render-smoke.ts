import fs from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { pdfToImages } from '../netlify/functions/lib/pdf/pdfToImages.ts';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function run(): Promise<void> {
  const runtimeImport = new Function('m', 'return import(m)') as (m: string) => Promise<any>;
  const canvasPkg = process.env.OCR_CANVAS_PACKAGE || '@napi-rs/canvas';
  const canvasMod: any = await runtimeImport(canvasPkg);
  if (typeof (globalThis as any).DOMMatrix === 'undefined' && canvasMod?.DOMMatrix) {
    (globalThis as any).DOMMatrix = canvasMod.DOMMatrix;
  }
  if (typeof (globalThis as any).ImageData === 'undefined' && canvasMod?.ImageData) {
    (globalThis as any).ImageData = canvasMod.ImageData;
  }
  if (typeof (globalThis as any).Path2D === 'undefined' && canvasMod?.Path2D) {
    (globalThis as any).Path2D = canvasMod.Path2D;
  }
  const polyfillsDetected = {
    DOMMatrix: typeof (globalThis as any).DOMMatrix !== 'undefined',
    ImageData: typeof (globalThis as any).ImageData !== 'undefined',
    Path2D: typeof (globalThis as any).Path2D !== 'undefined',
  };

  const fileArg = process.argv[2];
  let pdfBuffer: Buffer;
  let fileLabel = 'generated-smoke.pdf';
  if (!fileArg) {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([612, 792]);
    const bytes = await pdfDoc.save();
    pdfBuffer = Buffer.from(bytes);
  } else {
    const absPath = path.resolve(process.cwd(), fileArg);
    pdfBuffer = await fs.readFile(absPath);
    fileLabel = path.basename(absPath);
  }
  const rendered = await pdfToImages(pdfBuffer, {
    maxPages: 1,
    scale: 2,
    maxImageBytes: 950 * 1024,
  });
  assert(rendered.pages.length > 0, 'no pages rendered');
  const first = rendered.pages[0];
  assert(first.imageBuffer.length > 0, 'first rendered image buffer is empty');
  console.log('[pdf-render-smoke] PASS', {
    file: fileLabel,
    totalPages: rendered.totalPages,
    renderedPages: rendered.pages.length,
    firstImageBytes: first.imageBuffer.length,
    polyfillsDetected,
    width: first.width,
    height: first.height,
  });
}

run().catch((error: any) => {
  console.error('[pdf-render-smoke] FAIL', error?.message || error);
  process.exitCode = 1;
});

