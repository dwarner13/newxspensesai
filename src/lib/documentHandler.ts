/**
 * AI Employee Document Processing & Categorization System
 * Multi-format Document Handler
 */

import { parsePDF } from '../utils/pdfParser';
import { parseCSV } from '../utils/enhancedCsvParser';
import { extractTextFromImage, processImageWithOCR } from '../utils/ocrService';

export interface DocumentProcessingResult {
  success: boolean;
  data: any[];
  metadata: {
    fileType: string;
    fileName: string;
    fileSize: number;
    processingTime: number;
    confidence: number;
    extractedText?: string;
    rawData?: any;
  };
  errors?: string[];
  warnings?: string[];
}

export interface ProcessingOptions {
  enableOCR?: boolean;
  enableAI?: boolean;
  enableLearning?: boolean;
  userPreferences?: any;
  bankSpecific?: boolean;
  customCategories?: string[];
}

export class DocumentHandler {
  private supportedFormats = {
    pdf: ['.pdf'],
    csv: ['.csv'],
    excel: ['.xls', '.xlsx'],
    images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'],
    text: ['.txt', '.rtf']
  };

  private bankPatterns = {
    chase: /chase|jpmorgan/i,
    bankOfAmerica: /bank\s+of\s+america|bofa/i,
    wellsFargo: /wells\s+fargo/i,
    citibank: /citibank|citi/i,
    capitalOne: /capital\s+one/i,
    discover: /discover/i,
    americanExpress: /american\s+express|amex/i
  };

  /**
   * Main entry point for document processing
   */
  async processDocument(
    file: File, 
    options: ProcessingOptions = {}
  ): Promise<DocumentProcessingResult> {
    const startTime = Date.now();
    const result: DocumentProcessingResult = {
      success: false,
      data: [],
      metadata: {
        fileType: this.getFileType(file),
        fileName: file.name,
        fileSize: file.size,
        processingTime: 0,
        confidence: 0
      }
    };

    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        result.errors = validation.errors;
        return result;
      }

      // Route to appropriate processor
      const processor = this.getProcessor(file);
      const processedData = await processor(file, options);

      result.success = true;
      result.data = processedData.data;
      result.metadata = {
        ...result.metadata,
        processingTime: Date.now() - startTime,
        confidence: processedData.confidence,
        extractedText: processedData.extractedText,
        rawData: processedData.rawData
      };
      result.warnings = processedData.warnings;

    } catch (error) {
      result.errors = [error instanceof Error ? error.message : 'Unknown processing error'];
      result.metadata.processingTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Get file type based on extension
   */
  private getFileType(file: File): string {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    for (const [type, extensions] of Object.entries(this.supportedFormats)) {
      if (extensions.includes(extension)) {
        return type;
      }
    }
    
    return 'unknown';
  }

  /**
   * Validate file before processing
   */
  private validateFile(file: File): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (file.size > maxSize) {
      errors.push(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowed size (10MB)`);
    }

    if (file.size === 0) {
      errors.push('File is empty');
    }

    const fileType = this.getFileType(file);
    if (fileType === 'unknown') {
      errors.push(`Unsupported file format. Supported formats: ${Object.values(this.supportedFormats).flat().join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get appropriate processor for file type
   */
  private getProcessor(file: File) {
    const fileType = this.getFileType(file);

    switch (fileType) {
      case 'pdf':
        return this.processPDF.bind(this);
      case 'csv':
        return this.processCSV.bind(this);
      case 'excel':
        return this.processExcel.bind(this);
      case 'images':
        return this.processImage.bind(this);
      case 'text':
        return this.processText.bind(this);
      default:
        throw new Error(`No processor available for file type: ${fileType}`);
    }
  }

  /**
   * Process PDF documents with bank-specific parsing
   */
  private async processPDF(file: File, options: ProcessingOptions) {
    try {
      // Extract text from PDF
      const pdfText = await this.extractPDFText(file);
      
      // Detect bank type
      const bankType = this.detectBankType(pdfText);
      
      // Parse based on bank type or use generic parser
      let transactions;
      if (bankType && options.bankSpecific) {
        transactions = await this.parseBankSpecificPDF(pdfText, bankType);
      } else {
        transactions = await parsePDF(file);
      }

      return {
        data: transactions,
        confidence: 0.85,
        extractedText: pdfText,
        rawData: { bankType, pdfText },
        warnings: bankType ? [`Detected ${bankType} bank statement`] : []
      };

    } catch (error) {
      throw new Error(`PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process CSV files with intelligent parsing
   */
  private async processCSV(file: File, options: ProcessingOptions) {
    try {
      const csvText = await this.readFileAsText(file);
      const transactions = await parseCSV(csvText, {
        enableAI: options.enableAI,
        onProgress: (progress, message) => {
          console.log(`CSV Processing: ${progress}% - ${message}`);
        }
      });

      return {
        data: transactions,
        confidence: 0.90,
        extractedText: csvText,
        rawData: { csvText },
        warnings: []
      };

    } catch (error) {
      throw new Error(`CSV processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process Excel files
   */
  private async processExcel(file: File, options: ProcessingOptions) {
    try {
      // For now, convert Excel to CSV and process
      // In production, you'd use a library like xlsx
      const csvText = await this.convertExcelToCSV(file);
      return await this.processCSV(new File([csvText], file.name.replace(/\.(xls|xlsx)$/i, '.csv'), { type: 'text/csv' }), options);

    } catch (error) {
      throw new Error(`Excel processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process image files with OCR
   */
  private async processImage(file: File, options: ProcessingOptions) {
    try {
      if (!options.enableOCR) {
        throw new Error('OCR processing is required for image files');
      }

      const ocrResult = await processImageWithOCR(file);
      
      // Parse the extracted text as a receipt or document
      const parsedData = await this.parseImageText(ocrResult.text, file.name);

      return {
        data: parsedData,
        confidence: ocrResult.confidence,
        extractedText: ocrResult.text,
        rawData: { ocrResult },
        warnings: ocrResult.confidence < 0.7 ? ['Low OCR confidence - manual review recommended'] : []
      };

    } catch (error) {
      throw new Error(`Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process text files
   */
  private async processText(file: File, options: ProcessingOptions) {
    try {
      const text = await this.readFileAsText(file);
      
      // Try to parse as structured data (CSV-like)
      const parsedData = await this.parseStructuredText(text);

      return {
        data: parsedData,
        confidence: 0.75,
        extractedText: text,
        rawData: { text },
        warnings: []
      };

    } catch (error) {
      throw new Error(`Text processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from PDF using multiple methods
   */
  private async extractPDFText(file: File): Promise<string> {
    try {
      // Use existing PDF parser
      const transactions = await parsePDF(file);
      
      // For now, return a placeholder - in production you'd extract raw text
      return `PDF extracted with ${transactions.length} transactions found`;
      
    } catch (error) {
      throw new Error(`PDF text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect bank type from PDF text
   */
  private detectBankType(text: string): string | null {
    for (const [bank, pattern] of Object.entries(this.bankPatterns)) {
      if (pattern.test(text)) {
        return bank;
      }
    }
    return null;
  }

  /**
   * Parse bank-specific PDF formats
   */
  private async parseBankSpecificPDF(text: string, bankType: string) {
    // Bank-specific parsing logic would go here
    // For now, return generic parsing
    return [];
  }

  /**
   * Convert Excel to CSV (placeholder)
   */
  private async convertExcelToCSV(file: File): Promise<string> {
    // In production, use xlsx library
    throw new Error('Excel conversion not yet implemented');
  }

  /**
   * Parse text extracted from images
   */
  private async parseImageText(text: string, fileName: string) {
    // Determine if it's a receipt, invoice, or other document type
    const isReceipt = this.detectReceiptPattern(text);
    
    if (isReceipt) {
      return await this.parseReceiptText(text);
    } else {
      return await this.parseGenericDocumentText(text);
    }
  }

  /**
   * Detect if text is from a receipt
   */
  private detectReceiptPattern(text: string): boolean {
    const receiptKeywords = ['total', 'subtotal', 'tax', 'receipt', 'thank you', 'change'];
    const lowerText = text.toLowerCase();
    return receiptKeywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Parse receipt text
   */
  private async parseReceiptText(text: string) {
    // Use existing receipt parsing logic
    return [{
      type: 'receipt',
      text: text,
      parsed: true
    }];
  }

  /**
   * Parse generic document text
   */
  private async parseGenericDocumentText(text: string) {
    return [{
      type: 'document',
      text: text,
      parsed: true
    }];
  }

  /**
   * Parse structured text (CSV-like)
   */
  private async parseStructuredText(text: string) {
    const lines = text.split('\n').filter(line => line.trim());
    
    // Try to detect if it's CSV-like
    if (lines.length > 1 && lines[0].includes(',')) {
      return await this.processCSV(new File([text], 'data.csv', { type: 'text/csv' }), {});
    }
    
    return [{
      type: 'text',
      content: text,
      parsed: true
    }];
  }

  /**
   * Read file as text
   */
  private async readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  /**
   * Get supported file formats
   */
  getSupportedFormats(): Record<string, string[]> {
    return this.supportedFormats;
  }

  /**
   * Check if file format is supported
   */
  isSupported(file: File): boolean {
    const fileType = this.getFileType(file);
    return fileType !== 'unknown';
  }
}

// Export singleton instance
export const documentHandler = new DocumentHandler();
