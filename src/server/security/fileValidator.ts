import { Result, Ok, Err } from '../../types/result';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

export interface FileValidationResult {
  safe: boolean;
  fileType: 'image' | 'pdf' | 'csv' | 'unknown';
  actualMimeType: string;
  sizeBytes: number;
  dimensions?: { width: number; height: number };
  pageCount?: number;
  warnings: string[];
}

export class FileValidator {
  async validateFile(
    buffer: Buffer,
    declaredMimeType: string,
    fileName: string
  ): Promise<Result<FileValidationResult>> {
    const warnings: string[] = [];
    const result: FileValidationResult = {
      safe: false,
      fileType: 'unknown',
      actualMimeType: '',
      sizeBytes: buffer.length,
      warnings,
    };
    
    try {
      // Size limits
      const MAX_SIZES = {
        image: 10 * 1024 * 1024, // 10MB
        pdf: 25 * 1024 * 1024,   // 25MB
        csv: 5 * 1024 * 1024,    // 5MB
      };
      
      // Detect actual file type
      const fileType = await this.detectFileType(buffer);
      result.fileType = fileType.type;
      result.actualMimeType = fileType.mime;
      
      // Validate mime type matches
      if (declaredMimeType !== result.actualMimeType) {
        warnings.push(`MIME type mismatch: declared ${declaredMimeType}, actual ${result.actualMimeType}`);
      }
      
      // Check size limits
      const maxSize = MAX_SIZES[result.fileType] || 5 * 1024 * 1024;
      if (buffer.length > maxSize) {
        return Err(new Error(`File too large: ${buffer.length} bytes exceeds ${maxSize} limit`));
      }
      
      // Basic security checks
      const securityCheck = await this.performSecurityChecks(buffer, result.fileType);
      if (!securityCheck.ok) {
        return Err(securityCheck.error);
      }
      
      // Type-specific validation
      switch (result.fileType) {
        case 'image':
          const imgValidation = await this.validateImage(buffer);
          if (!imgValidation.ok) return Err(imgValidation.error);
          result.dimensions = imgValidation.value.dimensions;
          break;
          
        case 'pdf':
          const pdfValidation = await this.validatePDF(buffer);
          if (!pdfValidation.ok) return Err(pdfValidation.error);
          result.pageCount = pdfValidation.value.pageCount;
          break;
          
        case 'csv':
          const csvValidation = await this.validateCSV(buffer);
          if (!csvValidation.ok) return Err(csvValidation.error);
          break;
      }
      
      result.safe = true;
      return Ok(result);
      
    } catch (error) {
      return Err(new Error(`Validation failed: ${error.message}`));
    }
  }
  
  private async detectFileType(buffer: Buffer): Promise<{ type: string; mime: string }> {
    // Magic bytes detection
    const header = buffer.toString('hex', 0, 4);
    
    if (header.startsWith('ffd8ff')) {
      return { type: 'image', mime: 'image/jpeg' };
    } else if (header.startsWith('89504e47')) {
      return { type: 'image', mime: 'image/png' };
    } else if (header.startsWith('25504446')) {
      return { type: 'pdf', mime: 'application/pdf' };
    } else if (this.looksLikeCSV(buffer)) {
      return { type: 'csv', mime: 'text/csv' };
    }
    
    return { type: 'unknown', mime: 'application/octet-stream' };
  }
  
  private looksLikeCSV(buffer: Buffer): boolean {
    const text = buffer.toString('utf8', 0, Math.min(1000, buffer.length));
    const lines = text.split('\n').slice(0, 5);
    
    if (lines.length < 2) return false;
    
    // Check for consistent column count
    const colCounts = lines.map(l => l.split(',').length);
    return colCounts.every(c => c === colCounts[0]);
  }
  
  private async performSecurityChecks(buffer: Buffer, fileType: string): Promise<Result<void>> {
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
    ];
    
    const text = buffer.toString('utf8', 0, Math.min(10000, buffer.length));
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(text)) {
        return Err(new Error('File contains potentially malicious content'));
      }
    }
    
    // Check file size vs content ratio (potential zip bombs)
    if (buffer.length > 1000000 && text.length < buffer.length * 0.1) {
      return Err(new Error('File appears to be compressed or binary - potential security risk'));
    }
    
    return Ok(undefined);
  }
  
  private async validateImage(buffer: Buffer): Promise<Result<{ dimensions: any }>> {
    try {
      const metadata = await sharp(buffer).metadata();
      
      // Check for suspicious dimensions
      if (metadata.width! > 10000 || metadata.height! > 10000) {
        return Err(new Error('Image dimensions too large'));
      }
      
      if (metadata.width! < 10 || metadata.height! < 10) {
        return Err(new Error('Image dimensions too small'));
      }
      
      return Ok({
        dimensions: {
          width: metadata.width!,
          height: metadata.height!,
        },
      });
    } catch (error) {
      return Err(error as Error);
    }
  }
  
  private async validatePDF(buffer: Buffer): Promise<Result<{ pageCount: number }>> {
    try {
      const pdfDoc = await PDFDocument.load(buffer, {
        ignoreEncryption: true,
      });
      
      const pageCount = pdfDoc.getPageCount();
      
      // Limit pages
      if (pageCount > 100) {
        return Err(new Error('PDF has too many pages'));
      }
      
      if (pageCount === 0) {
        return Err(new Error('PDF has no pages'));
      }
      
      // Check for JavaScript (potential security risk)
      const catalog = pdfDoc.context.lookup(pdfDoc.context.trailerInfo.Root);
      if (catalog?.get('JavaScript')) {
        return Err(new Error('PDF contains JavaScript'));
      }
      
      return Ok({ pageCount });
    } catch (error) {
      return Err(error as Error);
    }
  }
  
  private async validateCSV(buffer: Buffer): Promise<Result<void>> {
    const text = buffer.toString('utf8');
    const lineCount = text.split('\n').length;
    
    if (lineCount > 50000) {
      return Err(new Error('CSV has too many rows'));
    }
    
    if (lineCount < 2) {
      return Err(new Error('CSV must have at least 2 rows (header + data)'));
    }
    
    // Check for reasonable column count
    const firstLine = text.split('\n')[0];
    const columnCount = firstLine.split(',').length;
    
    if (columnCount > 100) {
      return Err(new Error('CSV has too many columns'));
    }
    
    return Ok(undefined);
  }
}
