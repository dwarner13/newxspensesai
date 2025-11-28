/**
 * Smart Import OCR - Extract text from images/PDFs
 * 
 * SECURITY: OCR output runs through STRICT guardrails before storage
 */

import { Handler } from '@netlify/functions';
import { admin, markDocStatus } from './_shared/upload';
// Phase 2.2: Use unified guardrails API (single source of truth)
import { runGuardrailsForText } from './_shared/guardrails-unified';
import { callGoogleVisionOnImage } from './_shared/vision/googleVisionClient.js';

const BUCKET = 'docs';

/**
 * Run OCR on image/PDF using Google Vision (for images) or OCR.space (fallback)
 * @param signedUrl Signed URL to file
 * @param mimeType MIME type of the file (e.g., 'image/png', 'application/pdf')
 * @returns Extracted text
 */
async function runOCR(signedUrl: string, mimeType: string): Promise<string> {
  const hasVision = !!process.env.GOOGLE_VISION_API_KEY;
  const hasOcrSpace = !!process.env.OCR_SPACE_API_KEY;
  const isImage = mimeType.startsWith('image/') && !mimeType.includes('pdf');

  // 1) Prefer Google Vision for images when configured
  if (isImage && hasVision) {
    try {
      console.log('[OCR] Using Google Vision for image file');
      const result = await callGoogleVisionOnImage({
        imageUrl: signedUrl,
        apiKey: process.env.GOOGLE_VISION_API_KEY as string,
        feature: 'DOCUMENT_TEXT_DETECTION',
      });

      if (result.fullText?.trim()) {
        return result.fullText;
      }

      console.warn('[OCR] Google Vision returned empty text, falling back to legacy OCR if available');
    } catch (error: any) {
      console.error('[OCR] Google Vision error, falling back to legacy OCR if available:', error.message || error);
    }
    // Fall through to legacy OCR / placeholder
  }

  // 2) Legacy OCR (OCR.space) for PDFs or as fallback
  if (hasOcrSpace) {
    console.log('[OCR] Using OCR.space backend');
    try {
      const formData = new FormData();
      formData.append('url', signedUrl);
      formData.append('apikey', process.env.OCR_SPACE_API_KEY);
      formData.append('language', 'eng');

      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.ParsedResults?.[0]?.ParsedText) {
        return result.ParsedResults[0].ParsedText;
      }
    } catch (error: any) {
      console.error('[OCR] OCR.space error:', error.message || error);
    }
  }

  // 3) Final fallback
  console.warn('[OCR] No OCR provider configured, returning placeholder text');
  return 'OCR output placeholder - configure GOOGLE_VISION_API_KEY or OCR_SPACE_API_KEY';
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
      ocrText = await runOCR(signed.signedUrl, doc.mime_type || 'application/pdf');
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
    // ✅ Phase 2.2: Use unified guardrails API (includes config loading)
    const guardrailResult = await runGuardrailsForText(
      ocrText, 
      userId, 
      'ingestion_ocr'  // OCR stage
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

    // Queue for normalization → transactions (fire and forget)
    const netlifyUrl = process.env.NETLIFY_URL || 'http://localhost:8888';
    fetch(`${netlifyUrl}/.netlify/functions/normalize-transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, documentId: docId }),
    }).catch((err) => {
      console.error('[smart-import-ocr] Error calling normalize-transactions:', err);
      // Don't fail OCR if normalization fails - it can be retried later
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

