/**
 * Google Cloud Vision API Integration
 * 
 * Enterprise-grade OCR with superior accuracy for financial documents
 * Handles complex layouts, handwritten text, and poor quality images
 */

export interface GoogleVisionResult {
  text: string;
  confidence: number;
  detectedText: Array<{
    text: string;
    boundingBox: {
      vertices: Array<{ x: number; y: number }>;
    };
    confidence: number;
  }>;
  fullTextAnnotation?: {
    text: string;
    pages: Array<{
      property: {
        detectedLanguages: Array<{
          languageCode: string;
          confidence: number;
        }>;
      };
    }>;
  };
}

export interface ImageAnalysisResult {
  text: string;
  confidence: number;
  language: string;
  textBlocks: Array<{
    text: string;
    confidence: number;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  imageQuality: {
    blur: number;
    brightness: number;
    contrast: number;
    resolution: number;
  };
}

// Google Vision API configuration
const GOOGLE_VISION_API_KEY = process.env.REACT_APP_GOOGLE_VISION_API_KEY || '';
const GOOGLE_VISION_ENDPOINT = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`;

/**
 * Analyze image quality to determine OCR strategy
 */
export const analyzeImageQuality = (imageFile: File): Promise<{
  blur: number;
  brightness: number;
  contrast: number;
  resolution: number;
  complexity: 'simple' | 'moderate' | 'complex';
}> => {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      if (!imageData) {
        resolve({
          blur: 0.5,
          brightness: 0.5,
          contrast: 0.5,
          resolution: 0.5,
          complexity: 'moderate'
        });
        return;
      }
      
      // Calculate image metrics
      const { blur, brightness, contrast } = calculateImageMetrics(imageData);
      const resolution = (canvas.width * canvas.height) / (1920 * 1080); // Normalize to HD
      
      // Determine complexity
      let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
      if (blur > 0.3 || brightness < 0.3 || brightness > 0.8 || contrast < 0.4) {
        complexity = 'complex';
      } else if (blur > 0.2 || brightness < 0.4 || brightness > 0.7 || contrast < 0.5) {
        complexity = 'moderate';
      }
      
      resolve({ blur, brightness, contrast, resolution, complexity});
    };
    
    img.src = URL.createObjectURL(imageFile);
  });
};

/**
 * Calculate image quality metrics
 */
const calculateImageMetrics = (imageData: ImageData) => {
  const data = imageData.data;
  let totalBrightness = 0;
  let totalContrast = 0;
  let edgeCount = 0;
  
  // Sample every 4th pixel for performance
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Calculate brightness (0-1)
    const brightness = (r + g + b) / (3 * 255);
    totalBrightness += brightness;
    
    // Calculate contrast (simplified)
    const contrast = Math.abs(r - g) + Math.abs(g - b) + Math.abs(b - r);
    totalContrast += contrast / (3 * 255);
  }
  
  const sampleCount = data.length / 16;
  const avgBrightness = totalBrightness / sampleCount;
  const avgContrast = totalContrast / sampleCount;
  
  // Estimate blur by edge detection (simplified)
  const blur = Math.max(0, 1 - avgContrast);
  
  return {
    blur,
    brightness: avgBrightness,
    contrast: avgContrast
  };
};

/**
 * Convert image file to base64 for Google Vision API
 */
const convertImageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:image/...;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Extract text using Google Vision API
 */
export const extractTextWithGoogleVision = async (imageFile: File): Promise<GoogleVisionResult> => {
  try {
    if (!GOOGLE_VISION_API_KEY) {
      throw new Error('Google Vision API key not configured');
    }
    
    const base64Image = await convertImageToBase64(imageFile);
    
    const requestBody = {
      requests: [
        {
          image: {
            content: base64Image
          },
          features: [
            {
              type: 'TEXT_DETECTION',
              maxResults: 1
            },
            {
              type: 'DOCUMENT_TEXT_DETECTION',
              maxResults: 1
            }
          ],
          imageContext: {
            languageHints: ['en', 'es'], // English and Spanish
            textDetectionParams: {
              enableTextDetectionConfidenceScore: true
            }
          }
        }
      ]
    };
    
    console.log('Sending request to Google Vision API...');
    
    const response = await fetch(GOOGLE_VISION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Vision API error:', errorText);
      throw new Error(`Google Vision API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Google Vision API response:', result);
    
    if (result.responses?.[0]?.error) {
      throw new Error(`Google Vision API error: ${result.responses[0].error.message}`);
    }
    
    const responseData = result.responses[0];
    
    // Extract text from document text detection (more accurate for receipts)
    const documentText = responseData.fullTextAnnotation?.text || '';
    const textAnnotations = responseData.textAnnotations || [];
    
    // Calculate overall confidence
    const confidences = textAnnotations
      .map(annotation => annotation.confidence || 0)
      .filter(conf => conf > 0);
    
    const avgConfidence = confidences.length > 0 
      ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
      : 0.8; // Default confidence for Google Vision
    
    return {
      text: documentText || textAnnotations[0]?.description || '',
      confidence: avgConfidence,
      detectedText: textAnnotations,
      fullTextAnnotation: responseData.fullTextAnnotation
    };
    
  } catch (error) {
    console.error('Google Vision extraction error:', error);
    throw error;
  }
};

/**
 * Smart OCR engine selection based on image analysis
 */
export const selectOCREngine = async (imageFile: File): Promise<{
  engine: 'google-vision' | 'ocr-space';
  reason: string;
  confidence: number;
}> => {
  try {
    const quality = await analyzeImageQuality(imageFile);
    
    // Decision logic for OCR engine selection
    if (quality.complexity === 'complex') {
      return {
        engine: 'google-vision',
        reason: 'Complex image detected - using Google Vision for better accuracy',
        confidence: 0.9
      };
    }
    
    if (imageFile.size > 2 * 1024 * 1024) { // > 2MB
      return {
        engine: 'google-vision',
        reason: 'Large file detected - using Google Vision for better processing',
        confidence: 0.8
      };
    }
    
    if (quality.blur > 0.3 || quality.brightness < 0.3 || quality.brightness > 0.8) {
      return {
        engine: 'google-vision',
        reason: 'Poor image quality detected - using Google Vision for better accuracy',
        confidence: 0.85
      };
    }
    
    // Default to OCR.space for simple, clear images
    return {
      engine: 'ocr-space',
      reason: 'Simple image detected - using OCR.space for cost efficiency',
      confidence: 0.7
    };
    
  } catch (error) {
    console.error('Error analyzing image quality:', error);
    // Default to Google Vision on error for better reliability
    return {
      engine: 'google-vision',
      reason: 'Error analyzing image - using Google Vision for reliability',
      confidence: 0.6
    };
  }
};

/**
 * Enhanced receipt parsing with Google Vision results
 */
export const parseReceiptWithGoogleVision = (visionResult: GoogleVisionResult): {
  vendor: string;
  date: string;
  total: number;
  items: Array<{ description: string; amount: number; confidence: number }>;
  category: string;
  confidence: number;
  rawText: string;
} => {
  const text = visionResult.text;
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  
  let vendor = '';
  let date = '';
  let total = 0;
  let category = 'Uncategorized';
  const items: Array<{ description: string; amount: number; confidence: number }> = [];
  
  // Enhanced vendor detection using text blocks
  if (visionResult.detectedText.length > 0) {
    // Get the top-most text block as vendor (usually store name)
    const topTextBlock = visionResult.detectedText
      .filter(block => block.text.length > 3 && block.text.length < 50)
      .sort((a, b) => {
        const aY = a.boundingBox.vertices[0]?.y || 0;
        const bY = b.boundingBox.vertices[0]?.y || 0;
        return aY - bY;
      })[0];
    
    if (topTextBlock) {
      vendor = topTextBlock.text.replace(/[^a-zA-Z0-9\s&'-]/g, '').trim();
    }
  }
  
  // Fallback to first line if no vendor detected
  if (!vendor && lines.length > 0) {
    vendor = lines[0].replace(/[^a-zA-Z0-9\s&'-]/g, '').trim();
  }
  
  // Enhanced date detection
  const datePatterns = [
    /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/,
    /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/,
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}/i,
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i
  ];
  
  for (const line of lines) {
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match && !date) {
        date = match[1];
        break;
      }
    }
    if (date) break;
  }
  
  // Enhanced total detection
  const totalPatterns = [
    /total[:\s]*\$?(\d+\.?\d*)/i,
    /amount[:\s]*\$?(\d+\.?\d*)/i,
    /balance[:\s]*\$?(\d+\.?\d*)/i,
    /subtotal[:\s]*\$?(\d+\.?\d*)/i,
    /\$(\d+\.\d{2})\s*$/,
    /(\d+\.\d{2})\s*$/
  ];
  
  // Look for total in bottom portion of receipt
  const bottomLines = lines.slice(-5);
  for (const line of bottomLines.reverse()) {
    for (const pattern of totalPatterns) {
      const match = line.match(pattern);
      if (match) {
        const amount = parseFloat(match[1]);
        if (amount > 0 && amount < 10000) {
          total = amount;
          break;
        }
      }
    }
    if (total > 0) break;
  }
  
  // Enhanced item extraction using text blocks
  const itemTextBlocks = visionResult.detectedText
    .filter(block => {
      const text = block.text.trim();
      return text.length > 3 && 
             text.length < 50 && 
             !text.match(/^(total|subtotal|tax|change|balance|amount|due|paid)/i) &&
             !text.match(/^[0-9\s\-\(\)]+$/) &&
             !text.match(/^[A-Z\s\-\(\)]+$/);
    })
    .sort((a, b) => {
      const aY = a.boundingBox.vertices[0]?.y || 0;
      const bY = b.boundingBox.vertices[0]?.y || 0;
      return aY - bY;
    });
  
  for (const block of itemTextBlocks) {
    const text = block.text.trim();
    const itemMatch = text.match(/^(.+?)\s+\$?(\d+\.?\d*)\s*$/);
    
    if (itemMatch) {
      const description = itemMatch[1].trim();
      const amount = parseFloat(itemMatch[2]);
      
      if (amount > 0 && amount < total && description.length > 3) {
        items.push({
          description: description.replace(/[^a-zA-Z0-9\s&'-]/g, '').trim(),
          amount,
          confidence: block.confidence || 0.8});
      }
    }
  }
  
  // Enhanced category detection
  const vendorLower = vendor.toLowerCase();
  if (vendorLower.includes('grocery') || vendorLower.includes('market') || vendorLower.includes('food') || vendorLower.includes('supermarket')) {
    category = 'Groceries';
  } else if (vendorLower.includes('gas') || vendorLower.includes('fuel') || vendorLower.includes('shell') || vendorLower.includes('exxon') || vendorLower.includes('chevron')) {
    category = 'Transportation';
  } else if (vendorLower.includes('restaurant') || vendorLower.includes('cafe') || vendorLower.includes('pizza') || vendorLower.includes('burger') || vendorLower.includes('deli')) {
    category = 'Dining';
  } else if (vendorLower.includes('target') || vendorLower.includes('walmart') || vendorLower.includes('store') || vendorLower.includes('shop')) {
    category = 'Shopping';
  } else if (vendorLower.includes('pharmacy') || vendorLower.includes('cvs') || vendorLower.includes('walgreens') || vendorLower.includes('rite aid')) {
    category = 'Healthcare';
  } else if (vendorLower.includes('hotel') || vendorLower.includes('inn') || vendorLower.includes('resort')) {
    category = 'Travel';
  } else if (vendorLower.includes('amazon') || vendorLower.includes('ebay') || vendorLower.includes('online')) {
    category = 'Online Shopping';
  }
  
  return {
    vendor: vendor || 'Unknown Vendor',
    date: date || new Date().toISOString().split('T')[0],
    total: total || 0,
    items: items.slice(0, 15), // Limit to 15 items
    category,
    confidence: visionResult.confidence,
    rawText: text
  };
};

/**
 * Main function for large file processor integration
 */
export const detectTextFromImage = async (imageFile: File): Promise<{
  text: string;
  parsedData: any;
  confidence: number;
  processingTime: number;
}> => {
  const startTime = Date.now();
  
  try {
    // Use Google Vision for text detection
    const visionResult = await extractTextWithGoogleVision(imageFile);
    
    // Parse the receipt data
    const parsedData = parseReceiptWithGoogleVision(visionResult);
    
    const processingTime = Date.now() - startTime;
    
    return {
      text: visionResult.text,
      parsedData,
      confidence: visionResult.confidence,
      processingTime
    };
    
  } catch (error) {
    console.error('Google Vision detection failed:', error);
    
    // Fallback to OCR.space
    console.log('Falling back to OCR.space...');
    const { processImageWithOCR } = await import('./ocrService');
    const ocrResult = await processImageWithOCR(imageFile);
    
    const processingTime = Date.now() - startTime;
    
    return {
      text: ocrResult.text,
      parsedData: {
        vendor: 'Unknown Vendor',
        date: new Date().toISOString().split('T')[0],
        total: 0,
        items: [],
        category: 'Uncategorized',
        confidence: ocrResult.confidence,
        rawText: ocrResult.text
      },
      confidence: ocrResult.confidence,
      processingTime
    };
  }
};

/**
 * Fallback OCR service when Google Vision fails
 */
export const fallbackToOCRSpace = async (imageFile: File): Promise<{
  text: string;
  confidence: number;
}> => {
  // Import OCR.space service
  const { processImageWithOCR } = await import('./ocrService');
  return processImageWithOCR(imageFile);
};
