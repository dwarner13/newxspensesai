/**
 * OCR Providers Module
 * 
 * Day 8: OCR provider wrappers
 * 
 * Functions:
 * - ocrLocal: Local OCR (pdf.js / tesseract stubs)
 * - ocrOCRSpace: OCR.Space API
 * - ocrVision: Google Cloud Vision API
 * - bestEffortOCR: Try all providers, return first good result
 */

export interface OCRProviderResult {
  text: string;
  pages?: Array<{ index: number; text: string }>;
  meta: {
    width?: number;
    height?: number;
    ocr: 'local' | 'ocrspace' | 'vision';
    duration_ms: number;
  };
}

/**
 * Local OCR (stub for pdf.js / tesseract hooks)
 * 
 * Phase 1: Returns stub response
 * Future: Integrate pdf.js for PDFs, tesseract for images
 */
export async function ocrLocal(imageOrPdfBytes: Buffer): Promise<OCRProviderResult> {
  const startTime = Date.now();
  
  // Stub implementation - will be enhanced in future phases
  // TODO: Integrate pdf.js for PDFs
  // TODO: Integrate tesseract for images
  
  return {
    text: '', // Empty for stub
    pages: [],
    meta: {
      ocr: 'local',
      duration_ms: Date.now() - startTime
    }
  };
}

/**
 * OCR.Space API provider
 * 
 * Requires: OCRSPACE_API_KEY environment variable
 */
export async function ocrOCRSpace(params: { bytes?: Buffer; url?: string }): Promise<OCRProviderResult | null> {
  const apiKey = process.env.OCRSPACE_API_KEY;
  if (!apiKey) {
    return null; // Not configured
  }
  
  const startTime = Date.now();
  
  try {
    const formData = new FormData();
    
    if (params.bytes) {
      // Upload file
      const blob = new Blob([params.bytes], { type: 'application/octet-stream' });
      formData.append('file', blob);
    } else if (params.url) {
      formData.append('url', params.url);
    } else {
      return null;
    }
    
    formData.append('apikey', apiKey);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    // Extract text from OCR.Space response
    let text = '';
    const pages: Array<{ index: number; text: string }> = [];
    
    if (data.ParsedResults && data.ParsedResults.length > 0) {
      for (let i = 0; i < data.ParsedResults.length; i++) {
        const pageText = data.ParsedResults[i].ParsedText || '';
        text += pageText + '\n';
        pages.push({ index: i, text: pageText });
      }
    }
    
    return {
      text: text.trim(),
      pages,
      meta: {
        ocr: 'ocrspace',
        duration_ms: Date.now() - startTime
      }
    };
  } catch (error) {
    console.warn('[OCR] OCR.Space API error:', error);
    return null;
  }
}

/**
 * Google Cloud Vision API provider
 * 
 * Requires: GOOGLE_APPLICATION_CREDENTIALS environment variable
 */
export async function ocrVision(params: { bytes?: Buffer; gcsUri?: string }): Promise<OCRProviderResult | null> {
  // Check if credentials are configured
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_PROJECT) {
    return null; // Not configured
  }
  
  const startTime = Date.now();
  
  try {
    // Stub implementation - will be enhanced in future phases
    // TODO: Integrate Google Cloud Vision API
    
    return {
      text: '', // Empty for stub
      pages: [],
      meta: {
        ocr: 'vision',
        duration_ms: Date.now() - startTime
      }
    };
  } catch (error) {
    console.warn('[OCR] Google Vision API error:', error);
    return null;
  }
}

/**
 * Best-effort OCR: Try all providers, return first good result
 * 
 * Order: local → OCR.Space → Vision
 */
export async function bestEffortOCR(input: { bytes?: Buffer; url?: string; gcsUri?: string }): Promise<{
  result: OCRProviderResult | null;
  provider: 'local' | 'ocrspace' | 'vision' | 'none';
  warnings: string[];
}> {
  const warnings: string[] = [];
  
  // Try local first (stub for now)
  try {
    if (input.bytes) {
      const localResult = await ocrLocal(input.bytes);
      if (localResult.text.trim().length > 0) {
        return { result: localResult, provider: 'local', warnings };
      }
    }
  } catch (e) {
    warnings.push('Local OCR failed: ' + String(e));
  }
  
  // Try OCR.Space
  try {
    const ocrSpaceResult = await ocrOCRSpace({ bytes: input.bytes, url: input.url });
    if (ocrSpaceResult && ocrSpaceResult.text.trim().length > 0) {
      return { result: ocrSpaceResult, provider: 'ocrspace', warnings };
    }
    if (!process.env.OCRSPACE_API_KEY) {
      warnings.push('OCR.Space API key not configured');
    }
  } catch (e) {
    warnings.push('OCR.Space failed: ' + String(e));
  }
  
  // Try Google Vision
  try {
    const visionResult = await ocrVision({ bytes: input.bytes, gcsUri: input.gcsUri });
    if (visionResult && visionResult.text.trim().length > 0) {
      return { result: visionResult, provider: 'vision', warnings };
    }
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_PROJECT) {
      warnings.push('Google Vision credentials not configured');
    }
  } catch (e) {
    warnings.push('Google Vision failed: ' + String(e));
  }
  
  // No providers succeeded
  warnings.push('No OCR providers available or all failed');
  return { result: null, provider: 'none', warnings };
}

