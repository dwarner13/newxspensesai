import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import OpenAI from 'openai';
import { getSupabaseServerClient } from '../../../server/db';
import {
  isOwnedStoragePath, isOriginalWithinRetention, DOCUMENTS_BUCKET, DOCUMENT_SIGNED_URL_TTL_SECONDS,
} from '../../../shared/document-access';

export const id = 'vision_ocr_light';

/**
 * Owner safeguard 2 (2026-11-27): reads ONLY the customer's own uploaded image, by document id.
 * The model never supplies a URL (previously any URL was accepted). Ownership (row + storage prefix),
 * a 60-second signed URL created here, and the 72-hour original retention are enforced; masking
 * fails CLOSED (no unmasked text is ever returned).
 */
export const inputSchema = z.object({
  documentId: z.string().uuid('documentId must be the id of one of your uploaded documents'),
  extractText: z.boolean().default(true),
  maxLength: z.number().min(100).max(5000).default(2000), // Limit text extraction
});

export const outputSchema = z.object({
  ok: z.boolean(),
  text: z.string(),
  extracted: z.boolean(),
  message: z.string(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Light Vision OCR for reading simple text from images
 * 
 * Uses OpenAI Vision API for basic text extraction (not full financial parsing).
 * For full statement parsing, Byte/Prime should be used first.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { documentId, extractText, maxLength } = input;
    const refuse = (message: string) => Ok({ ok: false, text: '', extracted: false, message });

    // Ownership + retention + temporary access (never a model-supplied URL)
    const supabase = getSupabaseServerClient();
    const { data: doc, error: docErr } = await supabase
      .from('user_documents')
      .select('id, user_id, storage_path, mime_type, created_at')
      .eq('id', documentId)
      .eq('user_id', ctx.userId)
      .maybeSingle();
    if (docErr) return Err(new Error('Document lookup failed'));
    if (!doc || !isOwnedStoragePath(doc.storage_path, ctx.userId)) return refuse('That document is not available.');
    if (!String(doc.mime_type || '').startsWith('image/')) return refuse('Only uploaded images can be read with this tool.');
    if (!isOriginalWithinRetention(doc.created_at)) {
      return refuse('The original file is no longer kept (originals are deleted after 72 hours); the extracted details remain available.');
    }
    const { data: signed, error: signErr } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(doc.storage_path as string, DOCUMENT_SIGNED_URL_TTL_SECONDS);
    if (signErr || !signed?.signedUrl) return refuse('That document could not be opened right now.');
    const imageUrl = signed.signedUrl;

    if (!process.env.OPENAI_API_KEY) {
      return Err(new Error('OpenAI API key not configured'));
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    if (!extractText) {
      return Ok({
        ok: true,
        text: '',
        extracted: false,
        message: 'Text extraction skipped',
      });
    }

    console.log(`[Vision OCR Light] Extracting text from document ${documentId.slice(0, 8)}…`);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all visible text from this image. Return only the text, no commentary. If the image contains financial data, extract it but do not parse or structure it.',
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      max_tokens: maxLength,
      temperature: 0.1,
    });

    const rawText = response.choices[0]?.message?.content || '';
    const extracted = rawText.length > 0;

    if (!extracted) {
      return Ok({
        ok: true,
        text: '',
        extracted: false,
        message: 'No text could be extracted from the image',
      });
    }

    // ⚡ GUARDRAILS: Apply guardrails to OCR output BEFORE returning
    // Tools run in backend context, so we can import backend guardrails
    let redactedText = rawText;
    try {
      // Dynamic import to avoid frontend/backend coupling issues
      const { runGuardrailsForText } = await import('../../../../netlify/functions/_shared/guardrails-unified.js');
      const guardrailResult = await runGuardrailsForText(rawText, ctx.userId, 'ingestion_ocr');
      
      if (!guardrailResult.ok) {
        return Err(new Error(`Content blocked by guardrails: ${guardrailResult.reasons?.join(', ')}`));
      }
      
      redactedText = guardrailResult.text;
      
      // Log PII detection (do NOT log raw text)
      if (guardrailResult.signals?.pii) {
        console.log('[Vision OCR Light] PII detected and masked:', {
          piiTypes: guardrailResult.signals.piiTypes,
          originalLength: rawText.length,
          redactedLength: redactedText.length,
          userId: ctx.userId.substring(0, 8) + '...',
        });
      }
    } catch (guardrailError: any) {
      // Fail CLOSED: never return text that was not masked
      console.warn('[Vision OCR Light] Guardrails check failed; text withheld:', guardrailError?.message || guardrailError);
      return refuse('The text could not be checked for personal information, so it was not returned.');
    }

    return Ok({
      ok: true,
      text: redactedText.substring(0, maxLength), // Return redacted text
      extracted: true,
      message: `Extracted ${redactedText.length} characters of text`,
    });
  } catch (error: any) {
    console.error('[Vision OCR Light] Error:', error);
    return Err(new Error(`Vision OCR failed: ${error.message}`));
  }
}






