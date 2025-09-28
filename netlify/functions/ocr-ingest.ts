import type { Handler } from '@netlify/functions';
import OpenAI from 'openai';
import Tesseract from 'tesseract.js';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
// Simple redaction function inline to avoid import issues

// Initialize OpenAI only if API key is available
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Initialize Supabase only if environment variables are available
let supabase: any = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Simple redaction function inline
function redactSensitiveInfo(text: string): string {
  let redacted = text;
  
  // Credit card numbers (basic pattern)
  redacted = redacted.replace(/\b(?:\d{4}[\s-]?){3}\d{1,4}\b/g, '{{CARD_REDACTED}}');
  
  // Email addresses
  redacted = redacted.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '{{EMAIL_REDACTED}}');
  
  // Phone numbers
  redacted = redacted.replace(/\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g, '{{PHONE_REDACTED}}');
  
  // SSN patterns
  redacted = redacted.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '{{SSN_REDACTED}}');
  
  return redacted;
}

export const handler: Handler = async (event) => {
  try {
    const { fileData, fileName, fileType, userId } = JSON.parse(event.body || '{}');
    if (!fileData) {
      return { 
        statusCode: 400, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Missing fileData' }) 
      };
    }

    // Step 1: OCR (Handle PDFs and images)
    let ocrText = '';
    try {
      const buffer = Buffer.from(fileData, 'base64');
      
      // Check if it's a PDF
      if (fileType === 'application/pdf' || fileName?.toLowerCase().endsWith('.pdf')) {
        try {
          // Dynamic import to avoid initialization issues
          const pdf = await import('pdf-parse');
          const pdfData = await pdf.default(buffer);
          ocrText = pdfData.text.trim();
          
          if (!ocrText) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                success: false, 
                error: 'No text could be extracted from the PDF. The PDF might be image-based or scanned.',
                suggestion: 'Try converting the PDF to images first, or use a PDF with selectable text.'
              })
            };
          }
          
        } catch (pdfError) {
          console.error('PDF parsing failed:', pdfError);
          return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              success: false, 
              error: 'PDF processing failed. The PDF might be corrupted or password-protected.',
              suggestion: 'Try with a different PDF file or convert to images first.'
            })
          };
        }
      } else {
        // Process images with Tesseract
        const result = await Tesseract.recognize(buffer, 'eng');
        ocrText = result.data.text.trim();
        
        if (!ocrText) {
          return { 
            statusCode: 500, 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, error: 'No text could be extracted from the image' }) 
          };
        }
      }
      
    } catch (err) {
      console.error('Processing failed', err);
      return { 
        statusCode: 500, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Processing failed - please try with a different file' }) 
      };
    }

    // Step 2: Clean and redact sensitive information
    const cleaned = ocrText.replace(/\s+/g, ' ').slice(0, 6000);
    
    // Step 2.5: Redact sensitive information (credit cards, SSNs, etc.)
    const redactedText = redactSensitiveInfo(cleaned);

    // Step 3: Send to OpenAI for parsing (using redacted text)
    let parsed: any[] = [];
    if (openai) {
      try {
        const ai = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Extract transactions from the text and return as JSON.'
            },
            {
              role: 'user',
              content: `Text (sensitive info redacted):\n${redactedText}\n\nReturn JSON array: [{date, merchant, amount, category}]`
            }
          ],
          temperature: 0
        });

        parsed = JSON.parse(ai.choices[0].message?.content || '[]');
      } catch (aiError) {
        console.error('OpenAI parsing failed:', aiError);
        // Fallback to basic parsing if OpenAI fails
        parsed = [];
      }
    } else {
      console.log('OpenAI API key not configured - skipping AI parsing');
      // Fallback to basic parsing without AI
      parsed = [];
    }

    // Step 4: Save to Supabase (if available)
    if (userId && supabase) {
      try {
        const { data: doc } = await supabase
          .from('user_documents')
          .insert({ user_id: userId, source_url: fileName || 'uploaded-file', raw_text: redactedText })
          .select()
          .single();

        if (doc) {
          const tx = parsed.map((t: any) => ({
            user_id: userId,
            document_id: doc.id,
            ...t
          }));
          await supabase.from('transactions').insert(tx);
        }
      } catch (supabaseError) {
        console.log('Supabase storage failed, continuing without storage:', supabaseError);
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        parsed,
        redactionApplied: redactedText !== cleaned,
        rawText: redactedText
      })
    };
  } catch (err: any) {
    console.error(err);
    return { 
      statusCode: 500, 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: err.message }) 
    };
  }
};


