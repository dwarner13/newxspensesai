// src/client/pdf/pdfWorkerConfig.ts
// Kept for existing imports. The worker is configured once, self-hosted, in ./pdfjsBrowser
// (same installed pdfjs-dist version as the library; no CDN fallback).
import { pdfjsLib } from './pdfjsBrowser';

export function configurePdfWorker() {
  // No-op: ./pdfjsBrowser sets GlobalWorkerOptions.workerSrc on import.
}

export { pdfjsLib };
