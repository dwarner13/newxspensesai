import { Result, Ok, Err } from '../../types/result';
import { getSupabaseServerClient } from '../db';

export interface OCRResult {
  text: string;
  confidence: number;
  provider: string;
  fields?: {
    vendor?: string;
    date?: string;
    total?: number;
    items?: Array<{ description: string; amount: number }>;
    tax?: number;
    paymentMethod?: string;
  };
  boundingBoxes?: any[];
}

export class OCRService {
  private providers: Map<string, any>;
  
  constructor() {
    this.providers = new Map([
      ['google', new GoogleVisionProvider()],
      ['ocrspace', new OCRSpaceProvider()],
      ['textract', new TextractProvider()],
    ]);
  }
  
  async processReceipt(
    buffer: Buffer,
    preferredProvider?: string
  ): Promise<Result<OCRResult>> {
    // Preprocess image
    const preprocessed = await this.preprocessImage(buffer);
    
    // Try preferred provider first
    const providerOrder = preferredProvider
      ? [preferredProvider, ...Array.from(this.providers.keys()).filter(p => p !== preferredProvider)]
      : ['google', 'ocrspace', 'textract'];
    
    let lastError: Error | null = null;
    
    for (const providerName of providerOrder) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;
      
      try {
        const result = await provider.process(preprocessed);
        
        if (result.confidence < 0.5 && providerName !== providerOrder[providerOrder.length - 1]) {
          // Try next provider if confidence too low
          continue;
        }
        
        // Extract structured fields
        const fields = await this.extractReceiptFields(result.text);
        
        // Validate and enrich
        const enriched = await this.enrichReceiptData({
          ...result,
          fields,
          provider: providerName,
        });
        
        return Ok(enriched);
        
      } catch (error) {
        console.error(`OCR provider ${providerName} failed:`, error);
        lastError = error as Error;
        // Continue to next provider
      }
    }
    
    return Err(lastError || new Error('All OCR providers failed'));
  }
  
  private async preprocessImage(buffer: Buffer): Promise<Buffer> {
    try {
      // Dynamic import to avoid bundling Sharp in client
      const sharp = await import('sharp');
      
      // Auto-rotate, enhance contrast, convert to grayscale
      const processed = await sharp.default(buffer)
        .rotate() // Auto-rotate based on EXIF
        .normalize() // Enhance contrast
        .grayscale() // Better OCR accuracy
        .resize(2000, 2000, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toBuffer();
      
      return processed;
    } catch {
      return buffer; // Return original if preprocessing fails
    }
  }
  
  private async extractReceiptFields(text: string): Promise<any> {
    const fields: any = {};
    
    // Vendor extraction with confidence
    const vendorPatterns = [
      /^([A-Z][A-Za-z\s&']+)$/m,
      /MERCHANT:\s*(.+)/i,
      /STORE:\s*(.+)/i,
      /^([A-Z][A-Za-z\s&']+)\s*$/m,
    ];
    
    for (const pattern of vendorPatterns) {
      const match = text.match(pattern);
      if (match) {
        fields.vendor = match[1].trim();
        break;
      }
    }
    
    // Date extraction with multiple formats
    const datePatterns = [
      /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
      /(\d{4}-\d{2}-\d{2})/,
      /([A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4})/,
      /(\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4})/,
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        fields.date = this.parseDate(match[1]);
        break;
      }
    }
    
    // Total extraction with currency handling
    const totalPatterns = [
      /TOTAL:?\s*\$?([0-9,]+\.?\d{0,2})/i,
      /AMOUNT DUE:?\s*\$?([0-9,]+\.?\d{0,2})/i,
      /BALANCE:?\s*\$?([0-9,]+\.?\d{0,2})/i,
      /GRAND TOTAL:?\s*\$?([0-9,]+\.?\d{0,2})/i,
    ];
    
    for (const pattern of totalPatterns) {
      const match = text.match(pattern);
      if (match) {
        fields.total = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }
    
    // Line items extraction
    const itemPattern = /(.+?)\s+\$?([0-9,]+\.?\d{0,2})$/gm;
    const items: any[] = [];
    let match;
    
    while ((match = itemPattern.exec(text)) !== null) {
      const desc = match[1].trim();
      const amount = parseFloat(match[2].replace(/,/g, ''));
      
      // Filter out totals and tax
      if (!desc.match(/total|tax|subtotal|tip/i) && amount > 0 && amount < (fields.total || Infinity)) {
        items.push({ description: desc, amount });
      }
    }
    
    if (items.length > 0) {
      fields.items = items;
    }
    
    // Tax extraction
    const taxPatterns = [
      /TAX:?\s*\$?([0-9,]+\.?\d{0,2})/i,
      /HST:?\s*\$?([0-9,]+\.?\d{0,2})/i,
      /GST:?\s*\$?([0-9,]+\.?\d{0,2})/i,
    ];
    
    for (const pattern of taxPatterns) {
      const match = text.match(pattern);
      if (match) {
        fields.tax = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }
    
    return fields;
  }
  
  private parseDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch {}
    
    return new Date().toISOString().split('T')[0];
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
    
    // Validate totals
    if (data.fields?.items && data.fields?.total) {
      const itemSum = data.fields.items.reduce((sum, item) => sum + item.amount, 0);
      if (Math.abs(itemSum - data.fields.total) > 0.1) {
        data.confidence *= 0.8; // Reduce confidence if totals don't match
      }
    }
    
    return data;
  }
  
  private async lookupMerchant(vendor: string): Promise<any> {
    // Query merchant database
    const { data } = await getSupabaseServerClient()
      .from('merchant_data')
      .select('*')
      .ilike('normalized_name', `%${this.normalizeVendor(vendor)}%`)
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

// Mock OCR providers (in production, implement real API calls)
class GoogleVisionProvider {
  async process(buffer: Buffer): Promise<OCRResult> {
    // Mock implementation - replace with actual Google Vision API
    return {
      text: 'Mock OCR text from Google Vision',
      confidence: 0.85,
      provider: 'google',
    };
  }
}

class OCRSpaceProvider {
  async process(buffer: Buffer): Promise<OCRResult> {
    // Mock implementation - replace with actual OCR.space API
    return {
      text: 'Mock OCR text from OCR.space',
      confidence: 0.75,
      provider: 'ocrspace',
    };
  }
}

class TextractProvider {
  async process(buffer: Buffer): Promise<OCRResult> {
    // Mock implementation - replace with actual AWS Textract API
    return {
      text: 'Mock OCR text from Textract',
      confidence: 0.80,
      provider: 'textract',
    };
  }
}
