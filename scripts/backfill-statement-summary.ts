/**
 * Backfill Statement Summary Metadata
 *
 * For committed imports whose statement_breakdown_json lacks balance/payment data
 * (previous balance, new balance, min payment, due date, credit limit), this script:
 *
 *   1. Downloads the original PDF from Supabase Storage
 *   2. Extracts text with pdf-parse
 *   3. Runs parseStatementSummary regex extraction
 *   4. Writes results to user_documents.metadata.statement_summary
 *      (so the pipeline can use it on future commit-import runs)
 *   5. Patches top-level fields on imports.statement_breakdown_json immediately
 *      (renderStatementBreakdown checks top-level first, so this fixes existing imports)
 *
 * NOTE: imports.metadata column does not exist — user_documents.metadata is used instead.
 *
 * Usage:
 *   npx tsx scripts/backfill-statement-summary.ts
 *   npx tsx scripts/backfill-statement-summary.ts --import-id <uuid>
 *   npx tsx scripts/backfill-statement-summary.ts --user-id <uuid>
 *   npx tsx scripts/backfill-statement-summary.ts --dry-run
 */

import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
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
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

loadLocalEnvFiles();

// ---------------------------------------------------------------------------
// Parse CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const TARGET_IMPORT_ID = (() => {
  const idx = args.indexOf('--import-id');
  return idx !== -1 ? args[idx + 1] : undefined;
})();
const TARGET_USER_ID = (() => {
  const idx = args.indexOf('--user-id');
  return idx !== -1 ? args[idx + 1] : undefined;
})();

// ---------------------------------------------------------------------------
// parseStatementSummary — mirrors the function in normalize-transactions.ts
// ---------------------------------------------------------------------------
type ExtractedSummary = {
  docType: string;
  statement_period?: string;
  new_balance?: string;
  minimum_payment_due?: string;
  due_date?: string;
  previous_balance?: string;
  payments?: string;
  transactions?: string;
  interest_charged?: string;
  credit_limit?: string;
  available_credit?: string;
} | null;

function parseStatementSummary(text: string): ExtractedSummary {
  const normalized = text || '';
  const periodMatch = normalized.match(
    /Statement Period:\s*([A-Za-z]{3}\s+\d{1,2},\s*\d{4})\s*-\s*([A-Za-z]{3}\s+\d{1,2},\s*\d{4})/i
  );
  const newBalanceMatch = normalized.match(/New Balance\s*\$?([0-9,]+\.\d{2})/i);
  const minPaymentMatch = normalized.match(/Minimum Payment Due\s*\$?([0-9,]+\.\d{2})/i);
  const dueDateMatch = normalized.match(/Payment Due Date\s*([A-Za-z]{3,9}\s+\d{1,2},\s*\d{4})/i);
  const prevBalanceMatch = normalized.match(/Previous Balance\s*\$?([0-9,]+\.\d{2})/i);
  const paymentsMatch = normalized.match(/Payments\s*-?\s*\$?([0-9,]+\.\d{2})/i);
  const transactionsMatch = normalized.match(/Transactions\s*\+?\s*\$?([0-9,]+\.\d{2})/i);
  const interestMatch = normalized.match(/Interest Charged\s*\+?\s*\$?([0-9,]+\.\d{2})/i);
  const creditLimitMatch = normalized.match(/Credit Limit\s*\$?([0-9,]+\.\d{2})/i);
  const availableCreditMatch = normalized.match(/Available Credit\s*\$?([0-9,]+\.\d{2})/i);

  if (!periodMatch && !newBalanceMatch && !minPaymentMatch) {
    return null;
  }

  return {
    docType: 'statement',
    statement_period: periodMatch ? `${periodMatch[1]} - ${periodMatch[2]}` : undefined,
    new_balance: newBalanceMatch ? newBalanceMatch[1] : undefined,
    minimum_payment_due: minPaymentMatch ? minPaymentMatch[1] : undefined,
    due_date: dueDateMatch ? dueDateMatch[1] : undefined,
    previous_balance: prevBalanceMatch ? prevBalanceMatch[1] : undefined,
    payments: paymentsMatch ? paymentsMatch[1] : undefined,
    transactions: transactionsMatch ? transactionsMatch[1] : undefined,
    interest_charged: interestMatch ? interestMatch[1] : undefined,
    credit_limit: creditLimitMatch ? creditLimitMatch[1] : undefined,
    available_credit: availableCreditMatch ? availableCreditMatch[1] : undefined,
  };
}

function toMoney(val: string | undefined): number | null {
  if (!val) return null;
  const n = parseFloat(String(val).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Try to get statement_breakdown_json with schema-compatible selects
// ---------------------------------------------------------------------------
async function fetchImportBreakdown(
  sb: any,
  importId: string
): Promise<{ breakdownJson: Record<string, any> | null; breakdownColumn: string | null }> {
  // Try statement_breakdown_json first (Strategy A1)
  const { data: a1, error: a1Err } = await sb
    .from('imports')
    .select('id, user_id, document_id, status, statement_breakdown_json')
    .eq('id', importId)
    .maybeSingle();
  if (!a1Err && a1) {
    return {
      breakdownJson: a1.statement_breakdown_json && typeof a1.statement_breakdown_json === 'object'
        ? a1.statement_breakdown_json
        : null,
      breakdownColumn: 'statement_breakdown_json',
    };
  }
  // Try statement_breakdown (Strategy A2)
  const { data: a2, error: a2Err } = await sb
    .from('imports')
    .select('id, user_id, document_id, status, statement_breakdown')
    .eq('id', importId)
    .maybeSingle();
  if (!a2Err && a2) {
    return {
      breakdownJson: a2.statement_breakdown && typeof a2.statement_breakdown === 'object'
        ? a2.statement_breakdown
        : null,
      breakdownColumn: 'statement_breakdown',
    };
  }
  return { breakdownJson: null, breakdownColumn: null };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY =
    process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('FAIL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE in env');
    process.exit(1);
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // Build query — only columns we know exist
  let query = sb
    .from('imports')
    .select('id, user_id, document_id, status, statement_breakdown_json')
    .eq('status', 'committed');

  if (TARGET_IMPORT_ID) {
    query = query.eq('id', TARGET_IMPORT_ID);
  } else if (TARGET_USER_ID) {
    query = query.eq('user_id', TARGET_USER_ID);
  }

  const { data: imports, error: importsError } = await query
    .order('created_at', { ascending: false })
    .limit(20);

  if (importsError) {
    // If statement_breakdown_json column doesn't exist, try without it
    if (String(importsError.message || '').includes('statement_breakdown_json')) {
      console.warn('statement_breakdown_json column not found, retrying without it…');
      let q2 = sb.from('imports').select('id, user_id, document_id, status').eq('status', 'committed');
      if (TARGET_IMPORT_ID) q2 = q2.eq('id', TARGET_IMPORT_ID);
      if (TARGET_USER_ID) q2 = q2.eq('user_id', TARGET_USER_ID);
      const { data: imports2, error: e2 } = await q2.order('created_at', { ascending: false }).limit(20);
      if (e2) {
        console.error('FAIL: Could not fetch imports:', e2.message);
        process.exit(1);
      }
      await processImports(sb, imports2 || [], DRY_RUN);
      return;
    }
    console.error('FAIL: Could not fetch imports:', importsError.message);
    process.exit(1);
  }

  await processImports(sb, imports || [], DRY_RUN);
}

async function processImports(sb: any, imports: any[], dryRun: boolean): Promise<void> {
  if (imports.length === 0) {
    console.log('No committed imports found matching criteria.');
    return;
  }

  console.log(`Found ${imports.length} committed import(s) to check.\n`);

  let patched = 0;
  let skipped = 0;

  for (const imp of imports) {
    const importId = imp.id as string;
    const userId = imp.user_id as string;
    const documentId = imp.document_id as string | null;

    // Get the existing breakdown (handles both column variants)
    const { breakdownJson: existingBreakdown, breakdownColumn } = await fetchImportBreakdown(sb, importId);
    const bd = existingBreakdown || {};

    // Skip if top-level balance already populated (any variant)
    const alreadyHasBalance =
      bd.previous_balance != null ||
      bd.new_balance != null ||
      bd?.account_summary?.new_balance != null;

    if (alreadyHasBalance) {
      console.log(`[${importId}] SKIP — balance fields already present`);
      skipped++;
      continue;
    }

    console.log(`[${importId}] Processing import for user ${userId.slice(0, 8)}…, document ${documentId || 'NONE'}`);

    if (!documentId) {
      console.warn(`[${importId}] No document_id — skipping`);
      skipped++;
      continue;
    }

    // Fetch document storage path
    const { data: doc, error: docError } = await sb
      .from('user_documents')
      .select('id, storage_path, mime_type, original_name, metadata')
      .eq('id', documentId)
      .maybeSingle();

    if (docError || !doc) {
      console.warn(`[${importId}] Could not fetch document: ${docError?.message || 'not found'}`);
      skipped++;
      continue;
    }

    const storagePath = doc.storage_path as string | null;
    if (!storagePath) {
      console.warn(`[${importId}] Document has no storage_path — skipping`);
      skipped++;
      continue;
    }

    console.log(`[${importId}] Downloading ${storagePath}…`);

    // Download original PDF
    const { data: fileData, error: downloadError } = await sb.storage
      .from('docs')
      .download(storagePath);

    if (downloadError || !fileData) {
      console.warn(`[${importId}] Download failed: ${downloadError?.message || 'no data'}`);
      skipped++;
      continue;
    }

    // Convert Blob to Buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // Extract text
    let rawText = '';
    const mimeType = String(doc.mime_type || '');
    if (mimeType === 'application/pdf' || storagePath.toLowerCase().endsWith('.pdf')) {
      try {
        const pdfParseMod: any = await import('pdf-parse');
        const pdfParseFn = pdfParseMod?.default ?? pdfParseMod;
        const parseResult = await pdfParseFn(pdfBuffer);
        rawText = (parseResult?.text || '').trim();
        console.log(`[${importId}] Extracted ${rawText.length} chars from PDF`);
      } catch (pdfErr: any) {
        console.warn(`[${importId}] pdf-parse failed: ${pdfErr?.message}`);
        rawText = '';
      }
    } else {
      console.log(`[${importId}] Non-PDF mime ${mimeType} — skipping text extraction`);
    }

    if (!rawText.trim()) {
      console.warn(`[${importId}] No text extracted — skipping`);
      skipped++;
      continue;
    }

    // Parse balance fields
    const rawSummary = parseStatementSummary(rawText);
    if (!rawSummary) {
      console.warn(`[${importId}] No balance markers found in extracted text`);
      console.log(`[${importId}] Text excerpt (first 600 chars):\n${rawText.slice(0, 600)}`);
      skipped++;
      continue;
    }

    const accountSummary = {
      previous_balance: toMoney(rawSummary.previous_balance),
      new_balance: toMoney(rawSummary.new_balance),
      minimum_payment_due: toMoney(rawSummary.minimum_payment_due),
      due_date: rawSummary.due_date || null,
      credit_limit: toMoney(rawSummary.credit_limit),
      available_credit: toMoney(rawSummary.available_credit),
    };

    const hasSomeValue = Object.values(accountSummary).some((v) => v !== null);
    if (!hasSomeValue) {
      console.warn(`[${importId}] Parsed summary has all-null values — skipping`);
      skipped++;
      continue;
    }

    console.log(`[${importId}] Parsed:`, accountSummary);

    if (dryRun) {
      console.log(`[${importId}] DRY RUN — would write to user_documents.metadata and patch statement_breakdown_json`);
      patched++;
      continue;
    }

    // 1. Write to user_documents.metadata.statement_summary
    try {
      const existingDocMeta =
        doc.metadata && typeof doc.metadata === 'object'
          ? (doc.metadata as Record<string, unknown>)
          : {};
      const { error: docMetaErr } = await sb
        .from('user_documents')
        .update({ metadata: { ...existingDocMeta, statement_summary: accountSummary } })
        .eq('id', documentId);
      if (docMetaErr) {
        console.warn(`[${importId}] user_documents.metadata write failed: ${docMetaErr.message}`);
      } else {
        console.log(`[${importId}] ✓ Wrote user_documents.metadata.statement_summary`);
      }
    } catch (e: any) {
      console.warn(`[${importId}] user_documents.metadata write threw: ${e?.message}`);
    }

    // 2. Patch imports.statement_breakdown_json with top-level balance fields
    //    (renderStatementBreakdown checks top-level keys first:
    //     ['previous_balance', 'statement_math.previous_balance', 'account_summary.previous_balance'])
    const patchedBreakdown: Record<string, any> = { ...bd };
    if (accountSummary.previous_balance !== null && patchedBreakdown.previous_balance == null)
      patchedBreakdown.previous_balance = accountSummary.previous_balance;
    if (accountSummary.new_balance !== null && patchedBreakdown.new_balance == null)
      patchedBreakdown.new_balance = accountSummary.new_balance;
    if (accountSummary.minimum_payment_due !== null && patchedBreakdown.minimum_payment_due == null)
      patchedBreakdown.minimum_payment_due = accountSummary.minimum_payment_due;
    if (accountSummary.due_date !== null && patchedBreakdown.due_date == null)
      patchedBreakdown.due_date = accountSummary.due_date;
    if (accountSummary.credit_limit !== null && patchedBreakdown.credit_limit == null)
      patchedBreakdown.credit_limit = accountSummary.credit_limit;
    if (accountSummary.available_credit !== null && patchedBreakdown.available_credit == null)
      patchedBreakdown.available_credit = accountSummary.available_credit;
    // Also store nested under account_summary for the new pipeline path
    patchedBreakdown.account_summary = accountSummary;

    const writeColumn = breakdownColumn || 'statement_breakdown_json';
    const { data: updateRows, error: breakdownErr } = await sb
      .from('imports')
      .update({ [writeColumn]: patchedBreakdown, updated_at: new Date().toISOString() })
      .eq('id', importId)
      .eq('user_id', userId)
      .select('id');

    if (breakdownErr) {
      // If column doesn't exist, try import_summaries
      if (String(breakdownErr.message || '').includes('does not exist')) {
        console.warn(`[${importId}] ${writeColumn} missing, trying import_summaries…`);
        const { error: summaryErr } = await sb
          .from('import_summaries')
          .upsert(
            { import_id: importId, user_id: userId, statement_breakdown_json: patchedBreakdown, employee: 'prime', version: 1 },
            { onConflict: 'import_id,user_id,version' }
          );
        if (summaryErr) {
          console.error(`[${importId}] import_summaries upsert also failed: ${summaryErr.message}`);
        } else {
          console.log(`[${importId}] ✓ Patched import_summaries.statement_breakdown_json`);
          patched++;
        }
      } else {
        console.error(`[${importId}] Failed to patch ${writeColumn}: ${breakdownErr.message}`);
      }
    } else if (!Array.isArray(updateRows) || updateRows.length === 0) {
      console.warn(`[${importId}] UPDATE matched 0 rows for import ${importId} — trying import_summaries`);
      const { error: summaryErr } = await sb
        .from('import_summaries')
        .upsert(
          { import_id: importId, user_id: userId, statement_breakdown_json: patchedBreakdown, employee: 'prime', version: 1 },
          { onConflict: 'import_id,user_id,version' }
        );
      if (summaryErr) {
        console.error(`[${importId}] import_summaries upsert failed: ${summaryErr.message}`);
      } else {
        console.log(`[${importId}] ✓ Patched import_summaries.statement_breakdown_json`);
        patched++;
      }
    } else {
      console.log(`[${importId}] ✓ Patched imports.${writeColumn} with balance fields`);
      patched++;
    }

    console.log();
  }

  console.log(`\nDone. Patched: ${patched}, Skipped: ${skipped}`);
  if (dryRun) console.log('(dry-run mode — no changes were written)');
}

main().catch((err: any) => {
  console.error('FATAL:', err?.message || String(err));
  process.exit(1);
});
