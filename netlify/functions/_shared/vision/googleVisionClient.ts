/**
 * Google Cloud Vision OCR Client
 * 
 * Simple wrapper for Google Vision API's text detection endpoints.
 * Used for extracting text from images in the Smart Import pipeline.
 */

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
  const { imageUrl, apiKey, feature = 'DOCUMENT_TEXT_DETECTION' } = params;

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

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Vision] Google Vision API error (${response.status}):`, errorText.substring(0, 500));
      throw new Error(`Google Vision API error: ${response.status} - ${errorText.substring(0, 200)}`);
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






