/**
 * Smart Import CSV Parser - Parse bank statements
 * 
 * Input: Redacted CSV/OFX/QIF file
 * Output: Normalized transactions
 * 
 * SECURITY: Input is already redacted by guardrails-process
 */

import { Handler } from '@netlify/functions';
import { admin, markDocStatus } from './_shared/upload.js';

const BUCKET = 'docs';
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Simple CSV parser (replace with robust parser if needed)
 */
function parseCsv(text: string): Array<{
  date: string;
  description: string;
  amount: number;
  memo?: string;
}> {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  
  const rows: any[] = [];
  const header = lines.shift()!;
  const cols = header.split(',').map(s => s.trim().toLowerCase());
  
  for (const line of lines) {
    const cells = line.split(',').map(s => s.trim());
    const row: any = {};
    cols.forEach((c, i) => row[c] = cells[i]);
    
    // Flexible column mapping
    const date = row.date || row.txdate || row.posted || row['transaction date'];
    const desc = row.description || row.payee || row.merchant || row.memo || '';
    const amt = Number(row.amount || row.debit || row.credit || 0);
    
    if (date && desc) {
      rows.push({ 
        date, 
        description: desc, 
        amount: amt, 
        memo: row.memo 
      });
    }
  }
  
  return rows;
}

export const handler: Handler = async (event) => {
  try {
    const { userId, docId, key, csvText } = JSON.parse(event.body || '{}');
    
    if (!userId || !docId) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Missing required fields' }) 
      };
    }

    const sb = admin();

    // Parse CSV (input is already redacted by guardrails)
    let text = String(csvText || '');
    if (!text && key) {
      const { data: file, error: downloadErr } = await sb.storage
        .from(BUCKET)
        .download(key);
      if (downloadErr || !file) {
        console.error('[CSV Parser] Failed to download file:', downloadErr);
        await markDocStatus(docId, 'rejected', 'Failed to load statement file');
        return { 
          statusCode: 404, 
          body: JSON.stringify({ error: 'Redacted statement file not found' }) 
        };
      }
      text = await file.text();
    }
    if (!text) {
      await markDocStatus(docId, 'rejected', 'No CSV text available');
      return {
        statusCode: 200,
        body: JSON.stringify({
          rejected: true,
          reason: 'empty_file',
        }),
      };
    }
    let transactions: any[];
    
    try {
      transactions = parseCsv(text);
    } catch (parseErr: any) {
      console.error('[CSV Parser] Parse failed:', parseErr);
      await markDocStatus(docId, 'rejected', `Parse failed: ${parseErr.message}`);
      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          rejected: true, 
          reason: 'parse_failed' 
        }) 
      };
    }

    if (transactions.length === 0) {
      await markDocStatus(docId, 'rejected', 'No transactions found in file');
      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          rejected: true, 
          reason: 'empty_file' 
        }) 
      };
    }

    // Queue for normalization → transactions table (fire and forget)
    const netlifyUrl = process.env.NETLIFY_URL || 'http://localhost:8888';
    if (!docId || !UUID_V4_RE.test(String(docId))) {
      console.warn('[smart-import-parse-csv] Skipping normalize-transactions due to invalid documentId', { docId });
    } else {
      fetch(`${netlifyUrl}/.netlify/functions/normalize-transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, documentId: docId, ocrText: text }),
      }).catch((err) => {
        console.error('[smart-import-parse-csv] Error calling normalize-transactions:', err);
        // Don't fail parsing if normalization fails - it can be retried later
      });
    }
    
    await markDocStatus(docId, 'ready', null);

    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        ok: true, 
        parsed: transactions.length 
      }) 
    };
    
  } catch (e: any) {
    console.error('[Smart Import Parse CSV Error]', e);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: e.message }) 
    };
  }
};

