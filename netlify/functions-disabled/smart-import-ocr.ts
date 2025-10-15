/**
 * Smart Import OCR - Extract text from images/PDFs
 * 
 * SECURITY: OCR output runs through STRICT guardrails before storage
 */

import { Handler } from '@netlify/functions';
import { admin, markDocStatus } from './_shared/upload';
import { runGuardrails, getGuardrailConfig } from './_shared/guardrails-production';

const BUCKET = 'docs';

/**
 * Run OCR on image/PDF using OCR.space or Tesseract
 * @param signedUrl Signed URL to file
 * @returns Extracted text
 */
async function runOCR(signedUrl: string): Promise<string> {
  // TODO: Implement your OCR logic here
  // Option 1: OCR.space API
  // Option 2: Tesseract.js
  // Option 3: Google Vision API
  
  // For now, placeholder:
  const OCR_API_KEY = process.env.OCR_SPACE_API_KEY;
  
  if (OCR_API_KEY) {
    // OCR.space implementation
    const formData = new FormData();
    formData.append('url', signedUrl);
    formData.append('apikey', OCR_API_KEY);
    formData.append('language', 'eng');
    
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    if (result.ParsedResults?.[0]?.ParsedText) {
      return result.ParsedResults[0].ParsedText;
    }
  }
  
  // Fallback: Return placeholder
  console.warn('[OCR] No OCR provider configured - using placeholder text');
  return 'OCR output placeholder - configure OCR_SPACE_API_KEY';
}

export const handler: Handler = async (event) => {
  try {
    const { userId, docId } = JSON.parse(event.body || '{}');
    if (!userId || !docId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId/docId' }) };
    }

    const sb = admin();

    // Load document record
    const { data: doc, error } = await sb
      .from('user_documents')
      .select('*')
      .eq('id', docId)
      .single();
    
    if (error || !doc) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Document not found' }) };
    }

    // Create signed URL for OCR service
    const { data: signed, error: signedErr } = await sb.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 600); // 10 min expiry
    
    if (signedErr || !signed) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Failed to create signed URL' }) };
    }

    // Run OCR
    let ocrText: string;
    try {
      ocrText = await runOCR(signed.signedUrl);
    } catch (ocrError: any) {
      console.error('[OCR Error]', ocrError);
      await markDocStatus(docId, 'rejected', `OCR failed: ${ocrError.message}`);
      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          rejected: true, 
          reason: 'ocr_failed' 
        }) 
      };
    }

    // ⚡ GUARDRAILS: Apply STRICT rules to OCR output
    const cfg = await getGuardrailConfig(userId);
    const guardrailResult = await runGuardrails(
      ocrText, 
      userId, 
      'ingestion_ocr',  // OCR stage
      cfg
    );
    
    // Check if blocked
    if (!guardrailResult.ok) {
      console.warn(`[OCR] Content blocked by guardrails: ${docId}`, guardrailResult.reasons);
      await markDocStatus(docId, 'rejected', `Blocked: ${guardrailResult.reasons.join(', ')}`);
      
      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          rejected: true, 
          reasons: guardrailResult.reasons 
        }) 
      };
    }

    // Store REDACTED OCR output as JSON (never store raw)
    const ocrKey = `${doc.storage_path}.ocr.json`;
    const ocrData = {
      text: guardrailResult.text,  // Redacted text
      pii_found: guardrailResult.signals?.pii || false,
      pii_types: guardrailResult.signals?.piiTypes || [],
      processed_at: new Date().toISOString()
    };
    
    await sb.storage
      .from(BUCKET)
      .upload(
        ocrKey, 
        new Blob([JSON.stringify(ocrData)], { type: 'application/json' }), 
        { upsert: true }
      );

    // Update document with OCR metadata
    await sb.from('user_documents').update({
      ocr_text: guardrailResult.text,  // Redacted
      ocr_completed_at: new Date().toISOString(),
      pii_types: guardrailResult.signals?.piiTypes || [],
      updated_at: new Date().toISOString()
    }).eq('id', docId);

    // Queue for normalization → transactions
    await sb.functions.invoke('normalize-transactions', { 
      body: { userId, documentId: docId } 
    });
    
    await markDocStatus(docId, 'ready', null);

    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        ok: true,
        pii_redacted: guardrailResult.signals?.pii || false,
        pii_types: guardrailResult.signals?.piiTypes || [],
        text_length: guardrailResult.text.length
      }) 
    };
    
  } catch (e: any) {
    console.error('[Smart Import OCR Error]', e);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: e.message }) 
    };
  }
};

