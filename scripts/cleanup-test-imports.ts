/**
 * cleanup-test-imports.ts
 *
 * Deletes all non-committed imports and their associated data for the user.
 * Leaves committed imports and their transactions completely untouched.
 *
 * Run with --dry-run first to preview what will be deleted.
 * Remove --dry-run to actually delete.
 *
 * Usage:
 *   npx tsx scripts/cleanup-test-imports.ts --dry-run
 *   npx tsx scripts/cleanup-test-imports.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const USER_ID = '938a2e17-0e49-45ff-bb98-810db46e5e65';
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  console.log(DRY_RUN ? '=== DRY RUN — nothing will be deleted ===' : '=== LIVE RUN — deleting data ===');
  console.log();

  // ── 1. Find all non-committed imports ────────────────────────────────────
  const { data: imports, error: importsErr } = await sb
    .from('imports')
    .select('id, status, file_url, created_at')
    .eq('user_id', USER_ID)
    .neq('status', 'committed')
    .order('created_at', { ascending: false });

  if (importsErr) { console.error('FAIL fetching imports:', importsErr.message); process.exit(1); }
  if (!imports || imports.length === 0) { console.log('Nothing to clean up — no non-committed imports found.'); return; }

  console.log(`Found ${imports.length} non-committed import(s) to delete:`);
  imports.forEach(r => {
    const fname = (r.file_url || '').split('/').pop() || 'unknown';
    console.log(`  ${r.created_at.slice(0, 10)}  ${r.status.padEnd(14)}  ${fname.slice(0, 60)}`);
  });
  console.log();

  const importIds = imports.map(r => r.id as string);

  // ── 2. Count staging rows that will be deleted ───────────────────────────
  const { count: stagingCount } = await sb
    .from('transactions_staging')
    .select('id', { count: 'exact', head: true })
    .in('import_id', importIds);
  console.log(`Staging rows to delete: ${stagingCount ?? 0}`);

  // ── 3. Find orphaned documents (not linked to any committed import) ───────
  const { data: committedImports } = await sb
    .from('imports')
    .select('document_id')
    .eq('user_id', USER_ID)
    .eq('status', 'committed')
    .not('document_id', 'is', null);

  const committedDocIds = new Set((committedImports || []).map(r => r.document_id as string));

  const { data: allDocs } = await sb
    .from('user_documents')
    .select('id, original_name, status, created_at')
    .eq('user_id', USER_ID);

  const orphanDocs = (allDocs || []).filter(d => !committedDocIds.has(d.id));
  console.log(`\nOrphan documents to delete (${orphanDocs.length}):`);
  orphanDocs.forEach(d => {
    console.log(`  ${d.created_at.slice(0, 10)}  ${(d.status || '').padEnd(14)}  ${(d.original_name || 'unknown').slice(0, 60)}`);
  });

  const orphanDocIds = orphanDocs.map(d => d.id as string);

  // ── 4. Safety check ───────────────────────────────────────────────────────
  const { count: txCount } = await sb
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', USER_ID);
  console.log(`\nTransactions that will be KEPT: ${txCount} (untouched)`);

  const { data: keptImports } = await sb
    .from('imports')
    .select('id, file_url, created_at')
    .eq('user_id', USER_ID)
    .eq('status', 'committed');
  console.log(`Committed imports that will be KEPT: ${keptImports?.length ?? 0}`);
  keptImports?.forEach(r => {
    const fname = (r.file_url || '').split('/').pop() || 'unknown';
    console.log(`  ${r.created_at.slice(0, 10)}  ${fname.slice(0, 60)}`);
  });

  if (DRY_RUN) {
    console.log('\nDry run complete — re-run without --dry-run to delete.');
    return;
  }

  // ── 5. Delete in batches (Supabase URL limit ~2000 chars) ────────────────
  console.log('\nDeleting...');

  const BATCH = 50;

  async function batchDelete(table: string, column: string, ids: string[], extraFilter?: (q: any) => any) {
    let deleted = 0;
    for (let i = 0; i < ids.length; i += BATCH) {
      const chunk = ids.slice(i, i + BATCH);
      let q = sb.from(table).delete().in(column, chunk);
      if (extraFilter) q = extraFilter(q);
      const { error } = await q;
      if (error) { console.warn(`  ${table} batch delete error (chunk ${i}):`, error.message); }
      else deleted += chunk.length;
    }
    return deleted;
  }

  if (stagingCount && stagingCount > 0) {
    const n = await batchDelete('transactions_staging', 'import_id', importIds);
    console.log(`  ✓ Deleted ~${n} staging rows`);
  }

  if (importIds.length > 0) {
    const n = await batchDelete('imports', 'id', importIds, q => q.eq('user_id', USER_ID));
    console.log(`  ✓ Deleted ${n} imports`);
  }

  if (orphanDocIds.length > 0) {
    const n = await batchDelete('user_documents', 'id', orphanDocIds, q => q.eq('user_id', USER_ID));
    console.log(`  ✓ Deleted ${n} orphan documents`);
  }

  // ── 6. Verify ─────────────────────────────────────────────────────────────
  console.log('\n── Verification ─────────────────────────────────────');
  const { count: remainingImports } = await sb.from('imports').select('id', { count: 'exact', head: true }).eq('user_id', USER_ID);
  const { count: remainingTx } = await sb.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', USER_ID);
  const { count: remainingDocs } = await sb.from('user_documents').select('id', { count: 'exact', head: true }).eq('user_id', USER_ID);
  console.log(`Imports remaining:     ${remainingImports}`);
  console.log(`Transactions remaining: ${remainingTx}  (should be unchanged)`);
  console.log(`Documents remaining:    ${remainingDocs}`);
  console.log('\nDone.');
}

main().catch(err => { console.error('Unexpected error:', err); process.exit(1); });
