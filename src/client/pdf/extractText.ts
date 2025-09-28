// src/client/pdf/extractText.ts
import * as pdfjsLib from "pdfjs-dist";
import { getPdfMetadata } from "./metadata";

// Configure PDF.js worker with working CDN
function setupPdfWorker() {
  // Use working CDN worker URL
  const cdnWorkerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  
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

// Improved PDF text extraction function
export async function extractPdfTextFromFile(file: File, maxPages = 5): Promise<ExtractResult> {
  const ab = await file.arrayBuffer();
  const data = new Uint8Array(ab.slice(0));

  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data }).promise;
  } catch {
    pdf = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
  }

  const pages = pdf.numPages;
  const take = Math.min(pages, maxPages);
  const textByPage: string[] = [];
  let itemsCount = 0;

  for (let i = 1; i <= take; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    itemsCount += content.items.length;
    const text = content.items.map((it: any) => (it.str ?? "")).join(" ");
    textByPage.push(text.replace(/\s+/g, " ").trim());
  }

  return {
    pages,
    hasTextLayer: itemsCount > 25,
    textSample: textByPage.join("\n\n").slice(0, 4000),
    textByPage
  };
}

// Legacy function for backward compatibility
export async function extractPdfText(arrayBuffer: ArrayBuffer, options?: { maxPages?: number, includeMetadata?: boolean }): Promise<ExtractResult> {
  const data = new Uint8Array(arrayBuffer.slice(0));
  
  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data }).promise;
  } catch {
    pdf = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
  }

  const pages = pdf.numPages;
  const maxPages = Math.min(options?.maxPages ?? pages, pages);
  const textByPage: string[] = [];
  let itemsCount = 0;

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    itemsCount += content.items.length;
    const text = content.items.map((it: any) => (it.str ?? "")).join(" ");
    textByPage.push(text.replace(/\s+/g, " ").trim());
  }

  const hasTextLayer = itemsCount > 25;
  const textSample = textByPage.join("\n\n").slice(0, 4000);
  
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
    pages,
    hasTextLayer,
    textByPage,
    textSample,
    metadata
  };
}

// Main export with automatic fallback
export async function extractPdfTextSafe(arrayBuffer: ArrayBuffer, options?: { maxPages?: number, includeMetadata?: boolean }): Promise<ExtractResult> {
  try {
    return await extractPdfText(arrayBuffer, options);
  } catch (error) {
    console.error('PDF text extraction failed:', error);
    
    // Return a minimal result instead of throwing
    return {
      pages: 0,
      hasTextLayer: false,
      textByPage: [],
      textSample: 'PDF text extraction failed. This may be a scanned PDF or corrupted file.'
    };
  }
}
