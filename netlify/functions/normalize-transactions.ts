/**
 * Normalize Transactions - Convert OCR/parsed data to transactions table
 * 
 * Security: Input is already redacted by Smart Import guardrails
 * 
 * Flow:
 * 1. Load OCR/parsed data from storage
 * 2. Extract transactions
 * 3. Auto-categorize (optional)
 * 4. Insert into transactions table
 * 5. Send notifications
 */

import { Handler } from '@netlify/functions';
import { admin, markDocStatus } from './_shared/upload';
import { notify } from './_shared/notify';

const BUCKET = 'docs';

/**
 * Simple transaction extraction from OCR text
 * Replace with more sophisticated parser as needed
 */
function extractTransactions(ocrData: any, doc: any): Array<{
  date: string;
  merchant: string;
  amount: number;
  description: string;
  category?: string;
  confidence?: number;
}> {
  const transactions: any[] = [];

  // Check if OCR data has parsed_transactions (from CSV parser)
  if (ocrData.parsed_transactions && Array.isArray(ocrData.parsed_transactions)) {
    return ocrData.parsed_transactions.map((t: any) => ({
      date: t.date || new Date().toISOString().slice(0, 10),
      merchant: t.merchant || 'Unknown',
      amount: t.amount || 0,
      description: t.description || '',
      category: null,
      confidence: null
    }));
  }

  // Otherwise, simple OCR text extraction (placeholder)
  const text = ocrData.text || '';
  
  // Look for amounts and dates (very basic)
  const amountMatches = text.match(/\$?\d+\.\d{2}/g);
  if (amountMatches && amountMatches.length > 0) {
    transactions.push({
      date: new Date().toISOString().slice(0, 10),
      merchant: doc.original_name || 'Imported',
      amount: -Math.abs(parseFloat(amountMatches[0].replace('$', ''))),
      description: `From ${doc.original_name || 'document'}`,
      category: null,
      confidence: 0.5
    });
  }

  return transactions;
}

export const handler: Handler = async (event) => {
  try {
    const { userId, documentId } = JSON.parse(event.body || '{}');
    if (!userId || !documentId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId/documentId' }) };
    }

    const sb = admin();

    // Load document
    const { data: doc, error } = await sb
      .from('user_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error || !doc) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Document not found' }) };
    }

    // Load OCR/parsed data
    const ocrKey = `${doc.storage_path}.ocr.json`;
    const { data: ocrFile, error: ocrErr } = await sb.storage.from(BUCKET).download(ocrKey);

    if (ocrErr || !ocrFile) {
      console.error('[Normalize] No OCR data found:', ocrErr);
      await markDocStatus(documentId, 'rejected', 'No OCR data found');
      return { statusCode: 404, body: JSON.stringify({ error: 'No OCR data found' }) };
    }

    const ocrText = await ocrFile.text();
    const ocrData = JSON.parse(ocrText);

    // Extract transactions (already redacted by Smart Import)
    const transactions = extractTransactions(ocrData, doc);

    if (transactions.length === 0) {
      await markDocStatus(documentId, 'ready', null);
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, created: 0, message: 'No transactions found' })
      };
    }

    // Insert transactions
    let createdCount = 0;
    let needsReview = 0;

    for (const tx of transactions) {
      // Determine review status
      const confidence = tx.confidence;
      const reviewStatus = confidence == null ? 'needs_review'
                        : confidence >= 0.75 ? 'auto'
                        : 'needs_review';
      const reviewReason = confidence == null ? 'no_category' : 'low_confidence';

      const { error: txErr } = await sb.from('transactions').insert({
        user_id: userId,
        document_id: documentId,
        date: tx.date,
        merchant: tx.merchant,
        amount: tx.amount,
        description: tx.description,
        category: tx.category,
        category_confidence: confidence,
        review_status: reviewStatus,
        review_reason: reviewReason,
        source: doc.source_type || 'upload',
        created_at: new Date().toISOString()
      });

      if (!txErr) {
        createdCount++;
        if (reviewStatus === 'needs_review') needsReview++;
      }
    }

    // Mark document as ready
    await markDocStatus(documentId, 'ready', null);

    // Send notifications
    await notify(userId, {
      type: 'import',
      title: `Imported ${createdCount} transaction${createdCount > 1 ? 's' : ''}`,
      body: doc.original_name ? `From ${doc.original_name}` : undefined,
      href: '/transactions?filter=new',
      meta: { documentId, createdCount }
    });

    if (needsReview > 0) {
      await notify(userId, {
        type: 'review',
        title: `${needsReview} transaction${needsReview > 1 ? 's' : ''} need your review`,
        body: 'Tap to categorize or confirm',
        href: '/transactions?filter=review',
        meta: { documentId, needsReview }
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        created: createdCount,
        needsReview
      })
    };
  } catch (e: any) {
    console.error('[Normalize Transactions Error]', e);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};

