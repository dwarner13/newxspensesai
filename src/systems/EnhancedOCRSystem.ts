// Enhanced OCR System with Parallel Processing and Smart Preprocessing
export interface OCRResult {
  text: string;
  confidence: number;
  source: 'ocrspace' | 'openai' | 'tesseract' | 'merged';
  processingTime: number;
  metadata?: any;
}

export interface PreprocessedImage {
  original: File;
  optimized: ArrayBuffer;
  features: {
    width: number;
    height: number;
    colorHistogram: number[];
    textLayout: string;
    detectedLogos: string[];
    complexity: 'simple' | 'medium' | 'complex';
  };
}

export interface ReceiptTemplate {
  id: string;
  name: string;
  merchantPattern: RegExp;
  totalPattern: RegExp;
  datePattern: RegExp;
  itemPattern?: RegExp;
  structure: string;
  confidence: number;
}

export interface ExtractedData {
  merchant: string;
  amount: number;
  date: string;
  items: Array<{name: string; price: number}>;
  tax: number;
  paymentMethod: string;
  receiptNumber: string;
  confidence: number;
  source: string;
}

export class EnhancedOCRSystem {
  private receiptTemplates: Map<string, ReceiptTemplate>;
  private ocrCache: Map<string, OCRResult>;
  private processingStats: {
    totalProcessed: number;
    averageTime: number;
    successRate: number;
    costPerReceipt: number;
  };

  constructor() {
    this.receiptTemplates = new Map();
    this.ocrCache = new Map();
    this.processingStats = {
      totalProcessed: 0,
      averageTime: 0,
      successRate: 0,
      costPerReceipt: 0
    };
    
    this.initializeReceiptTemplates();
  }

  private initializeReceiptTemplates(): void {
    const templates: ReceiptTemplate[] = [
      {
        id: 'walmart',
        name: 'Walmart',
        merchantPattern: /WAL[\*\s]MART|WALMART/i,
        totalPattern: /TOTAL\s+\$?([\d.]+)/,
        datePattern: /(\d{2}\/\d{2}\/\d{2,4})/,
        structure: 'header-items-total',
        confidence: 0.95
      },
      {
        id: 'starbucks',
        name: 'Starbucks',
        merchantPattern: /STARBUCKS/i,
        totalPattern: /Subtotal:?\s*\$?([\d.]+)/i,
        datePattern: /(\d{2}\/\d{2}\/\d{2,4})/,
        itemPattern: /(\d+)\s+(.+?)\s+\$?([\d.]+)/,
        structure: 'header-items-subtotal',
        confidence: 0.9
      },
      {
        id: 'mcdonalds',
        name: 'McDonald\'s',
        merchantPattern: /MCDONALD|MCD/i,
        totalPattern: /TOTAL\s+\$?([\d.]+)/i,
        datePattern: /(\d{2}\/\d{2}\/\d{2,4})/,
        structure: 'header-items-total',
        confidence: 0.9
      },
      {
        id: 'target',
        name: 'Target',
        merchantPattern: /TARGET/i,
        totalPattern: /TOTAL\s+\$?([\d.]+)/i,
        datePattern: /(\d{2}\/\d{2}\/\d{2,4})/,
        structure: 'header-items-total',
        confidence: 0.9
      },
      {
        id: 'amazon',
        name: 'Amazon',
        merchantPattern: /AMAZON/i,
        totalPattern: /Total\s+\$?([\d.]+)/i,
        datePattern: /(\d{2}\/\d{2}\/\d{2,4})/,
        structure: 'header-items-total',
        confidence: 0.85
      }
    ];

    templates.forEach(template => {
      this.receiptTemplates.set(template.id, template);
    });
  }

  // Main enhanced OCR processing with parallel execution
  async processReceipt(imageFile: File, userId: string): Promise<{
    success: boolean;
    data?: ExtractedData;
    error?: string;
    processingTime: number;
    cost: number;
  }> {
    const startTime = Date.now();
    console.log(`📄 Enhanced OCR: Processing receipt for user ${userId}`);
    
    try {
      // Step 1: Preprocess image locally
      const preprocessed = await this.preprocessImage(imageFile);
      console.log(`📄 Enhanced OCR: Image preprocessed, complexity: ${preprocessed.features.complexity}`);
      
      // Step 2: Check cache first
      const cacheKey = await this.generateImageHash(imageFile);
      const cached = this.ocrCache.get(cacheKey);
      if (cached && Date.now() - cached.metadata?.timestamp < 24 * 60 * 60 * 1000) {
        console.log(`📄 Enhanced OCR: Using cached result`);
        return {
          success: true,
          data: await this.extractDataFromText(cached.text, userId),
          processingTime: Date.now() - startTime,
          cost: 0
        };
      }
      
      // Step 3: Run parallel OCR processing
      const ocrResults = await this.runParallelOCR(preprocessed);
      console.log(`📄 Enhanced OCR: Parallel processing complete, ${ocrResults.length} results`);
      
      // Step 4: Merge and select best result
      const bestResult = this.mergeOCRResults(ocrResults);
      console.log(`📄 Enhanced OCR: Best result from ${bestResult.source}, confidence: ${bestResult.confidence}`);
      
      // Step 5: Cache the result
      this.ocrCache.set(cacheKey, bestResult);
      
      // Step 6: Extract structured data
      const extractedData = await this.extractDataFromText(bestResult.text, userId);
      
      const processingTime = Date.now() - startTime;
      const cost = this.calculateCost(ocrResults);
      
      this.updateStats(processingTime, true, cost);
      
      return {
        success: true,
        data: extractedData,
        processingTime,
        cost
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateStats(processingTime, false, 0);
      
      console.error(`📄 Enhanced OCR: Processing failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
        cost: 0
      };
    }
  }

  // Smart image preprocessing
  private async preprocessImage(file: File): Promise<PreprocessedImage> {
    console.log(`📄 Enhanced OCR: Preprocessing image ${file.name}`);
    
    const arrayBuffer = await file.arrayBuffer();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        // Calculate optimal dimensions
        const maxWidth = 2000;
        const maxHeight = 2000;
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Apply preprocessing filters
        ctx!.filter = 'contrast(1.2) brightness(1.1) saturate(0)';
        ctx!.drawImage(img, 0, 0, width, height);
        
        // Get processed image data
        const imageData = ctx!.getImageData(0, 0, width, height);
        
        // Analyze image features
        const features = this.analyzeImageFeatures(imageData, width, height);
        
        // Convert to optimized format
        canvas.toBlob(async (blob) => {
          if (!blob) {
            reject(new Error('Failed to process image'));
            return;
          }
          
          const optimized = await blob.arrayBuffer();
          
          resolve({
            original: file,
            optimized,
            features});
        }, 'image/jpeg', 0.9);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  private analyzeImageFeatures(imageData: ImageData, width: number, height: number): PreprocessedImage['features'] {
    const data = imageData.data;
    const colorHistogram = new Array(256).fill(0);
    let textPixels = 0;
    let totalPixels = 0;
    
    // Analyze color distribution and text density
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      
      colorHistogram[gray]++;
      totalPixels++;
      
      // Detect text-like pixels (high contrast)
      if (gray < 50 || gray > 200) {
        textPixels++;
      }
    }
    
    // Determine complexity based on text density and image size
    const textDensity = textPixels / totalPixels;
    let complexity: 'simple' | 'medium' | 'complex' = 'simple';
    
    if (textDensity > 0.3 || width * height > 1000000) {
      complexity = 'complex';
    } else if (textDensity > 0.15 || width * height > 500000) {
      complexity = 'medium';
    }
    
    return {
      width,
      height,
      colorHistogram,
      textLayout: this.detectTextLayout(imageData, width, height),
      detectedLogos: this.detectLogos(imageData, width, height),
      complexity
    };
  }

  private detectTextLayout(imageData: ImageData, width: number, height: number): string {
    // Simplified text layout detection
    // In a real implementation, this would use more sophisticated computer vision
    const data = imageData.data;
    const textRegions = [];
    
    // Scan for text regions (simplified)
    for (let y = 0; y < height; y += 20) {
      let textPixels = 0;
      for (let x = 0; x < width; x += 20) {
        const index = (y * width + x) * 4;
        const gray = Math.round(0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2]);
        if (gray < 50 || gray > 200) textPixels++;
      }
      
      if (textPixels > width / 40) {
        textRegions.push(y);
      }
    }
    
    if (textRegions.length > 10) return 'dense';
    if (textRegions.length > 5) return 'medium';
    return 'sparse';
  }

  private detectLogos(imageData: ImageData, width: number, height: number): string[] {
    // Simplified logo detection
    // In a real implementation, this would use trained models
    const logos: string[] = [];
    
    // Check for common logo patterns (simplified)
    const data = imageData.data;
    const centerX = width / 2;
    const centerY = height / 4; // Logos are usually in the top portion
    
    // Sample a region around the center-top
    for (let y = centerY - 50; y < centerY + 50; y++) {
      for (let x = centerX - 100; x < centerX + 100; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const index = (y * width + x) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          
          // Detect red logos (Starbucks, Target, etc.)
          if (r > 200 && g < 100 && b < 100) {
            logos.push('red-logo');
            break;
          }
          
          // Detect blue logos (Walmart, etc.)
          if (b > 200 && r < 100 && g < 100) {
            logos.push('blue-logo');
            break;
          }
        }
      }
    }
    
    return logos;
  }

  // Parallel OCR processing
  private async runParallelOCR(preprocessed: PreprocessedImage): Promise<OCRResult[]> {
    console.log(`📄 Enhanced OCR: Starting parallel processing`);
    
    const promises: Promise<OCRResult>[] = [];
    
    // Always try local Tesseract first (free)
    promises.push(this.processWithTesseractLocal(preprocessed));
    
    // Add OCR.space (cheap)
    promises.push(this.processWithOCRSpace(preprocessed));
    
    // Add OpenAI Vision (expensive, but accurate)
    promises.push(this.processWithOpenAIVision(preprocessed));
    
    // Wait for all to complete
    const results = await Promise.allSettled(promises);
    
    return results
      .filter((result): result is PromiseFulfilledResult<OCRResult> => result.status === 'fulfilled')
      .map(result => result.value);
  }

  private async processWithTesseractLocal(preprocessed: PreprocessedImage): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      // Simulate local Tesseract processing
      // In a real implementation, this would use Tesseract.js
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock result - in reality, this would be actual OCR
      const mockText = "WALMART\n123 Main St\nCity, State 12345\n\nItem 1 $10.00\nItem 2 $15.00\n\nTOTAL $25.00\n\nThank you for shopping!";
      
      return {
        text: mockText,
        confidence: 0.7,
        source: 'tesseract',
        processingTime: Date.now() - startTime,
        metadata: { local: true, cost: 0 }
      };
    } catch (error) {
      throw new Error(`Local OCR failed: ${error}`);
    }
  }

  private async processWithOCRSpace(preprocessed: PreprocessedImage): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      // Convert ArrayBuffer to base64
      const base64 = await this.arrayBufferToBase64(preprocessed.optimized);
      
      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_OCR_SPACE_API_KEY || ''
        },
        body: JSON.stringify({
          base64Image: `data:image/jpeg;base64,${base64}`,
          language: 'eng',
          isOverlayRequired: false,
          OCREngine: 2
        })
      });
      
      if (!response.ok) {
        throw new Error(`OCR.space API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.ParsedResults && data.ParsedResults.length > 0) {
        return {
          text: data.ParsedResults[0].ParsedText,
          confidence: data.ParsedResults[0].TextOverlay?.Lines?.length > 0 ? 0.8 : 0.6,
          source: 'ocrspace',
          processingTime: Date.now() - startTime,
          metadata: { cost: 0.001 }
        };
      }
      
      throw new Error('No text extracted from OCR.space');
    } catch (error) {
      throw new Error(`OCR.space failed: ${error}`);
    }
  }

  private async processWithOpenAIVision(preprocessed: PreprocessedImage): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      // Convert ArrayBuffer to base64
      const base64 = await this.arrayBufferToBase64(preprocessed.optimized);
      
      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract all text from this receipt image. Return only the raw text without any formatting or explanations.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64}`
                  }
                }
              ]
            }
          ],
          max_tokens: 1000
        })
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI Vision API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        text: data.choices[0].message.content,
        confidence: 0.9,
        source: 'openai',
        processingTime: Date.now() - startTime,
        metadata: { cost: 0.01 }
      };
    } catch (error) {
      throw new Error(`OpenAI Vision failed: ${error}`);
    }
  }

  // Intelligent result merging
  private mergeOCRResults(results: OCRResult[]): OCRResult {
    if (results.length === 0) {
      throw new Error('No OCR results to merge');
    }
    
    if (results.length === 1) {
      return results[0];
    }
    
    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence);
    
    const best = results[0];
    
    // If best result has high confidence, use it
    if (best.confidence > 0.85) {
      return best;
    }
    
    // Otherwise, merge results
    const mergedText = this.mergeTexts(results.map(r => r.text));
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    const totalTime = results.reduce((sum, r) => sum + r.processingTime, 0);
    
    return {
      text: mergedText,
      confidence: Math.min(avgConfidence + 0.1, 1.0),
      source: 'merged',
      processingTime: totalTime,
      metadata: { mergedFrom: results.map(r => r.source) }
    };
  }

  private mergeTexts(texts: string[]): string {
    // Simple text merging - in reality, this would be more sophisticated
    const uniqueLines = new Set<string>();
    
    texts.forEach(text => {
      text.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed.length > 0) {
          uniqueLines.add(trimmed);
        }
      });
    });
    
    return Array.from(uniqueLines).join('\n');
  }

  // Template-based extraction
  private async extractDataFromText(text: string, userId: string): Promise<ExtractedData> {
    console.log(`📄 Enhanced OCR: Extracting data from text`);
    
    // Try template-based extraction first
    const template = this.identifyTemplate(text);
    if (template) {
      console.log(`📄 Enhanced OCR: Using template ${template.name}`);
      return this.extractUsingTemplate(text, template);
    }
    
    // Fallback to generic extraction
    console.log(`📄 Enhanced OCR: Using generic extraction`);
    return this.genericExtraction(text);
  }

  private identifyTemplate(text: string): ReceiptTemplate | null {
    for (const template of this.receiptTemplates.values()) {
      if (template.merchantPattern.test(text)) {
        return template;
      }
    }
    return null;
  }

  private extractUsingTemplate(text: string, template: ReceiptTemplate): ExtractedData {
    const merchant = this.extractMerchant(text, template);
    const amount = this.extractAmount(text, template);
    const date = this.extractDate(text, template);
    const items = this.extractItems(text, template);
    
    return {
      merchant,
      amount,
      date,
      items,
      tax: 0, // Would be extracted from template
      paymentMethod: 'Unknown',
      receiptNumber: '',
      confidence: template.confidence,
      source: `template:${template.id}`
    };
  }

  private genericExtraction(text: string): ExtractedData {
    const merchant = this.extractMerchantGeneric(text);
    const amount = this.extractAmountGeneric(text);
    const date = this.extractDateGeneric(text);
    const items = this.extractItemsGeneric(text);
    
    return {
      merchant,
      amount,
      date,
      items,
      tax: 0,
      paymentMethod: 'Unknown',
      receiptNumber: '',
      confidence: 0.6,
      source: 'generic'
    };
  }

  private extractMerchant(text: string, template: ReceiptTemplate): string {
    const match = text.match(template.merchantPattern);
    return match ? match[0].trim() : 'Unknown Merchant';
  }

  private extractAmount(text: string, template: ReceiptTemplate): number {
    const match = text.match(template.totalPattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/[$,]/g, ''));
      return isNaN(amount) ? 0 : amount;
    }
    return 0;
  }

  private extractDate(text: string, template: ReceiptTemplate): string {
    const match = text.match(template.datePattern);
    return match ? match[1] : new Date().toISOString().split('T')[0];
  }

  private extractItems(text: string, template: ReceiptTemplate): Array<{name: string; price: number}> {
    const items: Array<{name: string; price: number}> = [];
    
    if (template.itemPattern) {
      const matches = text.matchAll(new RegExp(template.itemPattern, 'g'));
      for (const match of matches) {
        items.push({
          name: match[2] || 'Unknown Item',
          price: parseFloat(match[3] || '0')
        });
      }
    }
    
    return items;
  }

  private extractMerchantGeneric(text: string): string {
    const lines = text.split('\n');
    return lines[0]?.trim() || 'Unknown Merchant';
  }

  private extractAmountGeneric(text: string): number {
    const amountPatterns = [
      /TOTAL\s+\$?([\d.]+)/i,
      /AMOUNT\s+\$?([\d.]+)/i,
      /\$([\d.]+)\s*$/m
    ];
    
    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        const amount = parseFloat(match[1].replace(/[$,]/g, ''));
        if (!isNaN(amount)) return amount;
      }
    }
    
    return 0;
  }

  private extractDateGeneric(text: string): string {
    const datePatterns = [
      /(\d{2}\/\d{2}\/\d{2,4})/,
      /(\d{4}-\d{2}-\d{2})/,
      /(\d{2}-\d{2}-\d{2,4})/
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
    
    return new Date().toISOString().split('T')[0];
  }

  private extractItemsGeneric(text: string): Array<{name: string; price: number}> {
    const items: Array<{name: string; price: number}> = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const priceMatch = line.match(/\$?([\d.]+)/);
      if (priceMatch && line.length > 5) {
        items.push({
          name: line.replace(/\$?[\d.]+/, '').trim(),
          price: parseFloat(priceMatch[1])
        });
      }
    }
    
    return items;
  }

  // Utility methods
  private async generateImageHash(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private calculateCost(results: OCRResult[]): number {
    return results.reduce((total, result) => {
      return total + (result.metadata?.cost || 0);
    }, 0);
  }

  private updateStats(processingTime: number, success: boolean, cost: number): void {
    this.processingStats.totalProcessed++;
    this.processingStats.averageTime = 
      (this.processingStats.averageTime * (this.processingStats.totalProcessed - 1) + processingTime) / 
      this.processingStats.totalProcessed;
    
    if (success) {
      this.processingStats.successRate = 
        (this.processingStats.successRate * (this.processingStats.totalProcessed - 1) + 1) / 
        this.processingStats.totalProcessed;
    } else {
      this.processingStats.successRate = 
        (this.processingStats.successRate * (this.processingStats.totalProcessed - 1)) / 
        this.processingStats.totalProcessed;
    }
    
    this.processingStats.costPerReceipt = 
      (this.processingStats.costPerReceipt * (this.processingStats.totalProcessed - 1) + cost) / 
      this.processingStats.totalProcessed;
  }

  // Public methods
  getProcessingStats() {
    return { ...this.processingStats };
  }

  clearCache(): void {
    this.ocrCache.clear();
  }

  addReceiptTemplate(template: ReceiptTemplate): void {
    this.receiptTemplates.set(template.id, template);
  }
}

// Export singleton instance
export const enhancedOCRSystem = new EnhancedOCRSystem();
