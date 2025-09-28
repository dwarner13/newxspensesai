// netlify/functions/ocr-ingest-simple.ts
// Simpler version without sharp preprocessing
import { Handler } from '@netlify/functions';
import { createWorker } from 'tesseract.js';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { base64 } = JSON.parse(event.body || '{}');
    
    if (!base64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No image data' })
      };
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(base64, 'base64');
    
    // Create Tesseract worker
    const worker = await createWorker('eng');
    
    // Perform OCR directly on buffer
    const { data: { text } } = await worker.recognize(buffer);
    
    // Cleanup
    await worker.terminate();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        text: text.trim()
      })
    };
    
  } catch (error) {
    console.error('OCR error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'OCR processing failed',
        details: error.message
      })
    };
  }
};
