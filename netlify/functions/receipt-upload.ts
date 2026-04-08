/**
 * receipt-upload - Upload and OCR a receipt image, attempt auto-match to transactions.
 */
import type { Handler } from '@netlify/functions';
import { serverSupabase } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  const userId = auth.userId;
  const sb = serverSupabase();

  try {
    const body = JSON.parse(event.body || '{}');
    const { image_base64, mime_type, filename, transaction_id } = body;
    if (!image_base64 || !filename) return { statusCode: 400, headers, body: JSON.stringify({ error: 'image_base64 and filename required' }) };

    // STEP 1 - Upload to Supabase Storage
    const fileBuffer = Buffer.from(image_base64, 'base64');
    const storagePath = `${userId}/${Date.now()}-${filename}`;
    const { error: storageError } = await sb.storage.from('receipts').upload(storagePath, fileBuffer, { contentType: mime_type || 'application/octet-stream', upsert: false });
    if (storageError) console.warn('[receipt-upload] Storage error (non-blocking):', storageError.message);
    const { data: { publicUrl } } = sb.storage.from('receipts').getPublicUrl(storagePath);

    // STEP 2 - OCR with Claude Haiku
    const isImage = (mime_type || '').startsWith('image/');
    let extracted: any = {};
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
            isImage ? { type: 'image', source: { type: 'base64', media_type: mime_type, data: image_base64 } } : { type: 'text', text: 'Please extract receipt data from this document.' },
            { type: 'text', text: 'Extract all receipt data and return as JSON only.' }
          ] }]
        })
      });
      const claudeData = await claudeRes.json();
      const rawText = claudeData.content?.[0]?.text || '{}';
      try { extracted = JSON.parse(rawText.replace(/```json|```/g, '').trim()); } catch { extracted = {}; }
      const fieldsFound = [extracted.merchant_name, extracted.amount, extracted.receipt_date].filter(Boolean).length;
      ocr_confidence = fieldsFound / 3;
    } catch (ocrErr: any) {
      console.error('[receipt-upload] OCR error:', ocrErr?.message);
    }

    // STEP 3 - Insert receipt record
    const { data: receipt, error: insertError } = await sb.from('receipts').insert({
      user_id: userId,
      file_url: publicUrl,
      image_url: publicUrl,
      original_filename: filename,
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
      console.error('[receipt-upload] Insert error:', insertError?.message);
      return { statusCode: 500, headers, body: JSON.stringify({ error: insertError?.message || 'Insert failed' }) };
    }

    // STEP 4 - Direct link if transaction_id provided
    if (transaction_id) {
      await sb.from('receipts').update({ transaction_id, match_status: 'matched', match_confidence: 1.0 }).eq('id', receipt.id);
      await sb.from('transactions').update({ receipt_id: receipt.id, has_receipt: true }).eq('id', transaction_id);
      const merchantDisplay = extracted.merchant_name || 'this receipt';
      const amountDisplay = extracted.amount ? `$${Number(extracted.amount).toFixed(2)}` : 'unknown amount';
      return { statusCode: 200, headers, body: JSON.stringify({
        ok: true, reply: `Got it - I've attached this receipt directly to that transaction. **${merchantDisplay}** for **${amountDisplay}**. Linked ✓`,
        matched: true, pending_match: false, receipt_id: receipt.id, file_url: publicUrl,
        merchant_name: extracted.merchant_name, amount: extracted.amount, receipt_date: extracted.receipt_date,
        suggested_category: extracted.suggested_category, transaction_id,
      }) };
    }

    // STEP 5 - Attempt automatic match
    let bestMatch: any = null;
    if (extracted.merchant_name && extracted.amount) {
      try {
        const merchantSearch = (extracted.merchant_name || '').replace(/'/g, "''");
        const receiptAmount = Number(extracted.amount);
        let q = sb.from('transactions')
          .select('id, merchant_name, amount, date, category')
          .eq('user_id', userId)
          .or(`merchant_name.ilike.%${merchantSearch}%,description.ilike.%${merchantSearch}%`)
          .gte('amount', receiptAmount - 1.00)
          .lte('amount', receiptAmount + 1.00)
          .order('date', { ascending: false })
          .limit(5);
        if (extracted.receipt_date) {
          const d = new Date(extracted.receipt_date);
          const dayMinus5 = new Date(d.getTime() - 5 * 86400000).toISOString().split('T')[0];
          const dayPlus5 = new Date(d.getTime() + 5 * 86400000).toISOString().split('T')[0];
          q = q.gte('date', dayMinus5).lte('date', dayPlus5);
        }
        const { data: matches } = await q;
        bestMatch = matches?.[0] || null;
        if (bestMatch) {
          const matchConfidence = Math.abs(Number(bestMatch.amount) - receiptAmount) < 0.01 ? 0.95 : 0.8;
          await sb.from('receipts').update({ transaction_id: bestMatch.id, match_status: 'matched', match_confidence: matchConfidence }).eq('id', receipt.id);
          await sb.from('transactions').update({ receipt_id: receipt.id, has_receipt: true }).eq('id', bestMatch.id);
        }
      } catch (matchErr: any) {
        console.warn('[receipt-upload] Match error (non-blocking):', matchErr?.message);
      }
    }

    // STEP 6 - Build response
    const matched = !!bestMatch;
    const merchantDisplay = extracted.merchant_name || 'this receipt';
    const amountDisplay = extracted.amount ? `$${Number(extracted.amount).toFixed(2)}` : 'unknown amount';
    const dateDisplay = extracted.receipt_date || 'unknown date';
    const catDisplay = extracted.suggested_category || 'Other';

    let reply: string;
    if (matched) {
      reply = `Got it - I read this receipt. **${merchantDisplay}** for **${amountDisplay}** on **${dateDisplay}**. I found a matching transaction in your books. Linked ✓. Tag has suggested **${catDisplay}** based on the line items.`;
    } else if (ocr_confidence > 0.5) {
      reply = `Got it - I've read this receipt. **${merchantDisplay}**, **${amountDisplay}**, dated **${dateDisplay}**. I don't see a matching transaction yet - the statement probably hasn't been uploaded. I'm holding this receipt and will link it automatically when it arrives.`;
    } else {
      reply = `I uploaded the file but had some trouble reading it clearly. I've stored it - you can manually link it to a transaction from the Receipts page.`;
    }

    return { statusCode: 200, headers, body: JSON.stringify({
      ok: true, reply, matched, pending_match: !matched && ocr_confidence > 0.5,
      receipt_id: receipt.id, file_url: publicUrl,
      merchant_name: extracted.merchant_name || null, amount: extracted.amount || null,
      receipt_date: extracted.receipt_date || null, suggested_category: extracted.suggested_category || null,
      transaction_id: bestMatch?.id || null,
    }) };
  } catch (err: any) {
    console.error('[receipt-upload] Error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
