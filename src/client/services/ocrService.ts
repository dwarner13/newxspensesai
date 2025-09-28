// src/client/services/ocrService.ts

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
      
      // Convert to base64
      const base64 = await this.fileToBase64(file);
      
      // Call OCR function
      const response = await fetch('/.netlify/functions/ocr-ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ base64 })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || `Server returned ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          text: result.text,
          confidence: result.confidence,
          parsed: result.parsed
        };
      } else {
        throw new Error(result.error || 'OCR processing failed');
      }
      
    } catch (error) {
      console.error('OCR service error:', error);
      return {
        success: false,
        error: error.message || 'Failed to process image'
      };
    }
  }
  
  private static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get pure base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => {
        reject(new Error('Failed to read file: ' + error));
      };
      reader.readAsDataURL(file);
    });
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
