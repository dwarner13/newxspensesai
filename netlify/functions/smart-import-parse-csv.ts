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
 * Robust CSV parser - handles quoted fields, BMO/TD/RBC/Scotiabank formats
 */
function parseQuotedCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function detectBank(header: string): string {
  const h = header.toLowerCase();
  if (h.includes('first bank card') || h.includes('transaction type') && h.includes('descriptor')) return 'bmo';
  if (h.includes('account number') && h.includes('cheque number')) return 'td';
  if (h.includes('account type') && h.includes('chq#')) return 'rbc';
  if (h.includes('reference number') && h.includes('withdrawal')) return 'scotiabank';
  return 'generic';
}

function parseCsv(text: string): Array<{
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  memo?: string;
}> {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return [];

  const headerLine = lines.shift()!;
  const bank = detectBank(headerLine);
  const cols = parseQuotedCsvLine(headerLine).map(s => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim());
  console.log('[CSV Parser] Detected bank:', bank, '| Columns:', cols);

  const rows: any[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const cells = parseQuotedCsvLine(line);
    const row: Record<string, string> = {};
    cols.forEach((c, i) => { row[c] = (cells[i] || '').trim(); });

    let date = '';
    let desc = '';
    let amount = 0;
    let type: 'debit' | 'credit' = 'debit';

    if (bank === 'bmo') {
      // BMO: "First Bank Card","Transaction Type","Date Posted","Transaction Amount","Descriptor"
      date = row['date posted'] || row['date'] || '';
      desc = row['descriptor'] || row['description'] || '';
      const rawAmt = parseFloat((row['transaction amount'] || '0').replace(/[^0-9.\-]/g, ''));
      // BMO: negative = debit (money out), positive = credit (money in)
      amount = Math.abs(rawAmt);
      type = rawAmt < 0 ? 'debit' : 'credit';
    } else if (bank === 'td') {
      // TD: Date, Description, Debit, Credit, Balance
      date = row['date'] || '';
      desc = row['description'] || '';
      const debit = parseFloat((row['debit'] || '0').replace(/[^0-9.]/g, '')) || 0;
      const credit = parseFloat((row['credit'] || '0').replace(/[^0-9.]/g, '')) || 0;
      if (debit > 0) { amount = debit; type = 'debit'; }
      else if (credit > 0) { amount = credit; type = 'credit'; }
    } else if (bank === 'rbc') {
      // RBC: Account Type, Account Number, Transaction Date, Cheque Number, Description 1, Description 2, CAD$, USD$
      date = row['transaction date'] || row['date'] || '';
      desc = [row['description 1'], row['description 2']].filter(Boolean).join(' ').trim() || row['description'] || '';
      const rawAmt = parseFloat((row['cad'] || row['cadamt'] || row['amount'] || '0').replace(/[^0-9.\-]/g, ''));
      amount = Math.abs(rawAmt);
      type = rawAmt < 0 ? 'debit' : 'credit';
    } else {
      // Generic fallback
      date = row['date'] || row['transaction date'] || row['posted'] || row['txdate'] || '';
      desc = row['description'] || row['payee'] || row['merchant'] || row['memo'] || '';
      const debit = parseFloat((row['debit'] || row['withdrawal'] || '0').replace(/[^0-9.]/g, '')) || 0;
      const credit = parseFloat((row['credit'] || row['deposit'] || '0').replace(/[^0-9.]/g, '')) || 0;
      const rawAmt = parseFloat((row['amount'] || '0').replace(/[^0-9.\-]/g, ''));
      if (debit > 0) { amount = debit; type = 'debit'; }
      else if (credit > 0) { amount = credit; type = 'credit'; }
      else { amount = Math.abs(rawAmt); type = rawAmt <= 0 ? 'debit' : 'credit'; }
    }

    // Normalize date to YYYY-MM-DD
    let normalizedDate = date.trim();
    // Handle YYYYMMDD (BMO)
    if (/^\d{8}$/.test(normalizedDate)) {
      normalizedDate = normalizedDate.slice(0,4) + '-' + normalizedDate.slice(4,6) + '-' + normalizedDate.slice(6,8);
    }
    // Handle MM/DD/YYYY or DD/MM/YYYY
    const slashMatch = normalizedDate.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
    if (slashMatch) {
      const [, p1, p2, p3] = slashMatch;
      const yr = p3.length === 2 ? '20' + p3 : p3;
      normalizedDate = yr + '-' + p1.padStart(2,'0') + '-' + p2.padStart(2,'0');
    }

    if (!normalizedDate || !desc || amount === 0) continue;

    rows.push({ date: normalizedDate, description: desc.trim(), amount, type, memo: desc });
  }

  console.log('[CSV Parser] Parsed', rows.length, 'transactions, bank:', bank);
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

    // Queue for normalization -> transactions table (fire and forget)
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

