// src/client/pdf/extractText.ts
import * as pdfjsLib from "pdfjs-dist";
import { getPdfMetadata } from "./metadata";

// Configure PDF.js worker with CDN fallback
function setupPdfWorker() {
  // Use CDN worker directly - more reliable than bundled worker
  const cdnWorkerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js';
  
  pdfjsLib.GlobalWorkerOptions.workerSrc = cdnWorkerSrc;
  console.log('PDF.js worker configured:', cdnWorkerSrc);
}

setupPdfWorker();

type ExtractResult = {
  pages: number;
  hasTextLayer: boolean;
  textByPage: string[];
  textSample: string;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    pages: number;
  };
};

function normalizeSpaces(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

export async function extractPdfText(arrayBuffer: ArrayBuffer, options?: { maxPages?: number, includeMetadata?: boolean }): Promise<ExtractResult> {
  const loadingTask = pdfjsLib.getDocument({ 
    data: arrayBuffer,
    useWorkerFetch: false,
    disableWorker: false,
    // Optimize for text extraction
    maxImageSize: 1024 * 1024,
    disableFontFace: false,
    disableRange: false,
    disableStream: false,
    // Add timeout
    timeout: 10000
  });
  
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;
  const maxPages = Math.min(options?.maxPages ?? pageCount, pageCount);
  const textByPage: string[] = [];
  let textItemCount = 0;

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    textItemCount += content.items.length;
    const pageText = content.items
      .map((it: any) => ("str" in it ? it.str : ""))
      .join(" ");
    textByPage.push(normalizeSpaces(pageText));
  }

  const hasTextLayer = textItemCount > 25; // threshold: tweak if needed
  const joined = textByPage.join("\n\n").slice(0, 4000); // clamp sample
  
  // Get metadata if requested
  let metadata;
  if (options?.includeMetadata) {
    try {
      metadata = await getPdfMetadata(arrayBuffer);
    } catch (error) {
      console.warn('Failed to extract PDF metadata:', error);
    }
  }
  
  return {
    pages: pageCount,
    hasTextLayer,
    textByPage,
    textSample: joined,
    metadata
  };
}

// Fallback function for when worker fails
export async function extractPdfTextFallback(arrayBuffer: ArrayBuffer, options?: { maxPages?: number }): Promise<ExtractResult> {
  const loadingTask = pdfjsLib.getDocument({ 
    data: arrayBuffer,
    disableWorker: true,
    useWorkerFetch: false
  });
  
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;
  const maxPages = Math.min(options?.maxPages ?? pageCount, pageCount);
  const textByPage: string[] = [];
  let textItemCount = 0;

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    textItemCount += content.items.length;
    const pageText = content.items
      .map((it: any) => ("str" in it ? it.str : ""))
      .join(" ");
    textByPage.push(normalizeSpaces(pageText));
  }

  const hasTextLayer = textItemCount > 25;
  const joined = textByPage.join("\n\n").slice(0, 4000);
  return {
    pages: pageCount,
    hasTextLayer,
    textByPage,
    textSample: joined
  };
}

// Main export with automatic fallback
export async function extractPdfTextSafe(arrayBuffer: ArrayBuffer, options?: { maxPages?: number }): Promise<ExtractResult> {
  try {
    return await extractPdfText(arrayBuffer, options);
  } catch (error) {
    console.warn('PDF text extraction failed with worker, trying fallback:', error);
    try {
      return await extractPdfTextFallback(arrayBuffer, options);
    } catch (fallbackError) {
      console.error('PDF text extraction completely failed:', fallbackError);
      throw new Error(`PDF text extraction failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
    }
  }
}
