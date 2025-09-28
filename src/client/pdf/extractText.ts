// src/client/pdf/extractText.ts
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Main safe extraction function that was MISSING
export async function extractPdfTextSafe(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText.trim();
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
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const metadata = await pdf.getMetadata();
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    return {
      text: fullText.trim(),
      pageCount: pdf.numPages,
      metadata: metadata.info
    };
  } catch (error) {
    console.error('Structured extraction error:', error);
    throw error;
  }
}