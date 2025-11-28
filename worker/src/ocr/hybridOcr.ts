/**
 * Hybrid OCR Pipeline - Phase 1
 * 
 * Central OCR flow that:
 * 1. Uses current parser first (PDF/CSV/text extraction)
 * 2. Falls back to secondary OCR if confidence is low or text is empty
 * 3. Returns unified, typed result for Smart Import and future tools
 */

import { PDFProcessor } from '../pdf/index.js';
import { OCRProcessor } from './index.js';
import { detectFileType, detectFileTypeFromBuffer } from '../utils/fileType.js';

export interface OCRPageResult {
  pageNumber: number;
  text: string;
}

export interface HybridOCRResult {
  pages: OCRPageResult[];
  fullText: string;
  source: 'primary' | 'fallback';
  confidence: number;        // 0–1 simple heuristic
  hadFallback: boolean;
  warnings: string[];
  metadata: {
    fileType: 'pdf' | 'image' | 'csv' | 'text' | 'unknown';
    mimeType?: string;
    fileName?: string;
    pageCount?: number;
    primaryMethod?: string;
    fallbackMethod?: string;
    processingTimeMs?: number;
  };
}

export interface HybridOCROptions {
  mimeType?: string;
  fileName?: string;
  minConfidence?: number;     // Default: 0.3 (30%)
  minTextLength?: number;     // Default: 50 characters
  enableFallback?: boolean;   // Default: true
}

/**
 * Run hybrid OCR pipeline
 * 
 * Strategy:
 * 1. Detect file type (PDF, image, CSV, text)
 * 2. Try primary parser first (pdf-parse for PDFs, direct text for CSVs)
 * 3. If confidence is low or text is empty, fall back to OCR
 * 4. Return unified result structure
 */
export async function runHybridOCR(
  fileBuffer: Buffer,
  options: HybridOCROptions = {}
): Promise<HybridOCRResult> {
  const startTime = Date.now();
  const warnings: string[] = [];
  
  // Default options
  const minConfidence = options.minConfidence ?? 0.3;
  const minTextLength = options.minTextLength ?? 50;
  const enableFallback = options.enableFallback ?? true;
  
  // Detect file type
  const fileName = options.fileName || 'document';
  const mimeType = options.mimeType;
  const fileTypeInfo = detectFileType(fileName, mimeType);
  const bufferFileType = detectFileTypeFromBuffer(fileBuffer);
  
  // Determine actual file type (prioritize buffer detection)
  let actualFileType: 'pdf' | 'image' | 'csv' | 'text' | 'unknown';
  if (bufferFileType === 'pdf') {
    actualFileType = 'pdf';
  } else if (bufferFileType === 'image') {
    actualFileType = 'image';
  } else if (fileTypeInfo.type === 'pdf') {
    actualFileType = 'pdf';
  } else if (fileTypeInfo.type === 'image') {
    actualFileType = 'image';
  } else if (fileName.toLowerCase().endsWith('.csv')) {
    actualFileType = 'csv';
  } else if (fileName.toLowerCase().endsWith('.txt') || fileName.toLowerCase().endsWith('.text')) {
    actualFileType = 'text';
  } else {
    actualFileType = 'unknown';
  }
  
  // Initialize processors
  const pdfProcessor = new PDFProcessor();
  const ocrProcessor = new OCRProcessor();
  
  let primaryText = '';
  let primaryConfidence = 0;
  let primaryMethod = '';
  let pageCount = 0;
  
  // Step 1: Try primary parser based on file type
  try {
    if (actualFileType === 'pdf') {
      // Try PDF text extraction first
      primaryMethod = 'pdf-parse';
      const pdfResult = await pdfProcessor.parsePDF(fileBuffer);
      primaryText = pdfResult.text || '';
      pageCount = pdfResult.pages || 1;
      
      // Calculate confidence for PDF parsing
      // Higher confidence if we got substantial text from multiple pages
      if (primaryText.trim().length > 0) {
        const avgCharsPerPage = primaryText.length / Math.max(pageCount, 1);
        // More text per page = higher confidence
        primaryConfidence = Math.min(0.9, Math.max(0.5, avgCharsPerPage / 500));
      } else {
        primaryConfidence = 0;
        warnings.push('PDF parsing returned empty text - likely scanned PDF');
      }
      
    } else if (actualFileType === 'csv') {
      // CSV: Try to extract as text
      primaryMethod = 'csv-text';
      primaryText = fileBuffer.toString('utf-8');
      pageCount = 1;
      
      // CSV confidence: high if it looks like CSV (has commas, newlines)
      const hasCommas = primaryText.includes(',');
      const hasNewlines = primaryText.includes('\n');
      primaryConfidence = (hasCommas && hasNewlines) ? 0.9 : 0.5;
      
    } else if (actualFileType === 'text') {
      // Plain text: just read it
      primaryMethod = 'text-extract';
      primaryText = fileBuffer.toString('utf-8');
      pageCount = 1;
      primaryConfidence = 0.9; // High confidence for plain text
      
    } else if (actualFileType === 'image') {
      // Images: skip primary parser, go straight to OCR
      primaryMethod = 'none';
      primaryText = '';
      primaryConfidence = 0;
      pageCount = 1;
      warnings.push('Image file detected - skipping primary parser, using OCR');
      
    } else {
      // Unknown: try to read as text first
      primaryMethod = 'text-extract';
      try {
        primaryText = fileBuffer.toString('utf-8');
        pageCount = 1;
        // Low confidence for unknown types
        primaryConfidence = primaryText.trim().length > 0 ? 0.3 : 0;
      } catch {
        primaryText = '';
        primaryConfidence = 0;
      }
      warnings.push(`Unknown file type - attempting text extraction`);
    }
  } catch (primaryError) {
    const errorMsg = primaryError instanceof Error ? primaryError.message : String(primaryError);
    warnings.push(`Primary parser failed: ${errorMsg}`);
    primaryText = '';
    primaryConfidence = 0;
  }
  
  // Step 2: Determine if we need fallback OCR
  const needsFallback = enableFallback && (
    primaryConfidence < minConfidence ||
    primaryText.trim().length < minTextLength ||
    actualFileType === 'image'
  );
  
  let finalText = primaryText;
  let finalConfidence = primaryConfidence;
  let finalSource: 'primary' | 'fallback' = 'primary';
  let hadFallback = false;
  let fallbackMethod = '';
  
  if (needsFallback) {
    try {
      // Use OCR as fallback
      fallbackMethod = 'ocr';
      const ocrResult = await ocrProcessor.processImage(fileBuffer, fileName);
      
      if (ocrResult.text && ocrResult.text.trim().length > 0) {
        // If primary gave us some text, merge it (primary takes precedence)
        if (primaryText.trim().length > 0) {
          finalText = `${primaryText}\n\n--- OCR Fallback ---\n${ocrResult.text}`;
          warnings.push('Merged primary parser text with OCR fallback');
        } else {
          finalText = ocrResult.text;
        }
        
        // Use OCR confidence, but boost slightly if primary also had text
        finalConfidence = Math.min(0.95, ocrResult.confidence + (primaryText.trim().length > 0 ? 0.1 : 0));
        finalSource = 'fallback';
        hadFallback = true;
        
        // Estimate page count from OCR (if it's a PDF, we might have multiple pages)
        if (actualFileType === 'pdf' && pageCount === 0) {
          // Rough estimate: count page breaks or assume 1 page
          pageCount = Math.max(1, Math.floor(finalText.split('\n\n').length / 3));
        }
      } else {
        warnings.push('OCR fallback returned empty text');
        // Keep primary text even if it's low quality
        if (primaryText.trim().length > 0) {
          finalText = primaryText;
          finalConfidence = Math.max(0.2, primaryConfidence);
        }
      }
    } catch (ocrError) {
      const errorMsg = ocrError instanceof Error ? ocrError.message : String(ocrError);
      warnings.push(`OCR fallback failed: ${errorMsg}`);
      // Keep primary text if available
      if (primaryText.trim().length > 0) {
        finalText = primaryText;
        finalConfidence = Math.max(0.2, primaryConfidence);
      }
    }
  }
  
  // Step 3: Split text into pages (for PDFs, try to detect page breaks)
  const pages: OCRPageResult[] = [];
  
  if (pageCount > 1 && finalText.includes('\f')) {
    // PDF page breaks (form feed character)
    const pageTexts = finalText.split('\f');
    pageTexts.forEach((pageText, index) => {
      if (pageText.trim().length > 0) {
        pages.push({
          pageNumber: index + 1,
          text: pageText.trim(),
        });
      }
    });
  } else if (pageCount > 1 && finalText.includes('\n\n\n')) {
    // Try double newlines as page separators
    const pageTexts = finalText.split('\n\n\n');
    pageTexts.forEach((pageText, index) => {
      if (pageText.trim().length > 0) {
        pages.push({
          pageNumber: index + 1,
          text: pageText.trim(),
        });
      }
    });
  } else {
    // Single page or couldn't detect pages
    if (finalText.trim().length > 0) {
      pages.push({
        pageNumber: 1,
        text: finalText.trim(),
      });
    }
  }
  
  // If we couldn't split pages but know there should be multiple, create a single page
  if (pages.length === 0 && finalText.trim().length > 0) {
    pages.push({
      pageNumber: 1,
      text: finalText.trim(),
    });
  }
  
  const processingTime = Date.now() - startTime;
  
  return {
    pages,
    fullText: finalText.trim(),
    source: finalSource,
    confidence: Math.max(0, Math.min(1, finalConfidence)), // Clamp to 0-1
    hadFallback,
    warnings,
    metadata: {
      fileType: actualFileType,
      mimeType: mimeType || fileTypeInfo.mimeType,
      fileName,
      pageCount: pages.length,
      primaryMethod: primaryMethod || undefined,
      fallbackMethod: hadFallback ? fallbackMethod : undefined,
      processingTimeMs: processingTime,
    },
  };
}





