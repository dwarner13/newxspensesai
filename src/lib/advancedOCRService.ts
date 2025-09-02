/**
 * Advanced OCR Service with Multiple Providers
 * Supports Tesseract.js, Google Cloud Vision API, AWS Textract, and OCR.space
 */

export interface OCRResult {
  text: string;
  confidence: number;
  provider: string;
  processingTime: number;
  metadata?: {
    language?: string;
    orientation?: number;
    textBlocks?: any[];
    boundingBoxes?: any[];
  };
}

export interface OCRProvider {
  name: string;
  extractText(imageData: string | File, options?: any): Promise<OCRResult>;
  isAvailable(): boolean;
  getCostEstimate(): number;
}

export interface OCROptions {
  language?: string;
  orientation?: boolean;
  scale?: boolean;
  provider?: 'auto' | 'tesseract' | 'google' | 'aws' | 'ocrspace';
  fallback?: boolean;
  confidence?: number;
}

/**
 * OCR.space Provider (Current implementation)
 */
class OCRSpaceProvider implements OCRProvider {
  name = 'ocrspace';
  private apiKey: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_OCR_SPACE_API_KEY || '';
  }

  async extractText(imageData: string | File, options: any = {}): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      const formData = new FormData();
      
      if (typeof imageData === 'string') {
        formData.append("url", imageData);
      } else {
        const base64 = await this.convertFileToBase64(imageData);
        formData.append("base64Image", base64.split(',')[1]);
      }
      
      formData.append("language", options.language || "eng");
      formData.append("isOverlayRequired", "false");
      formData.append("detectOrientation", options.orientation ? "true" : "false");
      formData.append("scale", options.scale ? "true" : "false");
      formData.append("OCREngine", "2");

      const response = await fetch("https://api.ocr.space/parse/image" + (typeof imageData === 'string' ? 'url' : ''), {
        method: "POST",
        headers: {
          "apikey": this.apiKey,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`OCR.space API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.IsErroredOnProcessing) {
        throw new Error(result.ErrorMessage || 'OCR processing failed');
      }

      const extractedText = result?.ParsedResults?.[0]?.ParsedText || "";
      const confidence = result?.ParsedResults?.[0]?.TextOverlay?.HasOverlay ? 0.8 : 0.6;

      return {
        text: extractedText,
        confidence,
        provider: this.name,
        processingTime: Date.now() - startTime,
        metadata: {
          language: options.language || 'eng',
          orientation: result?.ParsedResults?.[0]?.TextOverlay?.Lines?.length || 0
        }
      };

    } catch (error) {
      throw new Error(`OCR.space extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  getCostEstimate(): number {
    return 0.001; // $0.001 per request
  }

  private async convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

/**
 * Google Cloud Vision API Provider
 */
class GoogleVisionProvider implements OCRProvider {
  name = 'google';
  private apiKey: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_GOOGLE_VISION_API_KEY || '';
  }

  async extractText(imageData: string | File, options: any = {}): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      let imageContent: string;
      
      if (typeof imageData === 'string') {
        // Assume it's a base64 string
        imageContent = imageData.includes(',') ? imageData.split(',')[1] : imageData;
      } else {
        const base64 = await this.convertFileToBase64(imageData);
        imageContent = base64.split(',')[1];
      }

      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            image: {
              content: imageContent
            },
            features: [{
              type: 'TEXT_DETECTION',
              maxResults: 1
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Google Vision API error: ${response.status}`);
      }

      const result = await response.json();
      const textAnnotations = result.responses?.[0]?.textAnnotations || [];
      
      if (textAnnotations.length === 0) {
        throw new Error('No text detected in image');
      }

      const extractedText = textAnnotations[0].description || '';
      const confidence = this.calculateConfidence(textAnnotations);

      return {
        text: extractedText,
        confidence,
        provider: this.name,
        processingTime: Date.now() - startTime,
        metadata: {
          language: 'auto-detected',
          textBlocks: textAnnotations.slice(1), // Skip the full text annotation
          boundingBoxes: textAnnotations.slice(1).map((block: any) => block.boundingPoly)
        }
      };

    } catch (error) {
      throw new Error(`Google Vision extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  getCostEstimate(): number {
    return 0.0015; // $0.0015 per request
  }

  private calculateConfidence(textAnnotations: any[]): number {
    // Google Vision doesn't provide confidence scores, so we estimate based on text quality
    const avgTextLength = textAnnotations.slice(1).reduce((sum, block) => sum + block.description.length, 0) / Math.max(1, textAnnotations.length - 1);
    return Math.min(0.95, Math.max(0.6, avgTextLength / 50));
  }

  private async convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

/**
 * AWS Textract Provider
 */
class AWSTextractProvider implements OCRProvider {
  name = 'aws';
  private region: string;
  private accessKeyId: string;
  private secretAccessKey: string;

  constructor() {
    this.region = import.meta.env.VITE_AWS_REGION || 'us-east-1';
    this.accessKeyId = import.meta.env.VITE_AWS_ACCESS_KEY_ID || '';
    this.secretAccessKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || '';
  }

  async extractText(imageData: string | File, options: any = {}): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      // AWS Textract requires server-side implementation due to CORS and authentication
      // This is a placeholder for the client-side interface
      throw new Error('AWS Textract requires server-side implementation');
      
    } catch (error) {
      throw new Error(`AWS Textract extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isAvailable(): boolean {
    return !!(this.accessKeyId && this.secretAccessKey);
  }

  getCostEstimate(): number {
    return 0.0015; // $0.0015 per 1000 characters
  }
}

/**
 * Tesseract.js Provider (Client-side)
 */
class TesseractProvider implements OCRProvider {
  name = 'tesseract';
  private worker: any = null;

  constructor() {
    // Tesseract.js would be loaded dynamically
  }

  async extractText(imageData: string | File, options: any = {}): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      // Dynamic import of Tesseract.js
      const Tesseract = await import('tesseract.js');
      
      if (!this.worker) {
        this.worker = await Tesseract.createWorker(options.language || 'eng');
      }

      const { data } = await this.worker.recognize(imageData);
      
      return {
        text: data.text,
        confidence: data.confidence / 100, // Convert to 0-1 scale
        provider: this.name,
        processingTime: Date.now() - startTime,
        metadata: {
          language: options.language || 'eng',
          textBlocks: data.words,
          boundingBoxes: data.words.map((word: any) => word.bbox)
        }
      };

    } catch (error) {
      throw new Error(`Tesseract.js extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isAvailable(): boolean {
    return typeof window !== 'undefined'; // Browser only
  }

  getCostEstimate(): number {
    return 0; // Free, client-side processing
  }

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

/**
 * Advanced OCR Service
 */
export class AdvancedOCRService {
  private providers: Map<string, OCRProvider> = new Map();
  private defaultProvider: string = 'ocrspace';

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Initialize all providers
    const ocrSpace = new OCRSpaceProvider();
    const googleVision = new GoogleVisionProvider();
    const awsTextract = new AWSTextractProvider();
    const tesseract = new TesseractProvider();

    this.providers.set('ocrspace', ocrSpace);
    this.providers.set('google', googleVision);
    this.providers.set('aws', awsTextract);
    this.providers.set('tesseract', tesseract);

    // Set default provider based on availability
    if (ocrSpace.isAvailable()) {
      this.defaultProvider = 'ocrspace';
    } else if (googleVision.isAvailable()) {
      this.defaultProvider = 'google';
    } else if (tesseract.isAvailable()) {
      this.defaultProvider = 'tesseract';
    }
  }

  /**
   * Extract text from image using specified or best available provider
   */
  async extractText(
    imageData: string | File, 
    options: OCROptions = {}
  ): Promise<OCRResult> {
    const providerName = options.provider || this.defaultProvider;
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`OCR provider '${providerName}' not found`);
    }

    if (!provider.isAvailable()) {
      if (options.fallback) {
        return await this.extractTextWithFallback(imageData, options);
      }
      throw new Error(`OCR provider '${providerName}' is not available`);
    }

    try {
      const result = await provider.extractText(imageData, options);
      
      // If confidence is too low and fallback is enabled, try other providers
      if (result.confidence < (options.confidence || 0.7) && options.fallback) {
        return await this.extractTextWithFallback(imageData, options, result);
      }

      return result;

    } catch (error) {
      if (options.fallback) {
        return await this.extractTextWithFallback(imageData, options);
      }
      throw error;
    }
  }

  /**
   * Extract text with automatic fallback to other providers
   */
  private async extractTextWithFallback(
    imageData: string | File, 
    options: OCROptions,
    previousResult?: OCRResult
  ): Promise<OCRResult> {
    const availableProviders = Array.from(this.providers.entries())
      .filter(([name, provider]) => provider.isAvailable())
      .sort((a, b) => b[1].getCostEstimate() - a[1].getCostEstimate()); // Try cheaper providers first

    let bestResult = previousResult;

    for (const [name, provider] of availableProviders) {
      try {
        const result = await provider.extractText(imageData, options);
        
        if (!bestResult || result.confidence > bestResult.confidence) {
          bestResult = result;
        }

        // If we get good confidence, stop trying other providers
        if (result.confidence >= (options.confidence || 0.8)) {
          break;
        }

      } catch (error) {
        console.warn(`Provider ${name} failed:`, error);
        continue;
      }
    }

    if (!bestResult) {
      throw new Error('All OCR providers failed');
    }

    return bestResult;
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.entries())
      .filter(([name, provider]) => provider.isAvailable())
      .map(([name]) => name);
  }

  /**
   * Get provider information
   */
  getProviderInfo(providerName: string) {
    const provider = this.providers.get(providerName);
    if (!provider) return null;

    return {
      name: provider.name,
      available: provider.isAvailable(),
      costEstimate: provider.getCostEstimate()
    };
  }

  /**
   * Compare providers for a given image
   */
  async compareProviders(imageData: string | File, options: OCROptions = {}) {
    const results: Array<OCRResult & { cost: number }> = [];
    const availableProviders = this.getAvailableProviders();

    for (const providerName of availableProviders) {
      try {
        const provider = this.providers.get(providerName)!;
        const result = await provider.extractText(imageData, options);
        results.push({
          ...result,
          cost: provider.getCostEstimate()
        });
      } catch (error) {
        console.warn(`Provider ${providerName} failed:`, error);
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    const tesseractProvider = this.providers.get('tesseract') as TesseractProvider;
    if (tesseractProvider) {
      await tesseractProvider.terminate();
    }
  }
}

// Export singleton instance
export const advancedOCRService = new AdvancedOCRService();
