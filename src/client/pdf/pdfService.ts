// src/client/pdf/pdfService.ts
import { extractPdfTextSafe } from './extractText';

export interface PdfProcessResult {
  success: boolean;
  text?: string;
  error?: string;
  method: 'client' | 'server';
}

export class PdfService {
  // Try client-side extraction first, fallback to server
  static async processPdf(file: File): Promise<PdfProcessResult> {
    console.log('Processing PDF:', file.name, 'Size:', file.size);
    
    // Try client-side extraction first
    try {
      const text = await extractPdfTextSafe(file);
      if (text && text.length > 0) {
        return {
          success: true,
          text,
          method: 'client'
        };
      }
    } catch (clientError) {
      console.warn('Client-side extraction failed, trying server:', clientError);
    }

    // Fallback to server-side extraction
    try {
      const base64 = await this.fileToBase64(file);
      const response = await fetch('/.netlify/functions/parse-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ base64 })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.text) {
        return {
          success: true,
          text: result.text,
          method: 'server'
        };
      } else {
        throw new Error(result.error || 'No text extracted');
      }
    } catch (serverError) {
      console.error('Server-side extraction also failed:', serverError);
      return {
        success: false,
        error: `Failed to extract PDF text: ${serverError.message}`,
        method: 'server'
      };
    }
  }

  private static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove data URL prefix
        const base64Content = base64.split(',')[1];
        resolve(base64Content);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
