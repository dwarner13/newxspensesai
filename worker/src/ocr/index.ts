// ⚠️ DEPRECATED: Worker OCR module - Use netlify/functions/smart-import-ocr.ts instead
import { config } from '../config.js';
import { logUtils } from '../logging.js';
import { PDFProcessor } from '../pdf/index.js';

// OCR.space API integration
export class OCRSpaceEngine {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async processImage(buffer: Buffer, filename: string): Promise<{
    text: string;
    confidence: number;
    processingTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      logUtils.logOCRRequest('ocrspace', buffer.length, filename);
      
      // Convert buffer to base64
      const base64 = buffer.toString('base64');
      
      // Determine file type and MIME type
      const fileType = this.getFileType(filename);
      const isPDF = fileType === 'PDF';
      
      // Use correct MIME type for base64 data URI
      const mimeType = isPDF ? 'application/pdf' : `image/${fileType.toLowerCase()}`;
      const base64DataUri = `data:${mimeType};base64,${base64}`;
      
      // Prepare form data with improved OCR settings for better accuracy
      const formData = new FormData();
      formData.append('apikey', this.apiKey);
      formData.append('base64Image', base64DataUri);
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');
      formData.append('filetype', fileType);
      // Improve OCR quality settings
      formData.append('OCREngine', '2'); // Use OCR Engine 2 (more accurate)
      formData.append('detectOrientation', 'true'); // Auto-detect rotation
      formData.append('scale', 'true'); // Scale image for better recognition
      formData.append('isCreateSearchablePdf', 'false'); // Don't need PDF, just text
      
      // OCR.Space supports PDFs directly, so we can send PDF buffer without conversion
      console.log(`[OCRSpaceEngine] Sending ${fileType} directly to OCR.Space API, size: ${buffer.length} bytes`);
      
      // Make API request
      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OCR.space API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const result = await response.json() as any;
      
      if (!result.ParsedResults || result.ParsedResults.length === 0) {
        throw new Error('No text found in document');
      }
      
      // OCR.Space can return multiple pages for PDFs - combine all pages
      let combinedText = '';
      let totalConfidence = 0;
      let pageCount = 0;
      
      for (const parsedResult of result.ParsedResults) {
        if (parsedResult.ParsedText) {
          combinedText += parsedResult.ParsedText + '\n';
          const pageConfidence = parsedResult.TextOverlay?.Lines?.[0]?.Words?.[0]?.Confidence || 0;
          totalConfidence += pageConfidence;
          pageCount++;
        }
      }
      
      const text = combinedText.trim();
      const avgConfidence = pageCount > 0 ? totalConfidence / pageCount : 0;
      
      const processingTime = Date.now() - startTime;
      
      logUtils.logOCRResponse('ocrspace', true, text.length);
      console.log(`[OCRSpaceEngine] OCR.Space processing completed in ${processingTime}ms - extracted ${text.length} characters from ${pageCount} page(s)`);
      
      return {
        text,
        confidence: avgConfidence / 100, // Convert to 0-1 scale
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logUtils.logOCRResponse('ocrspace', false, undefined, error instanceof Error ? error.message : String(error));
      console.log(`[OCRSpaceEngine] OCR.space failed after ${processingTime}ms: ${error instanceof Error ? error.message : String(error)}`);
      
      throw new Error(`OCR.space processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private getFileType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf':
        return 'PDF';
      case 'jpg':
      case 'jpeg':
        return 'JPG';
      case 'png':
        return 'PNG';
      case 'gif':
        return 'GIF';
      case 'bmp':
        return 'BMP';
      case 'tiff':
        return 'TIFF';
      default:
        return 'JPG';
    }
  }
}

// Tesseract.js integration
export class TesseractEngine {
  async processImage(buffer: Buffer, filename: string): Promise<{
    text: string;
    confidence: number;
    processingTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      logUtils.logOCRRequest('tesseract', buffer.length, filename);
      
      // Dynamic import to reduce bundle size
      const { createWorker } = await import('tesseract.js');
      
      const worker = await createWorker({
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            // Log progress
            const progress = Math.round(m.progress * 100);
            if (progress % 10 === 0) {
              logUtils.logJobProgress('tesseract', progress, `OCR Progress: ${progress}%`);
            }
          }
        },
      });
      
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      
      const { data } = await worker.recognize(buffer);
      
      await worker.terminate();
      
      const processingTime = Date.now() - startTime;
      
      logUtils.logOCRResponse('tesseract', true, data.text.length);
      console.log(`Tesseract processing took ${processingTime}ms`);
      
      return {
        text: data.text,
        confidence: data.confidence / 100, // Convert to 0-1 scale
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logUtils.logOCRResponse('tesseract', false, undefined, error instanceof Error ? error.message : String(error));
      console.log(`Tesseract failed after ${processingTime}ms`);
      
      throw new Error(`Tesseract processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Google Vision API integration (optional)
export class GoogleVisionEngine {
  private projectId: string;
  private credentials: any;
  
  constructor(projectId: string, credentialsJson: string) {
    this.projectId = projectId;
    this.credentials = JSON.parse(credentialsJson);
  }
  
  async processImage(buffer: Buffer, filename: string): Promise<{
    text: string;
    confidence: number;
    processingTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      logUtils.logOCRRequest('vision', buffer.length, filename);
      
      // Dynamic import to reduce bundle size
      // @ts-ignore - Google Cloud Vision doesn't have perfect TypeScript support
      const { ImageAnnotatorClient } = await import('@google-cloud/vision');
      
      const client = new ImageAnnotatorClient({
        projectId: this.projectId,
        credentials: this.credentials,
      });
      
      const [result] = await client.textDetection(buffer);
      const detections = result.textAnnotations;
      
      if (!detections || detections.length === 0) {
        throw new Error('No text found in image');
      }
      
      // Get the first detection (full text)
      const text = detections[0].description || '';
      const confidence = detections[0].score || 0;
      
      const processingTime = Date.now() - startTime;
      
      logUtils.logOCRResponse('vision', true, text.length);
      console.log(`Google Vision processing took ${processingTime}ms`);
      
      return {
        text,
        confidence,
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logUtils.logOCRResponse('vision', false, undefined, error instanceof Error ? error.message : String(error));
      console.log(`Google Vision failed after ${processingTime}ms`);
      
      throw new Error(`Google Vision processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// OCR Engine Factory
export class OCREngineFactory {
  static createEngine(engineType: string): OCRSpaceEngine | TesseractEngine | GoogleVisionEngine {
    switch (engineType) {
      case 'ocrspace':
        if (!config.ocr.ocrspace.apiKey) {
          throw new Error('OCR.space API key not configured');
        }
        return new OCRSpaceEngine(config.ocr.ocrspace.apiKey);
        
      case 'tesseract':
        return new TesseractEngine();
        
      case 'vision':
        if (!config.ocr.google.projectId || !config.ocr.google.credentialsJson) {
          throw new Error('Google Vision credentials not configured');
        }
        return new GoogleVisionEngine(config.ocr.google.projectId, config.ocr.google.credentialsJson);
        
      default:
        throw new Error(`Unknown OCR engine: ${engineType}`);
    }
  }
}

// Main OCR processor
export class OCRProcessor {
  private primaryEngine: OCRSpaceEngine | TesseractEngine | GoogleVisionEngine;
  private fallbackEngine: TesseractEngine;
  private pdfProcessor: PDFProcessor;
  
  constructor() {
    this.primaryEngine = OCREngineFactory.createEngine(config.ocr.engine);
    this.fallbackEngine = new TesseractEngine();
    this.pdfProcessor = new PDFProcessor();
  }
  
  async processImage(buffer: Buffer, filename: string): Promise<{
    text: string;
    confidence: number;
    processingTime: number;
    engine: string;
  }> {
    try {
      // Validate buffer before processing
      if (!buffer || buffer.length === 0) {
        throw new Error('Input Buffer is empty');
      }
      
      // Check if this is a PDF file
      const isPDF = filename.toLowerCase().endsWith('.pdf') || this.isPDFBuffer(buffer);
      
      if (isPDF) {
        // Validate PDF buffer
        const header = buffer.slice(0, 4).toString();
        if (header !== '%PDF') {
          throw new Error(`Invalid PDF buffer: expected PDF header, got ${header}`);
        }
        
        console.log(`[OCRProcessor] Processing PDF directly with remote OCR provider, buffer size: ${buffer.length} bytes`);
        
        // Try remote OCR provider first (OCR.Space, Google Vision, etc. support PDFs directly)
        try {
          // Send PDF directly to OCR provider - no local conversion needed
          const result = await this.processImageBuffer(buffer, filename);
          console.log(`[OCRProcessor] Remote OCR provider successfully processed PDF, extracted ${result.text.length} characters`);
          return result;
        } catch (remoteError) {
          // If remote OCR fails, try local PDF→image conversion as fallback
          console.warn(`[OCRProcessor] Remote OCR provider failed, falling back to local PDF→image conversion: ${remoteError instanceof Error ? remoteError.message : String(remoteError)}`);
          
          try {
            const imageBuffer = await this.pdfProcessor.convertPDFToImage(buffer);
            if (!imageBuffer || imageBuffer.length === 0) {
              throw new Error('PDF to image conversion produced empty buffer');
            }
            console.log(`[OCRProcessor] Local PDF→image conversion succeeded, image size: ${imageBuffer.length} bytes`);
            return await this.processImageBuffer(imageBuffer, filename);
          } catch (localError) {
            // Both remote and local failed
            throw new Error(`Both remote OCR and local PDF→image conversion failed. Remote: ${remoteError instanceof Error ? remoteError.message : String(remoteError)}, Local: ${localError instanceof Error ? localError.message : String(localError)}`);
          }
        }
      } else {
        // Process as regular image
        return await this.processImageBuffer(buffer, filename);
      }
    } catch (error) {
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private async processImageBuffer(buffer: Buffer, filename: string): Promise<{
    text: string;
    confidence: number;
    processingTime: number;
    engine: string;
  }> {
    try {
      // Check if this is a PDF and if the primary engine supports PDFs
      const isPDF = filename.toLowerCase().endsWith('.pdf') || this.isPDFBuffer(buffer);
      const primarySupportsPDF = config.ocr.engine === 'ocrspace' || config.ocr.engine === 'vision';
      
      // If PDF and primary engine doesn't support PDFs (e.g., Tesseract), try OCR.Space first
      if (isPDF && !primarySupportsPDF) {
        console.log(`[OCRProcessor] Primary engine (${config.ocr.engine}) doesn't support PDFs, trying OCR.Space first`);
        try {
          if (config.ocr.ocrspace.apiKey) {
            const ocrSpaceEngine = new OCRSpaceEngine(config.ocr.ocrspace.apiKey);
            const result = await ocrSpaceEngine.processImage(buffer, filename);
            return {
              ...result,
              engine: 'ocrspace',
            };
          }
        } catch (ocrSpaceError) {
          console.warn(`[OCRProcessor] OCR.Space fallback failed: ${ocrSpaceError instanceof Error ? ocrSpaceError.message : String(ocrSpaceError)}`);
        }
      }
      
      // Try primary engine first
      const result = await this.primaryEngine.processImage(buffer, filename);
      
      return {
        ...result,
        engine: config.ocr.engine,
      };
    } catch (error) {
      // Fallback to Tesseract if primary engine fails
      // Note: Tesseract doesn't support PDFs directly, so this will only work for images
      try {
        const result = await this.fallbackEngine.processImage(buffer, filename);
        
        return {
          ...result,
          engine: 'tesseract',
        };
      } catch (fallbackError) {
        throw new Error(`Both primary and fallback OCR engines failed. Primary: ${error instanceof Error ? error.message : String(error)}, Fallback: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
      }
    }
  }
  
  private isPDFBuffer(buffer: Buffer): boolean {
    // Check PDF header (first 4 bytes should be %PDF)
    const header = buffer.subarray(0, 4).toString();
    return header === '%PDF';
  }
}






