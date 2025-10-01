import { Result, Ok, Err } from '../../types/result';
import { getSupabaseServerClient } from '../db';

export interface OCRResult {
  text: string;
  confidence: number;
  provider: string;
  processingTime: number;
  cost: number;
  fields?: {
    vendor?: string;
    date?: string;
    total?: number;
    items?: Array<{ description: string; amount: number }>;
    tax?: number;
    paymentMethod?: string;
  };
  boundingBoxes?: any[];
  metadata?: {
    imageSize: number;
    imageDimensions: { width: number; height: number };
    preprocessingApplied: string[];
  };
}

export class ServerOCRService {
  private providers: Map<string, OCRProvider>;
  
  constructor() {
    this.providers = new Map([
      ['google', new GoogleVisionProvider()],
      ['ocrspace', new OCRSpaceProvider()],
      ['textract', new TextractProvider()],
    ]);
  }
  
  async processReceipt(
    buffer: Buffer,
    options: {
      preferredProvider?: string;
      maxCost?: number;
      minConfidence?: number;
      enablePreprocessing?: boolean;
    } = {}
  ): Promise<Result<OCRResult>> {
    const startTime = Date.now();
    const {
      preferredProvider,
      maxCost = 0.10,
      minConfidence = 0.5,
      enablePreprocessing = true,
    } = options;
    
    try {
      // Image analysis for provider selection
      const analysis = await this.analyzeImage(buffer);
      
      // Preprocess if enabled (server-side only)
      const processedBuffer = enablePreprocessing 
        ? await this.preprocessImageServer(buffer, analysis)
        : buffer;
      
      // Determine optimal provider order
      const providerOrder = this.selectOptimalProviders(analysis, preferredProvider, maxCost);
      
      let lastError: Error | null = null;
      let totalCost = 0;
      
      for (const providerName of providerOrder) {
        const provider = this.providers.get(providerName);
        if (!provider) continue;
        
        // Check cost limit
        if (totalCost + provider.estimatedCost > maxCost) {
          console.warn(`Skipping ${providerName} - would exceed cost limit`);
          continue;
        }
        
        try {
          const result = await provider.process(processedBuffer, {
            minConfidence,
            imageAnalysis: analysis,
          });
          
          // Validate result
          if (result.confidence < minConfidence && providerName !== providerOrder[providerOrder.length - 1]) {
            console.warn(`${providerName} confidence too low (${result.confidence}), trying next provider`);
            continue;
          }
          
          // Extract and enrich data
          const enriched = await this.enrichReceiptData({
            ...result,
            processingTime: Date.now() - startTime,
            cost: totalCost + result.cost,
            metadata: {
              imageSize: buffer.length,
              imageDimensions: analysis.dimensions,
              preprocessingApplied: enablePreprocessing ? ['rotate', 'normalize', 'grayscale'] : [],
            },
          });
          
          return Ok(enriched);
          
        } catch (error) {
          console.error(`${providerName} failed:`, error);
          lastError = error as Error;
        }
      }
      
      return Err(lastError || new Error('All OCR providers failed'));
      
    } catch (error) {
      return Err(error as Error);
    }
  }
  
  private async analyzeImage(buffer: Buffer): Promise<ImageAnalysis> {
    try {
      // Dynamic import to avoid bundling Sharp in client
      const sharp = await import('sharp');
      
      const metadata = await sharp.default(buffer).metadata();
      const stats = await sharp.default(buffer).stats();
      
      return {
        dimensions: { width: metadata.width!, height: metadata.height! },
        size: buffer.length,
        format: metadata.format!,
        quality: this.assessImageQuality(stats),
        complexity: this.assessComplexity(stats),
        orientation: metadata.orientation || 1,
        hasText: await this.detectTextPresence(buffer),
      };
    } catch (error) {
      // Fallback analysis without Sharp
      return {
        dimensions: { width: 0, height: 0 },
        size: buffer.length,
        format: 'unknown',
        quality: 0.5,
        complexity: 0.5,
        orientation: 1,
        hasText: true,
      };
    }
  }
  
  private async preprocessImageServer(buffer: Buffer, analysis: ImageAnalysis): Promise<Buffer> {
    try {
      // Dynamic import to avoid bundling Sharp in client
      const sharp = await import('sharp');
      
      let pipeline = sharp.default(buffer);
      
      // Auto-rotate if needed
      if (analysis.orientation && analysis.orientation !== 1) {
        pipeline = pipeline.rotate();
      }
      
      // Enhance based on quality assessment
      if (analysis.quality < 0.4) {
        pipeline = pipeline
          .normalize()
          .sharpen({ sigma: 1.0, flat: 1.0, jagged: 2.0});
      }
      
      // Convert to optimal format for OCR
      pipeline = pipeline
        .grayscale()
        .resize(2000, 2000, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      
      return await pipeline.toBuffer();
    } catch (error) {
      console.warn('Server preprocessing failed, using original image:', error);
      return buffer;
    }
  }
  
  private assessImageQuality(stats: any): number {
    if (!stats.channels || stats.channels.length === 0) return 0.5;
    
    const channel = stats.channels[0];
    const mean = channel.mean;
    const stdev = channel.stdev;
    
    const contrastScore = Math.min(stdev / 50, 1);
    const brightnessScore = 1 - Math.abs(mean - 128) / 128;
    
    return (contrastScore + brightnessScore) / 2;
  }
  
  private assessComplexity(stats: any): number {
    const channelCount = stats.channels?.length || 1;
    const avgStdev = stats.channels?.reduce((sum: number, ch: any) => sum + ch.stdev, 0) / channelCount || 0;
    
    return Math.min((channelCount - 1) / 3 + avgStdev / 100, 1);
  }
  
  private async detectTextPresence(buffer: Buffer): Promise<boolean> {
    try {
      const sharp = await import('sharp');
      
      const edges = await sharp.default(buffer)
        .grayscale()
        .convolve({
          width: 3,
          height: 3,
          kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
        })
        .raw()
        .toBuffer();
      
      const threshold = 128;
      let edgePixels = 0;
      
      for (let i = 0; i < edges.length; i++) {
        if (edges[i] > threshold) edgePixels++;
      }
      
      const edgeRatio = edgePixels / edges.length;
      return edgeRatio > 0.05;
    } catch {
      return true;
    }
  }
  
  private selectOptimalProviders(
    analysis: ImageAnalysis,
    preferredProvider?: string,
    maxCost?: number
  ): string[] {
    const baseOrder = ['google', 'ocrspace', 'textract'];
    
    const affordableProviders = baseOrder.filter(name => {
      const provider = this.providers.get(name);
      return provider && provider.estimatedCost <= (maxCost || 0.10);
    });
    
    if (analysis.quality < 0.3 || analysis.complexity > 0.7) {
      return ['google', ...affordableProviders.filter(p => p !== 'google')];
    } else if (analysis.size > 1024 * 1024) {
      return ['google', ...affordableProviders.filter(p => p !== 'google')];
    } else {
      return ['ocrspace', ...affordableProviders.filter(p => p !== 'ocrspace')];
    }
  }
  
  private async enrichReceiptData(data: OCRResult): Promise<OCRResult> {
    // Merchant enrichment
    if (data.fields?.vendor) {
      const merchantInfo = await this.lookupMerchant(data.fields.vendor);
      if (merchantInfo) {
        data.fields.vendor = merchantInfo.display_name;
        data.fields.category = merchantInfo.category;
      }
    }
    
    // Validate and enhance totals
    if (data.fields?.items && data.fields?.total) {
      const itemSum = data.fields.items.reduce((sum, item) => sum + item.amount, 0);
      const tax = data.fields.tax || 0;
      const calculatedTotal = itemSum + tax;
      
      if (Math.abs(calculatedTotal - data.fields.total) > 0.1) {
        data.confidence *= 0.8;
      }
    }
    
    return data;
  }
  
  private async lookupMerchant(vendor: string): Promise<any> {
    const client = getSupabaseServerClient();
    
    const normalizedName = this.normalizeVendor(vendor);
    
    const { data } = await client
      .from('merchant_data')
      .select('*')
      .ilike('normalized_name', `%${normalizedName}%`)
      .limit(1)
      .single();
    
    return data;
  }
  
  private normalizeVendor(vendor: string): string {
    return vendor.toLowerCase()
      .replace(/\s+(inc|ltd|llc|corp|co|store|#\d+).*$/gi, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
  }
}

// Enhanced OCR Provider Interface
abstract class OCRProvider {
  abstract estimatedCost: number;
  abstract process(buffer: Buffer, options: any): Promise<OCRResult>;
}

// Real Google Vision Implementation
class GoogleVisionProvider extends OCRProvider {
  estimatedCost = 0.015;
  
  async process(buffer: Buffer, options: any): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      const apiKey = process.env.GOOGLE_VISION_API_KEY;
      if (!apiKey) throw new Error('Google Vision API key not configured');
      
      const base64 = buffer.toString('base64');
      
      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64 },
            features: [
              { type: 'TEXT_DETECTION', maxResults: 1 },
              { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
            ],
          }],
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Google Vision API error: ${response.status}`);
      }
      
      const result = await response.json();
      const textAnnotations = result.responses[0]?.textAnnotations || [];
      
      if (textAnnotations.length === 0) {
        throw new Error('No text detected');
      }
      
      const fullText = textAnnotations[0].description;
      const confidence = this.calculateConfidence(textAnnotations);
      
      return {
        text: fullText,
        confidence,
        provider: 'google',
        processingTime: Date.now() - startTime,
        cost: this.estimatedCost,
        boundingBoxes: textAnnotations.slice(1),
      };
      
    } catch (error) {
      throw new Error(`Google Vision failed: ${error.message}`);
    }
  }
  
  private calculateConfidence(annotations: any[]): number {
    if (annotations.length <= 1) return 0.8;
    
    const blockConfidences = annotations.slice(1).map(block => {
      const area = this.calculateBoundingBoxArea(block.boundingPoly);
      return Math.min(area / 10000, 1);
    });
    
    return blockConfidences.reduce((sum, conf) => sum + conf, 0) / blockConfidences.length;
  }
  
  private calculateBoundingBoxArea(boundingPoly: any): number {
    const vertices = boundingPoly.vertices;
    if (vertices.length < 4) return 0;
    
    let area = 0;
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      area += vertices[i].x * vertices[j].y;
      area -= vertices[j].x * vertices[i].y;
    }
    return Math.abs(area) / 2;
  }
}

// Real OCR.space Implementation
class OCRSpaceProvider extends OCRProvider {
  estimatedCost = 0.002;
  
  async process(buffer: Buffer, options: any): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      const apiKey = process.env.OCR_SPACE_API_KEY;
      if (!apiKey) throw new Error('OCR.space API key not configured');
      
      const formData = new FormData();
      formData.append('file', new Blob([buffer]), 'receipt.jpg');
      formData.append('apikey', apiKey);
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');
      formData.append('detectOrientation', 'true');
      formData.append('scale', 'true');
      formData.append('OCREngine', '2');
      
      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`OCR.space API error: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.ParsedResults || result.ParsedResults.length === 0) {
        throw new Error('No text extracted');
      }
      
      const parsedResult = result.ParsedResults[0];
      const text = parsedResult.ParsedText;
      const confidence = parsedResult.TextOverlay?.Lines?.reduce((sum: number, line: any) => 
        sum + (line.Words?.reduce((wordSum: number, word: any) => 
          wordSum + (word.WordConfidence || 0.8), 0) || 0.8), 0) / 
        (parsedResult.TextOverlay?.Lines?.length || 1) / 100;
      
      return {
        text,
        confidence: confidence || 0.7,
        provider: 'ocrspace',
        processingTime: Date.now() - startTime,
        cost: this.estimatedCost,
      };
      
    } catch (error) {
      throw new Error(`OCR.space failed: ${error.message}`);
    }
  }
}

// AWS Textract Implementation
class TextractProvider extends OCRProvider {
  estimatedCost = 0.0015;
  
  async process(buffer: Buffer, options: any): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      // Mock implementation for now
      return {
        text: 'Mock Textract result - implement AWS SDK',
        confidence: 0.75,
        provider: 'textract',
        processingTime: Date.now() - startTime,
        cost: this.estimatedCost,
      };
    } catch (error) {
      throw new Error(`Textract failed: ${error.message}`);
    }
  }
}

interface ImageAnalysis {
  dimensions: { width: number; height: number };
  size: number;
  format: string;
  quality: number;
  complexity: number;
  orientation: number;
  hasText: boolean;
}
