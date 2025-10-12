// netlify/functions/parse-pdf.ts
import type { Handler } from '@netlify/functions';

// Simple text extraction for PDFs with text layer
const extractTextFromPdfBuffer = (buffer: Buffer): string => {
  const text = buffer.toString('latin1');
  
  // Look for text content in PDF streams
  const textMatches = text.match(/\(([^)]+)\)/g);
  if (!textMatches) {
    return '';
  }
  
  // Extract text from matches and clean up
  const extractedText = textMatches
    .map(match => match.slice(1, -1)) // Remove parentheses
    .filter(str => str.length > 0 && !/^[\s\d\-\.]+$/.test(str)) // Filter out numbers and whitespace
    .join(' ')
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
    
  return extractedText;
};

export const handler: Handler = async (event) => {
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
    
    if (!body.file && !body.base64) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No file data provided' })
      };
    }

    // Handle base64 encoded file
    const base64Data = body.file || body.base64;
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Validate PDF header
    const pdfHeader = buffer.slice(0, 5).toString();
    if (!pdfHeader.includes('%PDF')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid PDF file' })
      };
    }

           const extractedText = extractTextFromPdfBuffer(buffer);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        text: extractedText,
        length: extractedText.length
      })
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to process PDF',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};