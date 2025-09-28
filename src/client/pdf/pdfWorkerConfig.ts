// src/client/pdf/pdfWorkerConfig.ts
import * as pdfjsLib from 'pdfjs-dist';

// Use CDN worker as fallback if local worker fails
export function configurePdfWorker() {
  // Try local worker first
  try {
    const workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.js',
      import.meta.url
    ).toString();
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
  } catch (error) {
    console.warn('Local worker failed, using CDN fallback');
    // Use CDN fallback with correct version
    pdfjsLib.GlobalWorkerOptions.workerSrc = 
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
}

// Initialize on import
configurePdfWorker();

export { pdfjsLib };
