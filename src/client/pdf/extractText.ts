// src/client/pdf/extractText.ts
import * as pdfjsLib from "pdfjs-dist";
import { getPdfMetadata } from "./metadata";

// Configure PDF.js worker with matching version
function setupPdfWorker() {
  // Use CDN worker URL that matches the installed pdfjs-dist version (5.4.149)
  const version = '5.4.149'; // Match the installed version
  const cdnWorkerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.js`;
  
  pdfjsLib.GlobalWorkerOptions.workerSrc = cdnWorkerSrc;
  console.log('PDF.js worker configured:', cdnWorkerSrc, 'version:', version);
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
  console.log('Extracting text from PDF file:', file.name, 'size:', file.size);
  
  // Clone the ArrayBuffer to avoid detachment issues
  const ab = await file.arrayBuffer();
  const data = new Uint8Array(ab.slice(0)); // This creates a copy

  let pdf;
  try {
    console.log('Attempting to load PDF with worker...');
    // Try with worker first
    pdf = await pdfjsLib.getDocument({ 
      data: data.buffer.slice(0), // Ensure we have a fresh buffer
      useWorkerFetch: false,
      disableWorker: false
    }).promise;
    console.log('PDF loaded successfully with worker');
  } catch (workerError) {
    console.warn('Worker failed, trying without worker:', workerError);
    try {
      // Try without worker using a fresh buffer
      pdf = await pdfjsLib.getDocument({ 
        data: data.buffer.slice(0), // Fresh buffer for fallback
        disableWorker: true,
        useWorkerFetch: false
      }).promise;
      console.log('PDF loaded successfully without worker');
    } catch (noWorkerError) {
      console.error('PDF loading failed completely:', noWorkerError);
      throw new Error(`Failed to load PDF: ${noWorkerError instanceof Error ? noWorkerError.message : 'Unknown error'}`);
    }
  }

  const pages = pdf.numPages;
  console.log('PDF has', pages, 'pages');
  
  const take = Math.min(pages, maxPages);
  const textByPage: string[] = [];
  let itemsCount = 0;

  for (let i = 1; i <= take; i++) {
    console.log('Processing page', i);
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    itemsCount += content.items.length;
    const text = content.items.map((it: any) => (it.str ?? "")).join(" ");
    textByPage.push(text.replace(/\s+/g, " ").trim());
  }

  const hasTextLayer = itemsCount > 25;
  const textSample = textByPage.join("\n\n").slice(0, 4000);
  
  console.log('Text extraction complete:', {
    pages,
    itemsCount,
    hasTextLayer,
    textSampleLength: textSample.length,
    textByPageCount: textByPage.length
  });

  return {
    pages,
    hasTextLayer,
    textSample,
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
