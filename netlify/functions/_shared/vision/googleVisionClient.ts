/**
 * Google Cloud Vision OCR Client
 *
 * Simple wrapper for Google Vision API's text detection endpoints.
 * Used for extracting text from images in the Smart Import pipeline.
 */
import fs from 'node:fs';
import path from 'node:path';
import vision from '@google-cloud/vision';

export type VisionTextResult = {
  fullText: string;
  pages?: Array<{
    pageNumber: number;
    text: string;
  }>;
};

export interface GoogleVisionParams {
  imageUrl: string; // signed/public URL to the image
  apiKey: string;
  feature?: 'TEXT_DETECTION' | 'DOCUMENT_TEXT_DETECTION';
  timeoutMs?: number;
}

export interface GoogleVisionPdfParams {
  pdfBuffer: Buffer;
  apiKey?: string;
  timeoutMs?: number;
}

let visionClient: vision.ImageAnnotatorClient | null = null;

function getDefaultServiceKeyPath(): string | null {
  const fromEnv = String(process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  const localSecretsPath = path.resolve(process.cwd(), 'secrets', 'google-vision-key.json');
  if (fs.existsSync(localSecretsPath)) return localSecretsPath;
  return null;
}

function getVisionClient(): vision.ImageAnnotatorClient {
  if (visionClient) return visionClient;
  const keyFilename = getDefaultServiceKeyPath();
  visionClient = keyFilename
    ? new vision.ImageAnnotatorClient({ keyFilename })
    : new vision.ImageAnnotatorClient();
  return visionClient;
}

/**
 * Call Google Vision API to extract text from an image
 * 
 * @param params Configuration for Vision API call
 * @returns Extracted text result
 */
export async function callGoogleVisionOnImage(
  params: GoogleVisionParams
): Promise<VisionTextResult> {
  const { imageUrl, apiKey, feature = 'DOCUMENT_TEXT_DETECTION', timeoutMs = 30000 } = params;

  try {
    const apiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`;

    const requestBody = {
      requests: [
        {
          image: {
            source: {
              imageUri: imageUrl,
            },
          },
          features: [
            {
              type: feature,
            },
          ],
        },
      ],
    };

    console.log(`[Vision] Calling Google Vision API for image (feature: ${feature})`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Vision] Google Vision API error (${response.status}):`, errorText.substring(0, 500));
      const err: Error & { status?: number } = new Error(`Google Vision API error: ${response.status} - ${errorText.substring(0, 200)}`);
      err.status = response.status;
      throw err;
    }

    const result = await response.json();

    // Check for API-level errors
    if (result.error) {
      console.error('[Vision] Google Vision API returned error:', result.error);
      throw new Error(`Google Vision API error: ${result.error.message || JSON.stringify(result.error)}`);
    }

    // Extract text from response
    const responses = result.responses || [];
    if (responses.length === 0) {
      console.warn('[Vision] Google Vision returned empty responses array');
      return { fullText: '' };
    }

    const firstResponse = responses[0];

    // Check for errors in the response
    if (firstResponse.error) {
      console.error('[Vision] Google Vision response error:', firstResponse.error);
      throw new Error(`Google Vision response error: ${firstResponse.error.message || JSON.stringify(firstResponse.error)}`);
    }

    // Extract full text annotation (preferred for DOCUMENT_TEXT_DETECTION)
    const fullTextAnnotation = firstResponse.fullTextAnnotation;
    if (fullTextAnnotation?.text) {
      const fullText = fullTextAnnotation.text;
      console.log(`[Vision] Extracted ${fullText.length} characters from image`);

      // Optionally extract page-level text
      const pages: Array<{ pageNumber: number; text: string }> = [];
      if (fullTextAnnotation.pages && Array.isArray(fullTextAnnotation.pages)) {
        fullTextAnnotation.pages.forEach((page: any, index: number) => {
          // Try to extract text from page blocks
          let pageText = '';
          if (page.blocks && Array.isArray(page.blocks)) {
            page.blocks.forEach((block: any) => {
              if (block.paragraphs && Array.isArray(block.paragraphs)) {
                block.paragraphs.forEach((paragraph: any) => {
                  if (paragraph.words && Array.isArray(paragraph.words)) {
                    paragraph.words.forEach((word: any) => {
                      if (word.symbols && Array.isArray(word.symbols)) {
                        word.symbols.forEach((symbol: any) => {
                          if (symbol.text) {
                            pageText += symbol.text;
                          }
                        });
                        pageText += ' '; // Add space between words
                      }
                    });
                    pageText += '\n'; // Add newline between paragraphs
                  }
                });
              }
            });
          }

          if (pageText.trim()) {
            pages.push({
              pageNumber: index + 1,
              text: pageText.trim(),
            });
          }
        });
      }

      return {
        fullText,
        pages: pages.length > 0 ? pages : undefined,
      };
    }

    // Fallback: Try textAnnotations (for TEXT_DETECTION)
    const textAnnotations = firstResponse.textAnnotations;
    if (textAnnotations && textAnnotations.length > 0) {
      // First annotation is usually the full text
      const fullText = textAnnotations[0].description || '';
      console.log(`[Vision] Extracted ${fullText.length} characters from image (via textAnnotations)`);
      return { fullText };
    }

    // No text found
    console.warn('[Vision] Google Vision returned no text annotations');
    return { fullText: '' };
  } catch (error: any) {
    console.error('[Vision] Error calling Google Vision:', error.message || error);
    throw error;
  }
}

/**
 * Call Google Vision API to extract text directly from raw PDF bytes.
 *
 * Uses the same images:annotate endpoint but sends inline base64 content
 * instead of a URL.  Google's server-side PDF renderer is far more tolerant
 * of non-standard flate streams / encoding quirks than pdfjs-legacy or
 * OCR.space, so this serves as the last-resort fallback for
 * parser-incompatible PDFs (e.g. RBC, certain Capital One statements).
 *
 * Note: the images:annotate endpoint only processes page 1 of a multi-page
 * PDF.  For full multi-page extraction the files:asyncBatchAnnotate endpoint
 * would be needed, but single-page extraction is sufficient for the
 * "can we read this at all?" gate that decides whether to reject the PDF.
 */
export async function callGoogleVisionOnPdf(
  params: GoogleVisionPdfParams
): Promise<VisionTextResult> {
  const { pdfBuffer, apiKey, timeoutMs = 45000 } = params;
  const base64Content = pdfBuffer.toString('base64');
  const effectiveApiKey = String(apiKey || process.env.GOOGLE_VISION_API_KEY || '').trim();

  // First try REST + API key when available.
  if (effectiveApiKey) {
    const apiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(effectiveApiKey)}`;
    const requestBody = {
      requests: [
        {
          image: { content: base64Content },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        },
      ],
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      console.log('[Vision] Calling Google Vision API with raw PDF bytes', {
        pdfBytes: pdfBuffer.length,
        base64Len: base64Content.length,
        authMode: 'api_key',
      });
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        const text = String(errorText || '').toLowerCase();
        const canFallbackToClient = response.status === 403 || text.includes('billing') || text.includes('permission');
        if (!canFallbackToClient) {
          throw new Error(`Google Vision PDF error: ${response.status} - ${errorText.substring(0, 200)}`);
        }
        console.warn('[Vision] API-key PDF OCR blocked; trying service-account client fallback');
      } else {
        const result = await response.json();
        if (result?.error) {
          throw new Error(`Google Vision PDF error: ${result.error.message || JSON.stringify(result.error)}`);
        }
        const firstResponse = result?.responses?.[0];
        if (!firstResponse) {
          console.warn('[Vision] Google Vision API returned no response blocks for PDF');
          return { fullText: '' };
        }
        if (firstResponse.error) {
          throw new Error(`Google Vision PDF response error: ${firstResponse.error.message || JSON.stringify(firstResponse.error)}`);
        }
        const fullTextAnnotation = firstResponse.fullTextAnnotation;
        if (fullTextAnnotation?.text) {
          console.log(`[Vision] Extracted ${fullTextAnnotation.text.length} characters from raw PDF`);
          return { fullText: fullTextAnnotation.text };
        }
        const textAnnotations = firstResponse.textAnnotations;
        if (textAnnotations && textAnnotations.length > 0) {
          const fullText = textAnnotations[0].description || '';
          console.log(`[Vision] Extracted ${fullText.length} characters from raw PDF (via textAnnotations)`);
          return { fullText };
        }
        console.warn('[Vision] Google Vision API returned empty text for PDF');
        return { fullText: '' };
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  // Fallback path: official Google client with service-account credentials.
  console.log('[Vision] Calling Google Vision client with service-account credentials', {
    pdfBytes: pdfBuffer.length,
    authMode: 'service_account',
  });
  const client = getVisionClient();
  const result = await Promise.race([
    client.documentTextDetection({ image: { content: base64Content } }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Google Vision client timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
  const first = (result as any)?.[0] || null;
  const fullText = String(first?.fullTextAnnotation?.text || first?.textAnnotations?.[0]?.description || '');
  if (!fullText.trim()) {
    console.warn('[Vision] Google Vision client returned empty text for PDF');
  } else {
    console.log(`[Vision] Extracted ${fullText.length} characters from raw PDF (service-account client)`);
  }
  return { fullText };
}






