// src/client/services/ocrService.ts

import { getSupabase } from '@/lib/supabase';
import { requestOcrProcessing, pollOcrCompletion } from '@/lib/ocr/requestOcrProcessing';
import { parseReceiptText } from '@/utils/ocrService';

export interface OCRResult {
  success: boolean;
  text?: string;
  confidence?: number;
  parsed?: any;
  error?: string;
}

export class OCRService {
  static async processImage(file: File): Promise<OCRResult> {
    try {
      console.log('Processing image for OCR:', file.name, 'Size:', file.size);
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file (JPG, PNG, etc.)');
      }
      
      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('Image file is too large (max 10MB)');
      }
      
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user?.id) {
        throw new Error('User not authenticated');
      }

      const ocrRequest = await requestOcrProcessing({ file, userId: data.user.id });
      if (!ocrRequest.ok || !ocrRequest.documentId) {
        throw new Error(ocrRequest.error || 'OCR request failed');
      }

      const ocrStatus = await pollOcrCompletion(ocrRequest.documentId, data.user.id);
      if (!ocrStatus.ok || !ocrStatus.ocrText) {
        throw new Error(ocrStatus.error || 'OCR processing did not return text');
      }

      const parsed = parseReceiptText(ocrStatus.ocrText);
      return {
        success: true,
        text: ocrStatus.ocrText,
        confidence: parsed.confidence,
        parsed
      };
      
    } catch (error) {
      console.error('OCR service error:', error);
      return {
        success: false,
        error: error.message || 'Failed to process image'
      };
    }
  }
  
  // Helper to validate if image is readable
  static async validateImage(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(true);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(false);
      };
      
      img.src = url;
    });
  }
}
