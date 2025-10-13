/**
 * Normalize Transactions - Complete Pipeline
 * 
 * Flow: OCR/CSV → Extract → Categorize → Insert → Notify
 * Security: Input already redacted by guardrails
 */

import { Handler } from '@netlify/functions';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { notify } from './_shared/notify';

const URL = process.env.SUPABASE_URL!;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = 'docs';

function admin() { return createClient(URL, SRK, { auth: { persistSession: false }}); }
const ok = (b:any)=>({ statusCode:200, body:JSON.stringify(b) });
const bad = (s:number,m:string)=>({ statusCode:s, body:m });

function hashTx(userId: string, dateISO: string, vendor: string, amountCents: number) {
  return crypto.createHash('sha256').update([userId,dateISO,vendor,amountCents].join('|')).digest('hex');
}

function simpleCategorize(vendor?: string): { category: string|null, conf: number } {
  if (!vendor) return { category: null, conf: 0.5 };
  const v = vendor.toLowerCase();
  if (/walmart|costco|superstore|safeway|loblaws|no frills|metro|sobeys/.test(v)) return { category: 'Groceries', conf: 0.85 };
  if (/shell|esso|petro|chevron|bp|circle k/.test(v)) return { category: 'Gas', conf: 0.85 };
  if (/uber|lyft|taxi/.test(v)) return { category: 'Transport', conf: 0.8 };
  if (/starbucks|tim hortons|coffee|restaurant|dining/.test(v)) return { category: 'Dining', conf: 0.8 };
  if (/amazon|ebay|best buy|apple/.test(v)) return { category: 'Shopping', conf: 0.8 };
  return { category: null, conf: 0.6 };
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return bad(405,'Method Not Allowed');
    const { userId, documentId } = JSON.parse(event.body || '{}');
    if (!userId || !documentId) return bad(400,'Missing userId/documentId');
    const sb = admin();

    // Load document
    const { data: doc, error: eDoc } = await sb.from('user_documents').select('*').eq('id', documentId).single();
    if (eDoc || !doc) return bad(404,'document not found');

    // Load OCR/parsed data from storage
    let combinedText = '';
    let parsedTransactions: any[] | null = null;

    // Try to load .ocr.json (from smart-import-ocr)
    const ocrKey = `${doc.storage_path}.ocr.json`;
    const { data: ocrFile, error: eOcr } = await sb.storage.from(BUCKET).download(ocrKey);
    
    if (!eOcr && ocrFile) {
      const ocrData = JSON.parse(await ocrFile.text());
      combinedText = ocrData.text || '';
      parsedTransactions = ocrData.parsed_transactions || null;
    }

    // If no OCR data, try CSV parsed data
    if (!combinedText) {
      const csvKey = `${doc.storage_path}.txt.ocr.json`;
      const { data: csvFile } = await sb.storage.from(BUCKET).download(csvKey);
      if (csvFile) {
        const csvData = JSON.parse(await csvFile.text());
        parsedTransactions = csvData.lines?.map((l: any) => ({
          text: l.text,
          date: l.text.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
        }));
      }
    }

    if (!combinedText && !parsedTransactions) {
      return bad(404, 'No OCR or parsed data found');
    }

    // Extract transaction data (naive parser - you can enhance)
    let vendor: string | undefined;
    let dateISO: string = new Date().toISOString().slice(0,10);
    let amountCents: number | null = null;

    // Find amounts
    const moneyMatches = [...(combinedText || '').matchAll(/(-?\d{1,3}(?:,\d{3})*(?:\.\d{2}))/g)].map(m=>Number(m[1].replace(/,/g,'')));
    if (moneyMatches.length) amountCents = Math.round(Math.max(...moneyMatches)*100);

    // Find date
    const dateMatch = (combinedText || '').match(/\b(20\d{2}|19\d{2})[-\/.](0?[1-9]|1[0-2])[-\/.](0?[1-9]|[12]\d|3[01])\b|\b(0?[1-9]|[12]\d|3[01])[-\/.](0?[1-9]|1[0-2])[-\/.](20\d{2})\b/);
    if (dateMatch) {
      const raw = dateMatch[0];
      const parts = raw.match(/\d+/g) || [];
      if (raw.match(/^(20|19)/)) {
        const [a,b,c] = parts.map(Number);
        dateISO = `${a}-${String(b).padStart(2,'0')}-${String(c).padStart(2,'0')}`;
      } else {
        const [a,b,c] = parts.map(Number);
        dateISO = `${c}-${String(b).padStart(2,'0')}-${String(a).padStart(2,'0')}`;
      }
    }

    // Find vendor (first meaningful line)
    const lines = (combinedText || '').split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    vendor = lines.find(l => l.length>1 && !/^\d+$/.test(l) && !/(invoice|receipt|total|subtotal|tax|gst|hst|pst|amount due|account|statement)/i.test(l));

    // Categorize
    const { category, conf } = simpleCategorize(vendor);
    const review_status = (!amountCents || conf < 0.75) ? 'needs_review' : 'auto';
    const review_reason = (!amountCents) ? 'missing_total' : (conf < 0.75 ? 'low_confidence' : null);
    const txHash = (amountCents != null) ? hashTx(userId, dateISO, vendor || '', amountCents) : null;

    // Upsert transaction (idempotent via tx_hash)
    const { data: inserted, error: txErr } = await sb.from('transactions').upsert({
      user_id: userId,
      document_id: documentId,
      source_type: doc.source_type || 'upload',
      date: dateISO,
      merchant: vendor || null,
      description: vendor || doc.original_name || 'Import',
      amount: amountCents ? amountCents / 100 : null,
      category,
      category_confidence: conf,
      review_status,
      review_reason,
      tx_hash: txHash,
      created_at: new Date().toISOString()
    }, { onConflict: 'user_id,tx_hash', ignoreDuplicates: false }).select('id, review_status').maybeSingle();

    if (txErr) {
      console.error('[Normalize] Transaction insert error:', txErr);
      return bad(500, `Transaction insert failed: ${txErr.message}`);
    }

    // Mark document as ready
    await sb.from('user_documents').update({ status: 'ready', updated_at: new Date().toISOString() }).eq('id', documentId);

    // Send notifications
    const createdCount = 1;
    await notify(userId, {
      type: 'import',
      title: `Imported ${createdCount} transaction${createdCount>1?'s':''}`,
      body: doc.original_name ? `From ${doc.original_name}` : undefined,
      href: '/transactions?filter=new',
      meta: { documentId, createdCount }
    });

    if (review_status === 'needs_review') {
      await notify(userId, {
        type: 'review',
        title: 'Transaction needs your review',
        body: 'Tap to categorize or confirm',
        href: '/transactions?filter=review',
        meta: { documentId }
      });
    }

    return ok({ ok: true, transactionId: inserted?.id || null, review_status });
  } catch (e:any) {
    console.error('[Normalize Transactions Error]', e);
    return bad(500, e.message || 'normalize error');
  }
};
