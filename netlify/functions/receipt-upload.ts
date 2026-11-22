/**
 * receipt-upload - Upload and OCR a receipt image, attempt auto-match to transactions.
 *
 * C2-A2 hardening:
 *  - A client-supplied `transaction_id` is verified to belong to the caller BEFORE anything is
 *    stored, and every link update is scoped by user_id (previously a forged id could attach a
 *    receipt to another user's transaction through the service-role client).
 *  - Matching uses value-bound ILIKE filters (see _shared/receiptMatching.ts) instead of building
 *    a PostgREST `.or()` string from OCR output.
 *  - File type is checked by magic bytes (JPEG/PNG/GIF/WebP/HEIC/PDF), size is capped, and the
 *    storage file name is sanitised.
 *  - The private `receipts` bucket never yields a public URL: the row stores the storage PATH and
 *    the response carries a short-lived signed URL.
 *  - Error responses are generic; no DB or provider messages are returned.
 */
import type { Handler } from '@netlify/functions';
import { serverSupabase } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { parseJson } from './_shared/http.js';
import {
  decodeBase64Upload,
  isUploadRejection,
  EXTENSION_FOR_TYPE,
  IMAGE_TYPES_FOR_VISION,
  sanitizeStorageFileName,
  type DetectedFileType,
} from './_shared/uploadFileValidation.js';
import {
  findReceiptMatchCandidates,
  isPlausibleTransactionId,
  linkReceiptToTransaction,
  verifyTransactionOwnership,
  type ReceiptMatchCandidate,
} from './_shared/receiptMatching.js';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RECEIPT_TYPES: readonly DetectedFileType[] = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'application/pdf',
];
const SIGNED_URL_TTL_SECONDS = 600;

const reply = (statusCode: number, body: unknown) => ({ statusCode, headers, body: JSON.stringify(body) });
const errName = (e: unknown) => (e instanceof Error ? e.name : 'Error');
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- model JSON output is untyped
type Extracted = Record<string, any>;

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return reply(401, { error: 'Unauthorized' });

  const userId = auth.userId;
  const sb = serverSupabase();

  try {
    const body = parseJson(event);
    const { image_base64, filename, transaction_id } = body;
    if (!image_base64 || !filename) return reply(400, { error: 'image_base64 and filename required' });

    // STEP 0 - Ownership of a requested link target, before any storage write or OCR spend.
    const requestedTxId = transaction_id === undefined || transaction_id === null || transaction_id === ''
      ? null
      : transaction_id;
    if (requestedTxId !== null) {
      if (!isPlausibleTransactionId(requestedTxId) || !(await verifyTransactionOwnership(sb, userId, requestedTxId))) {
        return reply(404, { error: 'Transaction not found' });
      }
    }

    const decoded = decodeBase64Upload(image_base64, { allowed: RECEIPT_TYPES });
    if (isUploadRejection(decoded)) return reply(decoded.status, { error: decoded.message, code: decoded.code });
    const mimeType = decoded.mime;

    // STEP 1 - Upload to private Supabase Storage (path only, never a public URL)
    const safeName = sanitizeStorageFileName(filename, EXTENSION_FOR_TYPE[mimeType]);
    const storagePath = `${userId}/${Date.now()}-${safeName}`;
    let storedPath: string | null = storagePath;
    const { error: storageError } = await sb.storage
      .from('receipts')
      .upload(storagePath, decoded.buffer, { contentType: mimeType, upsert: false });
    if (storageError) {
      console.warn('[receipt-upload] Storage upload failed (non-blocking)', { code: (storageError as { statusCode?: unknown }).statusCode ?? null });
      storedPath = null;
    }

    // STEP 2 - OCR with Claude Haiku (images Claude can read; other types get a text-only prompt as before)
    const isVisionImage = IMAGE_TYPES_FOR_VISION.includes(mimeType);
    let extracted: Extracted = {};
    let ocr_confidence = 0;
    try {
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: `You are Byte, an expert receipt reader for a Canadian financial app. Extract structured data from this receipt image. Return ONLY valid JSON with NO markdown, NO backticks, NO explanation - just raw JSON. Use this exact structure:\n{"merchant_name":"string or null","amount":null,"receipt_date":"YYYY-MM-DD or null","line_items":[{"description":"string","amount":0}],"suggested_category":"one of: Food & Dining, Transportation, Shopping, Healthcare, Business, Personal Care, Entertainment, Utilities, Bank Fees, Other","tax_amount":null,"subtotal":null,"raw_text_summary":"brief one-line summary"}`,
          messages: [{ role: 'user', content: [
            isVisionImage
              ? { type: 'image', source: { type: 'base64', media_type: mimeType, data: decoded.buffer.toString('base64') } }
              : { type: 'text', text: 'Please extract receipt data from this document.' },
            { type: 'text', text: 'Extract all receipt data and return as JSON only.' }
          ] }]
        })
      });
      const claudeData = await claudeRes.json();
      const rawText = claudeData.content?.[0]?.text || '{}';
      try { extracted = JSON.parse(rawText.replace(/```json|```/g, '').trim()); } catch { extracted = {}; }
      if (!extracted || typeof extracted !== 'object' || Array.isArray(extracted)) extracted = {};
      const fieldsFound = [extracted.merchant_name, extracted.amount, extracted.receipt_date].filter(Boolean).length;
      ocr_confidence = fieldsFound / 3;
    } catch (ocrErr: unknown) {
      console.error('[receipt-upload] OCR failed', { name: errName(ocrErr) });
    }

    // STEP 3 - Insert receipt record (file_url/image_url hold the private storage path)
    const { data: receipt, error: insertError } = await sb.from('receipts').insert({
      user_id: userId,
      file_url: storedPath,
      image_url: storedPath,
      original_filename: safeName,
      upload_date: new Date().toISOString(),
      processing_status: 'completed',
      merchant_name: extracted.merchant_name || null,
      amount: extracted.amount || null,
      receipt_date: extracted.receipt_date || null,
      line_items: extracted.line_items || null,
      suggested_category: extracted.suggested_category || null,
      ocr_confidence,
      raw_text: extracted.raw_text_summary || null,
      extracted_data: extracted,
      match_status: 'pending',
    }).select().single();

    if (insertError || !receipt) {
      console.error('[receipt-upload] Insert failed', { code: insertError?.code ?? null });
      return reply(500, { error: 'Could not save the receipt. Please try again.' });
    }

    let signedFileUrl: string | null = null;
    if (storedPath) {
      const { data: signed } = await sb.storage.from('receipts').createSignedUrl(storedPath, SIGNED_URL_TTL_SECONDS);
      signedFileUrl = signed?.signedUrl || null;
    }

    // STEP 4 - Direct link (ownership already verified; the update is user-scoped as well)
    if (requestedTxId !== null) {
      const linked = await linkReceiptToTransaction(sb, userId, receipt.id, requestedTxId, 1.0);
      if (!linked) {
        return reply(404, { error: 'Transaction not found', receipt_id: receipt.id });
      }
      const merchantDisplay = extracted.merchant_name || 'this receipt';
      const amountDisplay = extracted.amount ? `$${Number(extracted.amount).toFixed(2)}` : 'unknown amount';
      return reply(200, {
        ok: true, reply: `Got it - I've attached this receipt directly to that transaction. **${merchantDisplay}** for **${amountDisplay}**. Linked ✓`,
        matched: true, pending_match: false, receipt_id: receipt.id, file_url: signedFileUrl, file_path: storedPath,
        merchant_name: extracted.merchant_name, amount: extracted.amount, receipt_date: extracted.receipt_date,
        suggested_category: extracted.suggested_category, transaction_id: requestedTxId,
      });
    }

    // STEP 5 - Attempt automatic match (user-scoped, value-bound filters)
    let bestMatch: ReceiptMatchCandidate | null = null;
    if (extracted.merchant_name && extracted.amount) {
      try {
        const matches = await findReceiptMatchCandidates(
          sb,
          userId,
          { merchantName: extracted.merchant_name, amount: extracted.amount, receiptDate: extracted.receipt_date },
          5,
        );
        const candidate = matches[0] || null;
        if (candidate) {
          const receiptAmount = Number(extracted.amount);
          const matchConfidence = Math.abs(Number(candidate.amount) - receiptAmount) < 0.01 ? 0.95 : 0.8;
          if (await linkReceiptToTransaction(sb, userId, receipt.id, candidate.id, matchConfidence)) {
            bestMatch = candidate;
          }
        }
      } catch (matchErr: unknown) {
        console.warn('[receipt-upload] Match failed (non-blocking)', { name: errName(matchErr) });
      }
    }

    // STEP 6 - Build response
    const matched = !!bestMatch;
    const merchantDisplay = extracted.merchant_name || 'this receipt';
    const amountDisplay = extracted.amount ? `$${Number(extracted.amount).toFixed(2)}` : 'unknown amount';
    const dateDisplay = extracted.receipt_date || 'unknown date';
    const catDisplay = extracted.suggested_category || 'Other';

    let replyText: string;
    if (matched) {
      replyText = `Got it - I read this receipt. **${merchantDisplay}** for **${amountDisplay}** on **${dateDisplay}**. I found a matching transaction in your books. Linked ✓. Tag has suggested **${catDisplay}** based on the line items.`;
    } else if (ocr_confidence > 0.5) {
      replyText = `Got it - I've read this receipt. **${merchantDisplay}**, **${amountDisplay}**, dated **${dateDisplay}**. I don't see a matching transaction yet - the statement probably hasn't been uploaded. I'm holding this receipt and will link it automatically when it arrives.`;
    } else {
      replyText = `I uploaded the file but had some trouble reading it clearly. I've stored it - you can manually link it to a transaction from the Receipts page.`;
    }

    return reply(200, {
      ok: true, reply: replyText, matched, pending_match: !matched && ocr_confidence > 0.5,
      receipt_id: receipt.id, file_url: signedFileUrl, file_path: storedPath,
      merchant_name: extracted.merchant_name || null, amount: extracted.amount || null,
      receipt_date: extracted.receipt_date || null, suggested_category: extracted.suggested_category || null,
      transaction_id: bestMatch?.id || null,
    });
  } catch (err: unknown) {
    console.error('[receipt-upload] Failed', { name: errName(err) });
    return reply(500, { error: 'Receipt upload failed. Please try again.' });
  }
};
