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

// FormData is available as a global in Node.js 18+ (Netlify Functions runtime)
// No import needed - using global FormData

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
 * Requires: OCR_SPACE_API_KEY environment variable
 */
export async function ocrOCRSpace(params: { bytes?: Buffer; url?: string }): Promise<OCRProviderResult | null> {
  const apiKey = process.env.OCR_SPACE_API_KEY;
  if (!apiKey) {
    console.warn('[OCR] OCR_SPACE_API_KEY not configured');
    return null; // Not configured
  }
  
  const startTime = Date.now();
  
  try {
    const formData = new FormData();
    
    if (params.bytes) {
      // Create Blob from Buffer - FormData.append requires Blob in Node.js
      const blob = new Blob([params.bytes], { type: 'application/pdf' });
      formData.append('file', blob, 'document.pdf');
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
      const errorText = await response.text();
      console.error('[OCR] OCR.Space API error:', response.status, errorText);
      throw new Error(`OCR.Space API returned ${response.status}: ${errorText.substring(0, 200)}`);
    }
    
    const data = await response.json();
    
    // Log full response for debugging
    console.log('[OCR] OCR.Space response:', JSON.stringify({
      OCRExitCode: data.OCRExitCode,
      IsErroredOnProcessing: data.IsErroredOnProcessing,
      ErrorMessage: data.ErrorMessage,
      ParsedResultsCount: data.ParsedResults?.length || 0,
      HasText: data.ParsedResults?.[0]?.ParsedText ? data.ParsedResults[0].ParsedText.length > 0 : false
    }));
    
    // Check for API errors in response
    if (data.IsErroredOnProcessing) {
      const errorMessage = data.ErrorMessage?.[0] || data.ErrorMessage || `OCR processing error (exit code: ${data.OCRExitCode})`;
      console.error('[OCR] OCR.Space processing error:', errorMessage);
      throw new Error(`OCR.Space processing failed: ${errorMessage}`);
    }
    
    if (data.OCRExitCode && data.OCRExitCode !== 1) {
      const errorMessage = data.ErrorMessage?.[0] || `OCR exit code: ${data.OCRExitCode}`;
      console.error('[OCR] OCR.Space processing error:', errorMessage);
      throw new Error(`OCR.Space processing failed: ${errorMessage}`);
    }
    
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
    
    if (!text || text.trim().length === 0) {
      console.warn('[OCR] OCR.Space returned no text');
      throw new Error('OCR.Space returned empty result - no text extracted from document');
    }
    
    return {
      text: text.trim(),
      pages,
      meta: {
        ocr: 'ocrspace',
        duration_ms: Date.now() - startTime
      }
    };
  } catch (error: any) {
    console.error('[OCR] OCR.Space API error:', error);
    throw error; // Re-throw to get better error messages
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
    if (!process.env.OCR_SPACE_API_KEY) {
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

/**
 * Run OCR with a specific provider
 * 
 * @param provider - Provider name: 'ocr_space', 'ocrspace', 'vision', 'local'
 * @param fileBuffer - File buffer to process
 * @returns OCR result with rawText, pages_total, pages_succeeded, and meta
 */
export async function runOcrWithProvider(
  provider: string,
  fileBuffer: Buffer
): Promise<{
  rawText: string;
  pages_total?: number;
  pages_succeeded?: number;
  meta?: any;
}> {
  // Normalize provider name
  const normalizedProvider = provider.toLowerCase().replace(/[_-]/g, '');
  
  let result: OCRProviderResult | null = null;
  let lastError: Error | null = null;
  
  try {
    if (normalizedProvider === 'ocrspace') {
      result = await ocrOCRSpace({ bytes: fileBuffer });
    } else if (normalizedProvider === 'vision' || normalizedProvider === 'googlevision') {
      result = await ocrVision({ bytes: fileBuffer });
    } else if (normalizedProvider === 'local') {
      result = await ocrLocal(fileBuffer);
    } else {
      // Default: try OCR.Space
      result = await ocrOCRSpace({ bytes: fileBuffer });
    }
  } catch (err: any) {
    lastError = err;
    console.error(`[OCR] Provider ${provider} error:`, err);
  }
  
  if (!result || !result.text || result.text.trim().length === 0) {
    const errorMsg = lastError 
      ? `OCR provider ${provider} failed: ${lastError.message}`
      : `OCR provider ${provider} failed to extract text (returned empty result)`;
    throw new Error(errorMsg);
  }
  
  return {
    rawText: result.text,
    pages_total: result.pages?.length ?? 1,
    pages_succeeded: result.pages?.filter(p => p.text.trim().length > 0).length ?? 1,
    meta: result.meta,
  };
}








