// @ts-ignore - pdf2pic doesn't have TypeScript declarations
import { fromBuffer } from 'pdf2pic';
import sharp from 'sharp';

// Lazy load pdf-parse to avoid test file loading issues
let pdfParse: any = null;
async function getPdfParse() {
  if (!pdfParse) {
    pdfParse = (await import('pdf-parse')).default;
  }
  return pdfParse;
}

// PDF parsing result interface
export interface PDFParseResult {
  text: string;
  pages: number;
  info: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modDate?: Date;
  };
  metadata: {
    pdfVersion?: string;
    isAcroFormPresent?: boolean;
    isXFAPresent?: boolean;
  };
}

// PDF processor class
export class PDFProcessor {
  async parsePDF(buffer: Buffer): Promise<PDFParseResult> {
    try {
      // Ensure buffer is valid and not empty
      if (!buffer || buffer.length === 0) {
        throw new Error('PDF buffer is empty or invalid');
      }
      
      // Ensure buffer starts with PDF header
      const header = buffer.slice(0, 4).toString();
      if (header !== '%PDF') {
        throw new Error(`Invalid PDF format: expected PDF header, got ${header}`);
      }
      
      // Workaround for pdf-parse bug: Ensure we have a proper Node.js Buffer
      // Create a fresh Buffer from the existing one to avoid any internal references
      const pdfBuffer = Buffer.isBuffer(buffer) 
        ? Buffer.from(buffer) 
        : Buffer.from(buffer);
      
      // Ensure it's still a valid PDF after conversion
      const headerCheck = pdfBuffer.slice(0, 4).toString();
      if (headerCheck !== '%PDF') {
        throw new Error('Buffer conversion corrupted PDF header');
      }
      
      const parse = await getPdfParse();
      
      // Pass buffer directly - pdf-parse should accept Buffer
      // Wrap in try-catch to provide better error messages
      let data;
      try {
        // Try parsing with the fresh buffer
        data = await parse(pdfBuffer);
      } catch (parseError: any) {
        // If pdf-parse tries to access a file path, it's likely a library bug
        // This is a known issue with pdf-parse 1.1.1 - it sometimes tries to access test files
        if (parseError?.message?.includes('ENOENT') || parseError?.code === 'ENOENT') {
          // Log the actual buffer info for debugging
          console.error(`[PDFProcessor] pdf-parse ENOENT error. Buffer length: ${pdfBuffer.length}, header: ${headerCheck}`);
          throw new Error(`PDF parsing failed: The pdf-parse library encountered an internal error. This may be due to PDF format compatibility. Buffer size: ${pdfBuffer.length} bytes.`);
        }
        throw parseError;
      }
      
      return {
        text: data.text,
        pages: data.numpages,
        info: {
          title: data.info?.Title,
          author: data.info?.Author,
          subject: data.info?.Subject,
          creator: data.info?.Creator,
          producer: data.info?.Producer,
          creationDate: data.info?.CreationDate,
          modDate: data.info?.ModDate,
        },
        metadata: {
          pdfVersion: data.info?.PDFFormatVersion,
          isAcroFormPresent: data.info?.IsAcroFormPresent,
          isXFAPresent: data.info?.IsXFAPresent,
        },
      };
    } catch (error) {
      throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Check if PDF has extractable text
  async hasExtractableText(buffer: Buffer): Promise<boolean> {
    try {
      const result = await this.parsePDF(buffer);
      return result.text.trim().length > 0;
    } catch (error) {
      return false;
    }
  }
  
  // Extract text from PDF with confidence score
  async extractTextWithConfidence(buffer: Buffer): Promise<{
    text: string;
    confidence: number;
    isScanned: boolean;
  }> {
    try {
      const result = await this.parsePDF(buffer);
      
      // Calculate confidence based on text length and structure
      let confidence = 0.8; // Base confidence for PDFs with text
      
      // Check if it's likely a scanned PDF (low text content)
      const textLength = result.text.trim().length;
      const isScanned = textLength < 100; // Less than 100 characters suggests scanned PDF
      
      if (isScanned) {
        confidence = 0.3; // Low confidence for scanned PDFs
      } else {
        // Higher confidence for PDFs with more text
        if (textLength > 1000) {
          confidence = 0.9;
        } else if (textLength > 500) {
          confidence = 0.8;
        } else {
          confidence = 0.6;
        }
      }
      
      return {
        text: result.text,
        confidence,
        isScanned,
      };
    } catch (error) {
      // If PDF parsing fails (e.g., pdf-parse library bug), return empty result
      // This will trigger OCR fallback in the workflow
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`[PDFProcessor] PDF text extraction failed, will use OCR: ${errorMsg}`);
      return {
        text: '',
        confidence: 0,
        isScanned: true, // Mark as scanned to force OCR
      };
    }
  }
  
  // Convert PDF to images for OCR processing
  async convertPDFToImages(buffer: Buffer): Promise<Buffer[]> {
    try {
      const convert = fromBuffer(buffer, {
        density: 300, // High DPI for better OCR accuracy
        saveFilename: 'page',
        savePath: './temp',
        format: 'png',
        width: 2000,
        height: 2000,
      });
      
      const results = await convert.bulk(-1, { responseType: 'buffer' }); // Convert all pages
      
      const imageBuffers: Buffer[] = [];
      
      for (const result of results) {
        if (result.buffer) {
          // Optimize the image for OCR
          const optimizedBuffer = await sharp(result.buffer)
            .resize(2000, 2000, { 
              fit: 'inside',
              withoutEnlargement: true 
            })
            .png({ quality: 95 })
            .toBuffer();
            
          imageBuffers.push(optimizedBuffer);
        }
      }
      
      return imageBuffers;
    } catch (error) {
      throw new Error(`PDF to image conversion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Convert PDF to single image (first page) for simple OCR
  async convertPDFToImage(buffer: Buffer, pageNumber: number = 1): Promise<Buffer> {
    try {
      // Validate buffer before processing
      if (!buffer || buffer.length === 0) {
        throw new Error('Input Buffer is empty');
      }
      
      // Ensure buffer starts with PDF header
      const header = buffer.slice(0, 4).toString();
      if (header !== '%PDF') {
        throw new Error(`Invalid PDF format: expected PDF header, got ${header}`);
      }
      
      // Create a fresh Buffer copy to ensure pdf2pic receives a proper Node.js Buffer
      // This prevents issues with buffer references or corrupted buffers
      const pdfBuffer = Buffer.isBuffer(buffer) 
        ? Buffer.from(buffer) 
        : Buffer.from(buffer);
      
      // Verify the copy is still valid
      const headerCheck = pdfBuffer.slice(0, 4).toString();
      if (headerCheck !== '%PDF') {
        throw new Error('Buffer copy corrupted PDF header');
      }
      
      console.log(`[PDFProcessor] Converting PDF to image, buffer size: ${pdfBuffer.length} bytes`);
      
      const convert = fromBuffer(pdfBuffer, {
        density: 300, // High DPI for better OCR accuracy
        saveFilename: 'page',
        savePath: './temp',
        format: 'png',
        width: 2000,
        height: 2000,
      });
      
      const result = await convert(pageNumber, { responseType: 'buffer' });
      
      if (!result.buffer) {
        throw new Error('Failed to convert PDF page to image');
      }
      
      console.log(`[PDFProcessor] Successfully converted PDF page ${pageNumber} to image, size: ${result.buffer.length} bytes`);
      
      // Optimize the image for OCR
      const optimizedBuffer = await sharp(result.buffer)
        .resize(2000, 2000, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .png({ quality: 95 })
        .toBuffer();
        
      return optimizedBuffer;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`PDF to image conversion failed: ${errorMsg}`);
    }
  }
}

// Image processor for non-PDF documents
export class ImageProcessor {
  async processImage(_buffer: Buffer, filename: string): Promise<{
    text: string;
    confidence: number;
    isProcessable: boolean;
  }> {
    try {
      // Check if it's a supported image format
      const supportedFormats = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff'];
      const fileExt = filename.toLowerCase().split('.').pop();
      
      if (!fileExt || !supportedFormats.includes(fileExt)) {
        return {
          text: '',
          confidence: 0,
          isProcessable: false,
        };
      }
      
      // For now, we'll return empty text since OCR will be handled separately
      // In a more sophisticated implementation, you might want to:
      // 1. Preprocess the image (resize, enhance contrast, etc.)
      // 2. Extract basic metadata
      // 3. Validate image quality
      
      return {
        text: '',
        confidence: 0.5, // Medium confidence for images
        isProcessable: true,
      };
    } catch (error) {
      throw new Error(`Image processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Document type detector
export class DocumentTypeDetector {
  static detectType(filename: string, mimeType?: string): 'pdf' | 'image' | 'unknown' {
    const ext = filename.toLowerCase().split('.').pop();
    
    // Check by file extension
    if (ext === 'pdf') {
      return 'pdf';
    }
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff'].includes(ext || '')) {
      return 'image';
    }
    
    // Check by MIME type if available
    if (mimeType) {
      if (mimeType === 'application/pdf') {
        return 'pdf';
      }
      
      if (mimeType.startsWith('image/')) {
        return 'image';
      }
    }
    
    return 'unknown';
  }
}

// Main document processor
export class DocumentProcessor {
  private pdfProcessor: PDFProcessor;
  private imageProcessor: ImageProcessor;
  
  constructor() {
    this.pdfProcessor = new PDFProcessor();
    this.imageProcessor = new ImageProcessor();
  }
  
  async processDocument(buffer: Buffer, filename: string, mimeType?: string): Promise<{
    text: string;
    confidence: number;
    documentType: 'pdf' | 'image' | 'unknown';
    isScanned: boolean;
    metadata?: any;
  }> {
    try {
      const documentType = DocumentTypeDetector.detectType(filename, mimeType);
      
      switch (documentType) {
        case 'pdf':
          // Try to extract text with confidence
          const pdfResult = await this.pdfProcessor.extractTextWithConfidence(buffer);
          
          // Try to get page count, but don't fail if it errors
          let pageCount = 1;
          try {
            const parseResult = await this.pdfProcessor.parsePDF(buffer);
            pageCount = parseResult.pages;
          } catch (pageError) {
            // If parsing fails, use default page count
            console.warn(`[DocumentProcessor] Could not get page count: ${pageError instanceof Error ? pageError.message : String(pageError)}`);
          }
          
          return {
            text: pdfResult.text,
            confidence: pdfResult.confidence,
            documentType: 'pdf',
            isScanned: pdfResult.isScanned,
            metadata: {
              pages: pageCount,
            },
          };
          
        case 'image':
          const imageResult = await this.imageProcessor.processImage(buffer, filename);
          return {
            text: imageResult.text,
            confidence: imageResult.confidence,
            documentType: 'image',
            isScanned: true, // Images are always "scanned"
            metadata: {
              isProcessable: imageResult.isProcessable,
            },
          };
          
        default:
          throw new Error(`Unsupported document type: ${documentType}`);
      }
    } catch (error) {
      throw new Error(`Document processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}




