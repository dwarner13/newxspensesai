// netlify/functions/ocr-ingest.ts
import { Handler } from '@netlify/functions';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';

// Helper to convert base64 to buffer
const base64ToBuffer = (base64: string): Buffer => {
  // Remove data URL prefix if present
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
};

// Preprocess image for better OCR results
const preprocessImage = async (buffer: Buffer): Promise<Buffer> => {
  try {
    // Use sharp to preprocess the image
    const processedImage = await sharp(buffer)
      .grayscale() // Convert to grayscale
      .normalize() // Normalize contrast
      .sharpen() // Sharpen text
      .resize(2000, null, { // Resize if too large
        withoutEnlargement: true,
        fit: 'inside'
      })
      .png() // Convert to PNG for consistency
      .toBuffer();
    
    console.log('Image preprocessed successfully');
    return processedImage;
  } catch (error) {
    console.error('Image preprocessing failed:', error);
    // Return original buffer if preprocessing fails
    return buffer;
  }
};

export const handler: Handler = async (event) => {
  console.log('OCR function called');
  
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    
    if (!body.image && !body.base64) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No image data provided' })
      };
    }

    // Get image data
    const imageData = body.image || body.base64;
    
    // Convert to buffer
    let imageBuffer: Buffer;
    try {
      imageBuffer = base64ToBuffer(imageData);
      console.log('Image buffer created, size:', imageBuffer.length);
    } catch (error) {
      console.error('Failed to create buffer:', error);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid image data format',
          details: error.message 
        })
      };
    }

    // Validate image buffer
    if (!imageBuffer || imageBuffer.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Empty image buffer' })
      };
    }

    // Preprocess image for better OCR
    let processedBuffer: Buffer;
    try {
      processedBuffer = await preprocessImage(imageBuffer);
    } catch (error) {
      console.warn('Preprocessing failed, using original:', error);
      processedBuffer = imageBuffer;
    }

    // Perform OCR with error handling
    console.log('Starting OCR processing...');
    
    try {
      // Create worker with explicit configuration
      const worker = await Tesseract.createWorker({
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round((m.progress || 0) * 100)}%`);
          }
        },
        errorHandler: (err) => {
          console.error('Tesseract error:', err);
        }
      });

      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      
      // Set OCR parameters for better accuracy
      await worker.setParameters({
        tessedit_ocr_engine_mode: '1', // Use LSTM engine
        tessedit_pageseg_mode: '3', // Fully automatic page segmentation
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,$/- '
      });

      // Perform OCR
      const result = await worker.recognize(processedBuffer);
      
      // Terminate worker
      await worker.terminate();

      if (!result || !result.data || !result.data.text) {
        throw new Error('No text extracted from image');
      }

      const extractedText = result.data.text.trim();
      console.log('OCR completed, text length:', extractedText.length);

      // Parse the extracted text for expense data
      const parsedData = parseExpenseData(extractedText);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          text: extractedText,
          confidence: result.data.confidence,
          parsed: parsedData
        })
      };

    } catch (ocrError) {
      console.error('OCR processing error:', ocrError);
      throw new Error(`OCR failed: ${ocrError.message}`);
    }

  } catch (error) {
    console.error('Function error:', error);
    
    // Detailed error response
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to process image',
        details: error.message,
        type: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};

// Parse expense data from OCR text
function parseExpenseData(text: string): any {
  const lines = text.split('\n').filter(line => line.trim());
  
  const parsed = {
    merchantName: '',
    totalAmount: null,
    date: '',
    items: [],
    confidence: 'low'
  };

  // Extract merchant name (usually at the top)
  if (lines.length > 0) {
    parsed.merchantName = lines[0].trim();
  }

  // Look for total amount (various patterns)
  const totalPatterns = [
    /TOTAL[\s:]*\$?([\d,]+\.?\d*)/i,
    /AMOUNT[\s:]*\$?([\d,]+\.?\d*)/i,
    /BALANCE[\s:]*\$?([\d,]+\.?\d*)/i,
    /\$?([\d,]+\.\d{2})$/
  ];

  for (const line of lines) {
    for (const pattern of totalPatterns) {
      const match = line.match(pattern);
      if (match) {
        parsed.totalAmount = parseFloat(match[1].replace(',', ''));
        break;
      }
    }
    if (parsed.totalAmount) break;
  }

  // Look for date patterns
  const datePatterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
    /(\w{3,9}\s+\d{1,2},?\s+\d{4})/,
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/
  ];

  for (const line of lines) {
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        parsed.date = match[1];
        break;
      }
    }
    if (parsed.date) break;
  }

  // Set confidence based on what was found
  if (parsed.merchantName && parsed.totalAmount && parsed.date) {
    parsed.confidence = 'high';
  } else if (parsed.totalAmount || parsed.date) {
    parsed.confidence = 'medium';
  }

  return parsed;
}