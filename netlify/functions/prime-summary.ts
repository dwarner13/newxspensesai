import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GENERIC_SUMMARY = 'Your categorized results and insights are available.';

function buildFallbackSummary(docData: any): string | null {
  if (!docData) return null;
  const extracted = docData.extracted_data || null;
  const lines: string[] = [];

  if (extracted) {
    if (extracted.vendor) lines.push(`Vendor: ${extracted.vendor}`);
    if (extracted.merchant) lines.push(`Merchant: ${extracted.merchant}`);
    if (extracted.invoice_no) lines.push(`Invoice #: ${extracted.invoice_no}`);
    if (extracted.date) lines.push(`Date: ${extracted.date}`);
    if (extracted.statement_period) lines.push(`Statement period: ${extracted.statement_period}`);
    if (extracted.new_balance) lines.push(`New balance: $${extracted.new_balance}`);
    if (extracted.minimum_payment_due) lines.push(`Minimum payment due: $${extracted.minimum_payment_due}`);
    if (extracted.due_date) lines.push(`Payment due date: ${extracted.due_date}`);
    if (extracted.previous_balance) lines.push(`Previous balance: $${extracted.previous_balance}`);
    if (extracted.payments) lines.push(`Payments: -$${extracted.payments}`);
    if (extracted.transactions) lines.push(`Transactions: +$${extracted.transactions}`);
    if (extracted.interest_charged) lines.push(`Interest charged: +$${extracted.interest_charged}`);
    if (extracted.credit_limit) lines.push(`Credit limit: $${extracted.credit_limit}`);
    if (extracted.available_credit) lines.push(`Available credit: $${extracted.available_credit}`);
    if (extracted.total) {
      lines.push(`Total: $${extracted.total}${extracted.currency ? ` ${extracted.currency}` : ''}`);
    }
    if (Array.isArray(docData.pii_types) && docData.pii_types.length > 0) {
      lines.push(`PII redacted: ${docData.pii_types.join(', ')}`);
    }
  }

  if (lines.length > 0) {
    return `I read your document (${docData.original_name || 'upload'}). Here’s what I found:\n${lines
      .map((l) => `• ${l}`)
      .join('\n')}`;
  }

  if (docData.ocr_text) {
    const trimmed = String(docData.ocr_text || '').trim();
    const preview = trimmed.length > 200 ? `${trimmed.slice(0, 200)}…` : trimmed;
    if (preview) {
      return `I read your document (${docData.original_name || 'upload'}) but couldn’t extract transactions. OCR preview:\n${preview}`;
    }
  }

  return null;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, error: 'Method not allowed. Use POST.' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    let importId = body.importId as string | undefined;
    const docId = body.docId as string | undefined;

    const sb = admin();
    if (!importId && docId) {
      const { data: latestImport } = await sb
        .from('imports')
        .select('id')
        .eq('document_id', docId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      importId = latestImport?.id;
    }

    if (!importId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Missing importId or docId' }),
      };
    }

    const { data: importData } = await sb
      .from('imports')
      .select('id, status, created_at, document_id')
      .eq('id', importId)
      .maybeSingle();

    if (!importData) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, summary: GENERIC_SUMMARY }),
      };
    }

    const { data: stagingTransactions } = await sb
      .from('transactions_staging')
      .select('id, data_json')
      .eq('import_id', importId);

    let transactions = stagingTransactions || [];
    if (!transactions.length) {
      const { data: committedTransactions } = await sb
        .from('transactions')
        .select('id, data_json')
        .eq('import_id', importId);
      transactions = committedTransactions || [];
    }
    if (!transactions.length && importData.document_id) {
      const { data: stagedByDoc } = await sb
        .from('transactions_staging')
        .select('id, data_json')
        .contains('data_json', { documentId: importData.document_id });
      transactions = stagedByDoc || [];
    }
    if (!transactions.length && importData.document_id) {
      const { data: stagedByDocEq } = await sb
        .from('transactions_staging')
        .select('id, data_json')
        .eq('data_json->>documentId', importData.document_id);
      transactions = stagedByDocEq || [];
    }
    if (!transactions.length && importData.document_id) {
      const { data: committedByDoc } = await sb
        .from('transactions')
        .select('id, data_json')
        .contains('data_json', { documentId: importData.document_id });
      transactions = committedByDoc || [];
    }
    if (!transactions.length && importData.document_id) {
      const { data: committedByDocEq } = await sb
        .from('transactions')
        .select('id, data_json')
        .eq('data_json->>documentId', importData.document_id);
      transactions = committedByDocEq || [];
    }
    if (!transactions.length && importData.document_id) {
      const { data: latestImport } = await sb
        .from('imports')
        .select('id')
        .eq('document_id', importData.document_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestImport?.id && latestImport.id !== importId) {
        const { data: stagedByLatest } = await sb
          .from('transactions_staging')
          .select('id, data_json')
          .eq('import_id', latestImport.id);
        transactions = stagedByLatest || [];
      }
    }

    const transactionCount = transactions.length;

    if (transactionCount === 0) {
      if (importData.document_id) {
        const { data: docData } = await sb
          .from('user_documents')
          .select('extracted_data, ocr_text, original_name, pii_types')
          .eq('id', importData.document_id)
          .maybeSingle();

        const fallback = buildFallbackSummary(docData);
        if (fallback) {
          return { statusCode: 200, headers, body: JSON.stringify({ ok: true, summary: fallback }) };
        }
      }

      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, summary: GENERIC_SUMMARY }) };
    }

    const categoryTotals = new Map<string, { amount: number; count: number }>();
    transactions.forEach((tx: any) => {
      const category = tx.data_json?.category || 'Uncategorized';
      const amount = Math.abs(Number(tx.data_json?.amount || 0));
      const existing = categoryTotals.get(category) || { amount: 0, count: 0 };
      categoryTotals.set(category, {
        amount: existing.amount + amount,
        count: existing.count + 1,
      });
    });

    const topCategories = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 3)
      .map(([cat, stats]) => `${cat} (${stats.count} tx, $${stats.amount.toFixed(2)})`);

    const insights: string[] = [];
    insights.push(`${transactionCount} transaction${transactionCount !== 1 ? 's' : ''} processed`);
    if (topCategories.length > 0) {
      insights.push(`Top category: ${topCategories[0]}`);
    }

    const recapParts: string[] = [];
    recapParts.push(`I've finished analyzing your import${importData.document_id ? ' (1 document)' : ''}.`);
    recapParts.push(`Found ${transactionCount} transaction${transactionCount !== 1 ? 's' : ''}.`);
    if (topCategories.length > 0) {
      recapParts.push(`Top categories: ${topCategories.join(', ')}.`);
    }
    if (insights.length > 0) {
      recapParts.push(`\nNotable insights:\n${insights.map((i) => `• ${i}`).join('\n')}`);
    }
    recapParts.push('Everything is categorized and ready for review.');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, summary: recapParts.join(' ') }),
    };
  } catch (error: any) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: false, summary: GENERIC_SUMMARY }),
    };
  }
};
