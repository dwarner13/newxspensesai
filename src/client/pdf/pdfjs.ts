// src/client/pdf/pdfjs.ts
// Kept for compatibility. Use ./pdfjsBrowser (loadPdfDocument) for every document load.
import { pdfjsLib, loadPdfDocument } from './pdfjsBrowser';

export const GlobalWorkerOptions = pdfjsLib.GlobalWorkerOptions;
export { loadPdfDocument };
