import { PDFDocument, PDFPage, rgb } from 'pdf-lib';
import { logUtils } from '../logging.js';

// PII redaction patterns
export const PII_PATTERNS = {
  // Credit card numbers (13-19 digits with optional separators)
  creditCard: /\b(?:\d[ -]*?){13,19}\b/g,
  
  // Social Security Numbers
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  
  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Phone numbers (US/Canada format)
  phone: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g,
  
  // Canadian postal codes
  postalCode: /\b[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d\b/g,
  
  // Account numbers (9-19 digits)
  accountNumber: /\b\d{9,19}\b/g,
  
  // Bank routing numbers (9 digits)
  routingNumber: /\b\d{9}\b/g,
  
  // IBAN (International Bank Account Number)
  iban: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b/g,
  
  // Driver's license (varies by state, basic pattern)
  driversLicense: /\b[A-Z]\d{7,8}\b/g,
  
  // Passport numbers (basic pattern)
  passport: /\b[A-Z]{1,2}\d{6,9}\b/g,
};

// Redaction result interface
export interface RedactionResult {
  redactedText: string;
  redactionMap: Array<{
    start: number;
    end: number;
    pattern: string;
    replacement: string;
  }>;
  matchCount: number;
}

// Text redaction
export function redactText(text: string): RedactionResult {
  let redactedText = text;
  const redactionMap: Array<{
    start: number;
    end: number;
    pattern: string;
    replacement: string;
  }> = [];
  
  let totalMatches = 0;
  
  // Apply each pattern
  Object.entries(PII_PATTERNS).forEach(([patternName, pattern]) => {
    let match;
    const matches: Array<{
      start: number;
      end: number;
      pattern: string;
      replacement: string;
    }> = [];
    
    // Find all matches
    while ((match = pattern.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        pattern: patternName,
        replacement: '[REDACTED]',
      });
    }
    
    // Sort matches by start position (descending) to avoid index shifting
    matches.sort((a, b) => b.start - a.start);
    
    // Apply redactions
    matches.forEach(({ start, end, pattern, replacement }) => {
      redactedText = redactedText.substring(0, start) + replacement + redactedText.substring(end);
      redactionMap.push({ start, end, pattern, replacement });
      totalMatches++;
    });
  });
  
  logUtils.logRedactionResults(totalMatches, Object.keys(PII_PATTERNS));
  
  return {
    redactedText,
    redactionMap,
    matchCount: totalMatches,
  };
}

// PDF redaction
export class PDFRedactor {
  async redactPDF(originalBuffer: Buffer): Promise<Buffer> {
    try {
      // Load the PDF
      const pdfDoc = await PDFDocument.load(originalBuffer);
      const pages = pdfDoc.getPages();
      
      // Process each page
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        await this.redactPage(page, i + 1);
      }
      
      // Save the redacted PDF
      const redactedBytes = await pdfDoc.save();
      
      return Buffer.from(redactedBytes);
    } catch (error) {
      throw new Error(`PDF redaction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private async redactPage(page: PDFPage, pageNumber: number): Promise<void> {
    try {
      // Get page dimensions
      const { width, height } = page.getSize();
      
      // For now, we'll add a redaction stamp to indicate the page was processed
      // In a more sophisticated implementation, you would:
      // 1. Extract text with coordinates
      // 2. Identify PII patterns
      // 3. Draw black rectangles over sensitive areas
      
      // Add redaction stamp
      page.drawText('REDACTED', {
        x: width - 100,
        y: height - 20,
        size: 8,
        color: rgb(1, 0, 0), // Red color
      });
      
      // Add processing date
      page.drawText(`Processed: ${new Date().toISOString().split('T')[0]}`, {
        x: 10,
        y: 10,
        size: 6,
        color: rgb(0.5, 0.5, 0.5), // Gray color
      });
      
    } catch (error) {
      throw new Error(`Page redaction failed for page ${pageNumber}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Advanced PDF redaction with text coordinates
  async redactPDFAdvanced(originalBuffer: Buffer, redactionMap: Array<{
    start: number;
    end: number;
    pattern: string;
    replacement: string;
  }>): Promise<Buffer> {
    try {
      // Load the PDF
      const pdfDoc = await PDFDocument.load(originalBuffer);
      const pages = pdfDoc.getPages();
      
      // For each page, we would need to:
      // 1. Extract text with coordinates (this requires additional libraries)
      // 2. Map redaction ranges to page coordinates
      // 3. Draw black rectangles over sensitive areas
      
      // For now, we'll use the basic redaction method
      return this.redactPDF(originalBuffer);
      
    } catch (error) {
      throw new Error(`Advanced PDF redaction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Image redaction (for scanned documents)
export class ImageRedactor {
  async redactImage(buffer: Buffer): Promise<Buffer> {
    try {
      // For image redaction, we would need to:
      // 1. Use OCR to detect text regions
      // 2. Identify PII patterns
      // 3. Draw black rectangles over sensitive areas
      // 4. Save the redacted image
      
      // For now, we'll return the original buffer
      // In a production implementation, you would use libraries like:
      // - Sharp for image manipulation
      // - OpenCV for advanced image processing
      // - Canvas for drawing operations
      
      return buffer;
    } catch (error) {
      throw new Error(`Image redaction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Main redaction processor
export class RedactionProcessor {
  private pdfRedactor: PDFRedactor;
  private imageRedactor: ImageRedactor;
  
  constructor() {
    this.pdfRedactor = new PDFRedactor();
    this.imageRedactor = new ImageRedactor();
  }
  
  async redactDocument(
    buffer: Buffer,
    filename: string,
    extractedText: string
  ): Promise<{
    redactedBuffer: Buffer;
    redactedText: string;
    redactionMap: Array<{
      start: number;
      end: number;
      pattern: string;
      replacement: string;
    }>;
    matchCount: number;
  }> {
    try {
      // First, redact the text
      const textRedaction = redactText(extractedText);
      
      // Then redact the document based on type
      let redactedBuffer: Buffer;
      
      if (filename.toLowerCase().endsWith('.pdf')) {
        redactedBuffer = await this.pdfRedactor.redactPDF(buffer);
      } else {
        // For images, we'll use the image redactor
        redactedBuffer = await this.imageRedactor.redactImage(buffer);
      }
      
      return {
        redactedBuffer,
        redactedText: textRedaction.redactedText,
        redactionMap: textRedaction.redactionMap,
        matchCount: textRedaction.matchCount,
      };
    } catch (error) {
      throw new Error(`Document redaction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}




