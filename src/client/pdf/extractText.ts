// src/client/pdf/extractText.ts
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry';

// Configure worker properly
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Safe extraction with proper error handling
export async function extractPdfTextSafe(file: File): Promise<string> {
  try {
    console.log('Starting PDF extraction for:', file.name);
    
    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF with specific settings to handle encoding
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/'
    });
    
    const pdf = await loadingTask.promise;
    console.log('PDF loaded, pages:', pdf.numPages);
    
    let fullText = '';
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Properly handle text items
      const pageText = textContent.items
        .map((item: any) => {
          if (typeof item.str === 'string') {
            return item.str;
          }
          return '';
        })
        .filter(text => text.length > 0)
        .join(' ');
        
      fullText += pageText + '\n';
    }
    
    // Clean up the text
    fullText = fullText
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    console.log('Extraction complete, text length:', fullText.length);
    
    if (fullText.length === 0) {
      throw new Error('No readable text found in PDF');
    }
    
    return fullText;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`Failed to extract PDF text: ${error.message}`);
  }
}

// Standard extraction function
export async function extractPdfText(file: File): Promise<string> {
  return extractPdfTextSafe(file);
}

// Helper function to extract structured data
export async function extractStructuredData(file: File): Promise<{
  text: string;
  pageCount: number;
  metadata?: any;
}> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/'
    });
    
    const pdf = await loadingTask.promise;
    const metadata = await pdf.getMetadata();
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => {
          if (typeof item.str === 'string') {
            return item.str;
          }
          return '';
        })
        .filter(text => text.length > 0)
        .join(' ');
        
      fullText += pageText + '\n';
    }
    
    // Clean up the text
    fullText = fullText
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    return {
      text: fullText,
      pageCount: pdf.numPages,
      metadata: metadata.info
    };
  } catch (error) {
    console.error('Structured extraction error:', error);
    throw error;
  }
}