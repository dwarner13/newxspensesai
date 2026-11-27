/**
 * The ONE browser entry point for PDF.js (owner GO 2026-11-27: CVE-2024-4367 / CVE-2026-16633 fix).
 *
 * - Library and worker come from the SAME installed pdfjs-dist version, bundled and self-hosted by
 *   Vite (`?url` asset): no cdnjs / unpkg / jsdelivr, no version drift between library and worker.
 * - Character maps and standard font data are self-hosted at /pdfjs/cmaps/ and
 *   /pdfjs/standard_fonts/ (copied from the same pdfjs-dist by the vite.config.ts plugin).
 * - Every document load goes through `loadPdfDocument`, which forces `isEvalSupported: false`
 *   (and keeps the architecture guard test satisfied for any direct getDocument call).
 */
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export const PDFJS_ASSET_BASE = '/pdfjs/';

type LoadSource = { url: string } | { data: ArrayBuffer | Uint8Array };

/** Load a PDF with the security-relevant options fixed. Extra options cannot re-enable eval. */
export function loadPdfDocument(source: LoadSource, extra: Record<string, unknown> = {}) {
  return pdfjsLib.getDocument({
    cMapUrl: `${PDFJS_ASSET_BASE}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${PDFJS_ASSET_BASE}standard_fonts/`,
    ...extra,
    ...source,
    isEvalSupported: false, // CVE-2024-4367: never compile fonts with eval
  });
}

export { pdfjsLib };
