// netlify/functions/parse-pdf.ts
import type { Handler } from '@netlify/functions';

// Use dynamic import to handle ESM/CJS issues
const parsePdf = async (buffer: Buffer): Promise<string> => {
  // Dynamic import to avoid build issues
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js');
  const pdfjs = pdfjsLib.default || pdfjsLib;
  
  try {
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str || '')
        .filter(Boolean)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
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

    const extractedText = await parsePdf(buffer);

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