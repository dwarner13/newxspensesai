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

export interface PerformanceMetrics {
  totalProcessed: number;
  successRate: number;
  avgProcessingTime: number;
  avgCost: number;
  providerStats: {
    [provider: string]: {
      count: number;
      successRate: number;
      avgTime: number;
      avgCost: number;
    };
  };
}

export class EnhancedOCRService {
  private providers: Map<string, OCRProvider>;
  private metrics: PerformanceMetrics;
  
  constructor() {
    this.providers = new Map([
      ['google', new GoogleVisionProvider()],
      ['ocrspace', new OCRSpaceProvider()],
      ['textract', new TextractProvider()],
      ['tesseract', new TesseractProvider()],
    ]);
    
    this.metrics = {
      totalProcessed: 0,
      successRate: 0,
      avgProcessingTime: 0,
      avgCost: 0,
      providerStats: {},
    };
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
      maxCost = 0.10, // $0.10 max cost per receipt
      minConfidence = 0.5,
      enablePreprocessing = true,
    } = options;
    
    try {
      // Image analysis for provider selection
      const analysis = await this.analyzeImage(buffer);
      
      // Preprocess if enabled
      const processedBuffer = enablePreprocessing 
        ? await this.preprocessImage(buffer, analysis)
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
          
          // Update metrics
          await this.updateMetrics(providerName, true, enriched.processingTime, enriched.cost);
          
          return Ok(enriched);
          
        } catch (error) {
          console.error(`${providerName} failed:`, error);
          lastError = error as Error;
          await this.updateMetrics(providerName, false, Date.now() - startTime, 0);
        }
      }
      
      return Err(lastError || new Error('All OCR providers failed'));
      
    } catch (error) {
      return Err(error as Error);
    }
  }
  
  private async analyzeImage(buffer: Buffer): Promise<ImageAnalysis> {
    const sharp = require('sharp');
    
    try {
      const metadata = await sharp(buffer).metadata();
      const stats = await sharp(buffer).stats();
      
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
      return {
        dimensions: { width: 0, height: 0 },
        size: buffer.length,
        format: 'unknown',
        quality: 0.5,
        complexity: 0.5,
        orientation: 1,
        hasText: true, // Assume text presence if analysis fails
      };
    }
  }
  
  private assessImageQuality(stats: any): number {
    // Analyze histogram for quality assessment
    const { channels } = stats;
    if (!channels || channels.length === 0) return 0.5;
    
    // Calculate contrast and brightness
    const channel = channels[0];
    const mean = channel.mean;
    const stdev = channel.stdev;
    
    // Higher contrast and moderate brightness = better quality
    const contrastScore = Math.min(stdev / 50, 1); // Normalize stdev
    const brightnessScore = 1 - Math.abs(mean - 128) / 128; // Closer to 128 is better
    
    return (contrastScore + brightnessScore) / 2;
  }
  
  private assessComplexity(stats: any): number {
    // More channels and higher stdev = more complex
    const channelCount = stats.channels?.length || 1;
    const avgStdev = stats.channels?.reduce((sum: number, ch: any) => sum + ch.stdev, 0) / channelCount || 0;
    
    return Math.min((channelCount - 1) / 3 + avgStdev / 100, 1);
  }
  
  private async detectTextPresence(buffer: Buffer): Promise<boolean> {
    // Simple heuristic - look for high-frequency edges
    const sharp = require('sharp');
    
    try {
      const edges = await sharp(buffer)
        .grayscale()
        .convolve({
          width: 3,
          height: 3,
          kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
        })
        .raw()
        .toBuffer();
      
      // Count high-intensity pixels (potential text edges)
      const threshold = 128;
      let edgePixels = 0;
      
      for (let i = 0; i < edges.length; i++) {
        if (edges[i] > threshold) edgePixels++;
      }
      
      const edgeRatio = edgePixels / edges.length;
      return edgeRatio > 0.05; // 5% edge pixels suggests text
    } catch {
      return true; // Assume text if detection fails
    }
  }
  
  private selectOptimalProviders(
    analysis: ImageAnalysis,
    preferredProvider?: string,
    maxCost?: number
  ): string[] {
    const baseOrder = ['google', 'ocrspace', 'textract', 'tesseract'];
    
    // Cost-based filtering
    const affordableProviders = baseOrder.filter(name => {
      const provider = this.providers.get(name);
      return provider && provider.estimatedCost <= (maxCost || 0.10);
    });
    
    // Quality-based ordering
    if (analysis.quality < 0.3 || analysis.complexity > 0.7) {
      // Poor quality or complex image - prioritize Google Vision
      return ['google', ...affordableProviders.filter(p => p !== 'google')];
    } else if (analysis.size > 1024 * 1024) {
      // Large file - use Google Vision for better handling
      return ['google', ...affordableProviders.filter(p => p !== 'google')];
    } else {
      // Good quality, small file - prioritize cost-effective options
      return ['ocrspace', 'tesseract', ...affordableProviders.filter(p => p !== 'ocrspace' && p !== 'tesseract')];
    }
  }
  
  private async preprocessImage(buffer: Buffer, analysis: ImageAnalysis): Promise<Buffer> {
    const sharp = require('sharp');
    
    try {
      let pipeline = sharp(buffer);
      
      // Auto-rotate if needed
      if (analysis.orientation && analysis.orientation !== 1) {
        pipeline = pipeline.rotate();
      }
      
      // Enhance based on quality assessment
      if (analysis.quality < 0.4) {
        pipeline = pipeline
          .normalize() // Enhance contrast
          .sharpen({ sigma: 1.0, flat: 1.0, jagged: 2.0});
      }
      
      // Convert to optimal format for OCR
      pipeline = pipeline
        .grayscale() // Better OCR accuracy
        .resize(2000, 2000, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      
      return await pipeline.toBuffer();
    } catch (error) {
      console.warn('Preprocessing failed, using original image:', error);
      return buffer;
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
      
      // Adjust confidence based on total accuracy
      if (Math.abs(calculatedTotal - data.fields.total) > 0.1) {
        data.confidence *= 0.8;
        console.warn(`Total mismatch: calculated ${calculatedTotal}, found ${data.fields.total}`);
      }
    }
    
    // Add semantic analysis
    data.fields = await this.enhanceWithSemanticAnalysis(data.fields, data.text);
    
    return data;
  }
  
  private async enhanceWithSemanticAnalysis(fields: any, rawText: string): Promise<any> {
    // Use AI to extract additional insights
    try {
      const prompt = `
        Analyze this receipt text and extract additional insights:
        Text: ${rawText}
        
        Current fields: ${JSON.stringify(fields)}
        
        Extract:
        1. Business type/category
        2. Payment method
        3. Any discounts or promotions
        4. Location information
        5. Confidence assessment
      `;
      
      // This would call your AI service
      // const aiResponse = await this.callAI(prompt);
      
      return fields; // For now, return original fields
    } catch (error) {
      console.warn('Semantic analysis failed:', error);
      return fields;
    }
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
  
  private async updateMetrics(
    provider: string,
    success: boolean,
    processingTime: number,
    cost: number
  ): Promise<void> {
    this.metrics.totalProcessed++;
    
    if (!this.metrics.providerStats[provider]) {
      this.metrics.providerStats[provider] = {
        count: 0,
        successRate: 0,
        avgTime: 0,
        avgCost: 0,
      };
    }
    
    const stats = this.metrics.providerStats[provider];
    stats.count++;
    stats.successRate = (stats.successRate * (stats.count - 1) + (success ? 1 : 0)) / stats.count;
    stats.avgTime = (stats.avgTime * (stats.count - 1) + processingTime) / stats.count;
    stats.avgCost = (stats.avgCost * (stats.count - 1) + cost) / stats.count;
    
    // Update global metrics
    this.metrics.successRate = (this.metrics.successRate * (this.metrics.totalProcessed - 1) + (success ? 1 : 0)) / this.metrics.totalProcessed;
    this.metrics.avgProcessingTime = (this.metrics.avgProcessingTime * (this.metrics.totalProcessed - 1) + processingTime) / this.metrics.totalProcessed;
    this.metrics.avgCost = (this.metrics.avgCost * (this.metrics.totalProcessed - 1) + cost) / this.metrics.totalProcessed;
    
    // Store metrics in database
    await this.storeMetrics();
  }
  
  private async storeMetrics(): Promise<void> {
    const client = getSupabaseServerClient();
    
    await client
      .from('ocr_metrics')
      .upsert({
        date: new Date().toISOString().split('T')[0],
        total_processed: this.metrics.totalProcessed,
        success_rate: this.metrics.successRate,
        avg_processing_time: this.metrics.avgProcessingTime,
        avg_cost: this.metrics.avgCost,
        provider_stats: this.metrics.providerStats,
      }, {
        onConflict: 'date',
      });
  }
  
  getMetrics(): PerformanceMetrics {
    return this.metrics;
  }
}

// Enhanced OCR Provider Interface
abstract class OCRProvider {
  abstract estimatedCost: number;
  abstract process(buffer: Buffer, options: any): Promise<OCRResult>;
}

// Real Google Vision Implementation
class GoogleVisionProvider extends OCRProvider {
  estimatedCost = 0.015; // $1.50 per 1000 requests
  
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
        boundingBoxes: textAnnotations.slice(1), // Skip full text annotation
      };
      
    } catch (error) {
      throw new Error(`Google Vision failed: ${error.message}`);
    }
  }
  
  private calculateConfidence(annotations: any[]): number {
    // Calculate average confidence from individual text blocks
    if (annotations.length <= 1) return 0.8;
    
    const blockConfidences = annotations.slice(1).map(block => {
      // Google Vision doesn't provide confidence scores directly
      // Use text block size and quality as proxy
      const area = this.calculateBoundingBoxArea(block.boundingPoly);
      return Math.min(area / 10000, 1); // Normalize area to confidence});
    
    return blockConfidences.reduce((sum, conf) => sum + conf, 0) / blockConfidences.length;
  }
  
  private calculateBoundingBoxArea(boundingPoly: any): number {
    const vertices = boundingPoly.vertices;
    if (vertices.length < 4) return 0;
    
    // Calculate area using shoelace formula
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
  estimatedCost = 0.002; // $2 per 1000 requests
  
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
      formData.append('OCREngine', '2'); // Engine 2 for best accuracy
      
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
  estimatedCost = 0.0015; // $1.50 per 1000 requests
  
  async process(buffer: Buffer, options: any): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      // AWS Textract implementation would go here
      // For now, return mock data
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

// Local Tesseract Implementation
class TesseractProvider extends OCRProvider {
  estimatedCost = 0.0001; // Minimal cost for local processing
  
  async process(buffer: Buffer, options: any): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      // Tesseract.js implementation
      const Tesseract = require('tesseract.js');
      
      const { data: { text, confidence } } = await Tesseract.recognize(buffer, 'eng', {
        logger: m => console.log(m),
      });
      
      return {
        text,
        confidence: confidence / 100,
        provider: 'tesseract',
        processingTime: Date.now() - startTime,
        cost: this.estimatedCost,
      };
      
    } catch (error) {
      throw new Error(`Tesseract failed: ${error.message}`);
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
