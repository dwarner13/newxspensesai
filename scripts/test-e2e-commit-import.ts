/**
 * End-to-end test for the commit-import fix.
 *
 * Creates a synthetic import + staging rows → calls commit-import →
 * verifies statement_breakdown_json was written to the imports table.
 *
 * Cleans up after itself.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const USER_ID = '938a2e17-0e49-45ff-bb98-810db46e5e65';
const BASE = 'http://localhost:8888';

async function main() {
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // ── 1. Create a synthetic import record ──────────────────────────────────
  const { data: imp, error: impErr } = await sb
    .from('imports')
    .insert({
      user_id: USER_ID,
      file_url: 'test/e2e-test-import.pdf',
      file_type: 'pdf',
      status: 'parsed',
      approved_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (impErr || !imp) {
    console.error('FAIL: Could not create import:', impErr?.message);
    process.exit(1);
  }
  const importId = imp.id as string;
  console.log(`Created import: ${importId}`);

  // ── 2. Insert staging transactions ───────────────────────────────────────
  const stagingRows = [
    { import_id: importId, occurred_at: '2026-01-05', description: 'Tim Hortons',   amount: -4.75,   hash: `e2e-${importId}-1` },
    { import_id: importId, occurred_at: '2026-01-08', description: 'Amazon',        amount: -89.99,  hash: `e2e-${importId}-2` },
    { import_id: importId, occurred_at: '2026-01-12', description: 'Payroll',       amount: 2400.00, hash: `e2e-${importId}-3` },
    { import_id: importId, occurred_at: '2026-01-15', description: 'Netflix',       amount: -17.99,  hash: `e2e-${importId}-4` },
    { import_id: importId, occurred_at: '2026-01-20', description: 'Grocery Store', amount: -123.45, hash: `e2e-${importId}-5` },
  ];

  const { error: stagingErr } = await sb.from('transactions_staging').insert(stagingRows);
  if (stagingErr) {
    console.error('FAIL: Could not insert staging rows:', stagingErr.message);
    await cleanup(sb, importId);
    process.exit(1);
  }
  console.log(`Inserted ${stagingRows.length} staging rows`);

  // ── 3. Call commit-import via the dev server ──────────────────────────────
  console.log('Calling commit-import...');
  let commitRes: any;
  try {
    const res = await fetch(`${BASE}/.netlify/functions/commit-import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': USER_ID,
      },
      body: JSON.stringify({ importId }),
      signal: AbortSignal.timeout(30000),
    });
    commitRes = await res.json();
    console.log('commit-import status:', res.status);
    console.log('commit-import response:', JSON.stringify(commitRes, null, 2));
  } catch (err: any) {
    console.error('FAIL: commit-import HTTP call failed:', err.message);
    await cleanup(sb, importId);
    process.exit(1);
  }

  if (!commitRes?.success && !commitRes?.ok) {
    console.error('FAIL: commit-import returned failure');
    await cleanup(sb, importId);
    process.exit(1);
  }

  // ── 4. Verify statement_breakdown_json was written ────────────────────────
  const { data: verify, error: verifyErr } = await sb
    .from('imports')
    .select('id, status, statement_breakdown_json')
    .eq('id', importId)
    .single();

  if (verifyErr) {
    console.error('FAIL: Could not read back import:', verifyErr.message);
    await cleanup(sb, importId);
    process.exit(1);
  }

  console.log('\n── Results ──────────────────────────────────');
  console.log('status:', verify?.status);
  console.log('statement_breakdown_json present:', !!verify?.statement_breakdown_json);

  const bd = verify?.statement_breakdown_json as any;
  if (bd) {
    console.log('  version:', bd.version);
    console.log('  totals:', JSON.stringify(bd.totals));
    console.log('  categories:', bd.category_totals?.length ?? 0);
    console.log('  top_merchants:', bd.top_merchants?.length ?? 0);
    console.log('  transactions:', bd.transactions?.length ?? 0);
    console.log('\nPASS: statement_breakdown_json written successfully');
  } else {
    console.error('FAIL: statement_breakdown_json is NULL after commit');
  }

  await cleanup(sb, importId);
}

async function cleanup(sb: any, importId: string) {
  console.log('\nCleaning up test data...');
  await sb.from('transactions').delete().eq('import_id', importId);
  await sb.from('transactions_staging').delete().eq('import_id', importId);
  await sb.from('imports').delete().eq('id', importId);
  console.log('Cleaned up.');
}

main().catch(err => { console.error('Unexpected error:', err); process.exit(1); });
