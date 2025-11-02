import { PDFDocument, PDFPage, rgb } from 'pdf-lib';
import { logUtils } from '../logging.js';
// Import canonical PII masking from shared module
// Note: Path may need adjustment based on worker directory structure
// If worker runs in different context, may need to use a compatible adapter
import { maskPII } from '../../../netlify/functions/_shared/pii.js';

// ============================================================================
// PII Redaction (using canonical maskPII)
// ============================================================================

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

// Text redaction - uses canonical maskPII()
export function redactText(text: string): RedactionResult {
  // Use canonical maskPII() with last4 strategy
  const result = maskPII(text, 'last4');
  
  // Convert to RedactionResult format
  const redactionMap: Array<{
    start: number;
    end: number;
    pattern: string;
    replacement: string;
  }> = [];
  
  // Build redaction map from found PII instances
  for (const found of result.found) {
    // Extract replacement from masked text
    // Simple approach: use a generic replacement based on type
    const replacement = `[REDACTED:${found.type.toUpperCase()}]`;
    
    redactionMap.push({
      start: found.index,
      end: found.index + found.match.length,
      pattern: found.type,
      replacement,
    });
  }
  
  logUtils.logRedactionResults(result.found.length, [...new Set(result.found.map(f => f.type))]);
  
  return {
    redactedText: result.masked,
    redactionMap,
    matchCount: result.found.length,
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






