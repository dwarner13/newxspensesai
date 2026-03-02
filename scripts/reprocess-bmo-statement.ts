/**
 * Reprocess BMO Statement
 *
 * Fixes wrong transaction amounts and display totals for an existing import by:
 *   1. Reading the PDF from a local path using the layout-based extractor (same as the pipeline)
 *   2. Clearing existing staging rows
 *   3. Re-running normalizeOcrResult with the updated extractMerchant fix
 *   4. Writing corrected staging rows
 *   5. Storing authoritative BMO closing totals in imports.statement_breakdown_json.statementTotals
 *
 * Usage:
 *   npx tsx scripts/reprocess-bmo-statement.ts --pdf "C:\Users\admin\Downloads\February 13, 2026.pdf"
 *   npx tsx scripts/reprocess-bmo-statement.ts --pdf "..." --import-id <uuid>
 *   npx tsx scripts/reprocess-bmo-statement.ts --pdf "..." --dry-run
 */

import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Load env
// ---------------------------------------------------------------------------
function loadLocalEnvFiles(): void {
  const files = ['.env.local', '.envlocal', '.env'];
  for (const file of files) {
    const absPath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(absPath)) continue;
    const text = fs.readFileSync(absPath, 'utf8');
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;
      const key = match[1];
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}
loadLocalEnvFiles();

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const PDF_PATH = (() => { const i = args.indexOf('--pdf'); return i !== -1 ? args[i + 1] : null; })();
const TARGET_IMPORT_ID = (() => { const i = args.indexOf('--import-id'); return i !== -1 ? args[i + 1] : null; })();
const USER_ID = '938a2e17-0e49-45ff-bb98-810db46e5e65';

if (!PDF_PATH) {
  console.error('Usage: npx tsx scripts/reprocess-bmo-statement.ts --pdf "<path-to-pdf>"');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Extract PDF text with layout (mirrors extractPdfTextWithLayout in pdfText.ts)
// ---------------------------------------------------------------------------
async function extractPdfTextWithLayout(pdfBuffer: Buffer): Promise<string> {
  const pdfJsMod: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfjs = pdfJsMod?.default ?? pdfJsMod;

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(pdfBuffer) });
  const doc = await loadingTask.promise;
  const numPages = doc.numPages;

  const pageTexts: string[] = [];
  for (let p = 1; p <= numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();

    // Group text items by Y coordinate (0.5pt buckets)
    const rowMap = new Map<number, Array<{ x: number; str: string }>>();
    for (const item of content.items as any[]) {
      if (typeof item.str !== 'string') continue;
      const y = Math.round(item.transform[5] * 2) / 2;
      if (!rowMap.has(y)) rowMap.set(y, []);
      rowMap.get(y)!.push({ x: item.transform[4], str: item.str });
    }

    // Sort rows by descending Y (top of page first), then items by X
    const sortedRows = Array.from(rowMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([, items]) => items.sort((a, b) => a.x - b.x));

    const lines: string[] = [];
    for (const row of sortedRows) {
      let line = '';
      let lastX = 0;
      let lastWidth = 0;
      for (const item of row) {
        if (line.length > 0 && item.x > lastX + lastWidth + 3) line += ' ';
        line += item.str;
        lastX = item.x;
        lastWidth = (item as any).width ?? item.str.length * 6;
      }
      const trimmed = line.trim();
      if (trimmed) lines.push(trimmed);
    }

    pageTexts.push(`Page ${p}\n${lines.join('\n')}`);
  }

  return pageTexts.join('\n');
}

// ---------------------------------------------------------------------------
// parseBmoStatementTotals — mirrors the function in normalize-transactions.ts
// ---------------------------------------------------------------------------
function parseBmoStatementTotals(text: string): { totalDeducted: number; totalAdded: number; source: string } | null {
  const parse = (s: string) => parseFloat(s.replace(/,/g, ''));

  const closingMatch = text.match(/closing\s+totals\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/i);
  if (closingMatch) {
    const totalDeducted = parse(closingMatch[1]);
    const totalAdded = parse(closingMatch[2]);
    if (Number.isFinite(totalDeducted) && Number.isFinite(totalAdded)) {
      return { totalDeducted, totalAdded, source: 'closing_totals' };
    }
  }

  const deductedMatch = text.match(/total\s+amounts?\s+deducted[:\s]+([\d,]+\.\d{2})/i);
  const addedMatch = text.match(/total\s+amounts?\s+added[:\s]+([\d,]+\.\d{2})/i);
  if (deductedMatch && addedMatch) {
    const totalDeducted = parse(deductedMatch[1]);
    const totalAdded = parse(addedMatch[1]);
    if (Number.isFinite(totalDeducted) && Number.isFinite(totalAdded)) {
      return { totalDeducted, totalAdded, source: 'separate_totals_lines' };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('FAIL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
    process.exit(1);
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // 1. Read PDF
  const pdfPath = path.resolve(PDF_PATH!);
  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF not found: ${pdfPath}`);
    process.exit(1);
  }
  console.log(`Reading PDF: ${pdfPath}`);
  const pdfBuffer = fs.readFileSync(pdfPath);

  // 2. Extract layout text
  console.log('Extracting text with layout extractor...');
  const ocrText = await extractPdfTextWithLayout(pdfBuffer);
  console.log(`Extracted ${ocrText.length} chars`);

  // Show excerpt to verify
  const lines = ocrText.split('\n').filter(l => l.trim());
  console.log('\nFirst 10 lines:');
  lines.slice(0, 10).forEach(l => console.log(' ', l));

  // 3. Extract closing totals
  const bmoTotals = parseBmoStatementTotals(ocrText);
  if (bmoTotals) {
    console.log(`\n✓ Found closing totals: deducted=$${bmoTotals.totalDeducted.toFixed(2)} added=$${bmoTotals.totalAdded.toFixed(2)} (${bmoTotals.source})`);
  } else {
    console.warn('\n⚠ No closing totals found in OCR text — will search for them');
    // Try to find the line manually
    const closingLine = lines.find(l => /closing\s+totals/i.test(l));
    if (closingLine) console.log('  Found line:', closingLine);
    else {
      const amountsLine = lines.find(l => /total\s+amounts/i.test(l));
      if (amountsLine) console.log('  Found amounts line:', amountsLine);
    }
  }

  // 4. Find import
  let importId = TARGET_IMPORT_ID;
  if (!importId) {
    console.log(`\nSearching for latest non-committed import for user ${USER_ID.slice(0, 8)}...`);
    const { data: imports, error } = await sb
      .from('imports')
      .select('id, status, created_at, document_id, statement_breakdown_json')
      .eq('user_id', USER_ID)
      .neq('status', 'committed')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Failed to fetch imports:', error.message);
      process.exit(1);
    }

    if (!imports || imports.length === 0) {
      console.error('No non-committed imports found for this user');
      process.exit(1);
    }

    console.log('Found imports:');
    imports.forEach((imp: any) => console.log(`  ${imp.id} status=${imp.status} created=${imp.created_at}`));
    importId = imports[0].id;
    console.log(`Using most recent: ${importId}`);
  }

  // 5. Check current staging rows
  const { count: stagingCount } = await sb
    .from('transactions_staging')
    .select('id', { count: 'exact', head: true })
    .eq('import_id', importId)
    .eq('user_id', USER_ID);
  console.log(`\nCurrent staging rows: ${stagingCount}`);

  if (DRY_RUN) {
    console.log('\nDRY RUN — stopping here. Would have:');
    console.log(`  - Cleared ${stagingCount} staging rows`);
    console.log('  - Re-run normalizeOcrResult with fixed extractMerchant');
    if (bmoTotals) console.log(`  - Written statementTotals {deducted: ${bmoTotals.totalDeducted}, added: ${bmoTotals.totalAdded}} to imports.statement_breakdown_json`);
    return;
  }

  // 6. If we have closing totals, store them immediately (even before re-normalization)
  //    This fixes the display totals right away.
  if (bmoTotals) {
    const { data: existingImport } = await sb
      .from('imports')
      .select('statement_breakdown_json')
      .eq('id', importId)
      .maybeSingle();
    const existingSbd =
      existingImport?.statement_breakdown_json && typeof existingImport.statement_breakdown_json === 'object'
        ? existingImport.statement_breakdown_json as Record<string, unknown>
        : {};

    const { error: totalsWriteErr } = await sb
      .from('imports')
      .update({
        statement_breakdown_json: { ...existingSbd, statementTotals: bmoTotals },
        updated_at: new Date().toISOString(),
      })
      .eq('id', importId);

    if (totalsWriteErr) {
      console.error('Failed to write statementTotals:', totalsWriteErr.message);
    } else {
      console.log('✓ Wrote statementTotals to imports.statement_breakdown_json');
    }
  }

  // 7. Re-run normalization with updated code
  console.log('\nRunning normalizeOcrResult with fixed code...');
  const { normalizeOcrResult } = await import('../netlify/functions/_shared/ocr_normalize.js');
  const normalizedTransactions: any[] = await normalizeOcrResult(ocrText, USER_ID, null, {
    filename: path.basename(pdfPath),
  });
  console.log(`Normalized ${normalizedTransactions.length} transactions`);

  if (normalizedTransactions.length === 0) {
    console.warn('⚠ No transactions found! Check OCR text quality.');
    return;
  }

  // Show sample
  console.log('\nSample transactions (first 5):');
  normalizedTransactions.slice(0, 5).forEach((tx: any) => {
    console.log(`  ${tx.date} | ${tx.merchant?.padEnd(30)} | ${tx.amount > 0 ? '+' : ''}${tx.amount.toFixed(2)}`);
  });

  // 8. Build staging rows
  const stagingRows = normalizedTransactions.map((tx: any) => {
    const hashInput = `${tx.date || ''}-${tx.amount || 0}-${tx.merchant || ''}`;
    const hash = createHash('sha256').update(hashInput).digest('hex').substring(0, 64);
    const rawAmount = Number(tx.amount || 0);
    const normalizedAmount = Math.abs(rawAmount);
    const type = rawAmount < 0 ? 'expense' : 'income';
    return {
      import_id: importId,
      user_id: USER_ID,
      data_json: {
        date: tx.date,
        posted_at: tx.date ? new Date(tx.date).toISOString() : new Date().toISOString(),
        merchant: tx.merchant,
        description: (tx as any).description || tx.merchant || 'Transaction',
        amount: normalizedAmount,
        type,
        currency: tx.currency || 'CAD',
        category: null,
        confidence: (tx as any).confidence ?? null,
        importRunId: importId,
        documentId: null,
      },
      hash,
    };
  });

  // Dedup by hash
  const dedupedMap = new Map<string, (typeof stagingRows)[number]>();
  for (const row of stagingRows) {
    const key = `${row.import_id}:${row.hash}`;
    if (!dedupedMap.has(key)) dedupedMap.set(key, row);
  }
  const dedupedRows = Array.from(dedupedMap.values());
  console.log(`\n${stagingRows.length} rows → ${dedupedRows.length} after dedup`);

  // Compute what the corrected totals will look like
  let spend = 0, income = 0;
  for (const r of dedupedRows) {
    const amt = Number(r.data_json.amount);
    if (r.data_json.type === 'income') income += amt; else spend += amt;
  }
  console.log(`Computed from staging: spend=$${spend.toFixed(2)} income=$${income.toFixed(2)}`);
  if (bmoTotals) {
    console.log(`Authoritative totals:  spend=$${bmoTotals.totalDeducted.toFixed(2)} income=$${bmoTotals.totalAdded.toFixed(2)}`);
  }

  // 9. Clear old staging rows
  console.log('\nClearing old staging rows...');
  const { error: deleteErr } = await sb
    .from('transactions_staging')
    .delete()
    .eq('import_id', importId)
    .eq('user_id', USER_ID);
  if (deleteErr) {
    console.error('Failed to delete staging rows:', deleteErr.message);
    process.exit(1);
  }
  console.log('✓ Cleared old staging rows');

  // 10. Insert new staging rows
  console.log('Inserting corrected staging rows...');
  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < dedupedRows.length; i += BATCH) {
    const batch = dedupedRows.slice(i, i + BATCH);
    const { error: upsertErr } = await sb
      .from('transactions_staging')
      .upsert(batch, { onConflict: 'import_id,hash', ignoreDuplicates: false });
    if (upsertErr) {
      console.error(`Batch ${i}-${i + BATCH} failed:`, upsertErr.message);
    } else {
      inserted += batch.length;
    }
  }
  console.log(`✓ Inserted ${inserted} staging rows`);

  // 11. Reset import status to 'parsed'
  await sb
    .from('imports')
    .update({ status: 'parsed', updated_at: new Date().toISOString() })
    .eq('id', importId);
  console.log('✓ Reset import status to parsed');

  console.log('\n✅ Done! Refresh the app to see corrected totals.');
  if (bmoTotals) {
    console.log(`   STATEMENT SNAPSHOT will now show:`);
    console.log(`   Total spend:   $${bmoTotals.totalDeducted.toFixed(2)}`);
    console.log(`   Total income:  $${bmoTotals.totalAdded.toFixed(2)}`);
    console.log(`   Transactions:  ${dedupedRows.length}`);
  }
}

main().catch((err: any) => {
  console.error('FATAL:', err?.message || String(err));
  process.exit(1);
});
