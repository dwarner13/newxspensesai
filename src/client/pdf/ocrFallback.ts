// src/client/pdf/ocrFallback.ts
import Tesseract from 'tesseract.js';

export async function extractWithOCR(file: File): Promise<string> {
  try {
    console.log('Starting OCR extraction for:', file.name);
    
    const { data: { text } } = await Tesseract.recognize(
      file,
      'eng',
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );
    
    return text.trim();
  } catch (error) {
    console.error('OCR extraction failed:', error);
    throw new Error(`OCR failed: ${error.message}`);
  }
}

// Check if PDF might be scanned (image-based)
export async function isScannedPdf(file: File): Promise<boolean> {
  try {
    // Quick heuristic: if text extraction returns very little text
    // relative to file size, it might be scanned
    const { extractPdfTextSafe } = await import('./extractText');
    const text = await extractPdfTextSafe(file);
    const textDensity = text.length / file.size;
    
    // If less than 0.01 characters per byte, likely scanned
    return textDensity < 0.01;
  } catch {
    return true; // Assume scanned if extraction fails
  }
}
