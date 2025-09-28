// src/client/pdf/pdfService.ts
import { configurePdfWorker, pdfjsLib } from './pdfWorkerConfig';
import { extractPdfTextSafe } from './extractText';

// Ensure worker is configured
configurePdfWorker();

export interface PdfProcessResult {
  success: boolean;
  text?: string;
  error?: string;
  method: 'client' | 'server';
}

export class PdfService {
  static async processPdf(file: File): Promise<PdfProcessResult> {
    console.log('Processing PDF:', file.name, 'Size:', file.size);
    
    // Validate file
    if (file.type !== 'application/pdf') {
      return {
        success: false,
        error: 'Invalid file type. Please upload a PDF file.',
        method: 'client'
      };
    }
    
    // Try client-side extraction
    try {
      const text = await extractPdfTextSafe(file);
      
      // Check if text looks garbled (lots of special characters)
      const specialCharRatio = (text.match(/[^\x20-\x7E\n\r\t]/g) || []).length / text.length;
      
      if (specialCharRatio > 0.3) {
        console.warn('Text appears garbled, might be scanned PDF');
        throw new Error('PDF might be scanned or encrypted');
      }
      
      if (text && text.length > 0) {
        return {
          success: true,
          text,
          method: 'client'
        };
      }
    } catch (clientError) {
      console.warn('Client extraction failed:', clientError);
      
      // Try server-side as fallback
      try {
        const result = await this.serverSideExtraction(file);
        return result;
      } catch (serverError) {
        console.error('Server extraction also failed:', serverError);
        
        // If both fail, might be scanned PDF
        return {
          success: false,
          error: 'This appears to be a scanned PDF. Please use the OCR option.',
          method: 'server'
        };
      }
    }
    
    return {
      success: false,
      error: 'Failed to extract text from PDF',
      method: 'client'
    };
  }
  
  private static async serverSideExtraction(file: File): Promise<PdfProcessResult> {
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
    }
    
    throw new Error(result.error || 'No text extracted');
  }
  
  private static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const base64Content = base64.split(',')[1];
        resolve(base64Content);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}