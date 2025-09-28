import type { Handler } from '@netlify/functions';
import { z } from 'zod';
import { extractPdfTextSafe } from '../../src/client/pdf/extractText';

const inputSchema = z.object({
  base64: z.string().optional(),
  maxPages: z.number().int().min(1).max(20).optional(),
  userId: z.string().optional(),
});

export const handler: Handler = async (event) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' }) 
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { base64, maxPages, userId } = inputSchema.parse(body);

    if (!base64) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'No base64 content provided' 
        })
      };
    }

    const started = Date.now();
    
    // Convert base64 to ArrayBuffer
    const arrayBuffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer;
    
    // Extract text using our pure-JS implementation
    const result = await extractPdfTextSafe(arrayBuffer, { 
      maxPages: maxPages ?? 5,
      includeMetadata: true 
    });

    const duration = Date.now() - started;
    console.log(`PDF parsing completed in ${duration}ms for user ${userId || 'anonymous'}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        pages: result.pages,
        hasTextLayer: result.hasTextLayer,
        textSample: result.textSample,
        metadata: result.metadata,
        duration: duration
      })
    };

  } catch (error) {
    console.error('PDF parsing error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    };
  }
};
