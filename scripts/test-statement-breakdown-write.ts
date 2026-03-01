/**
 * Test that the migration worked:
 * 1. Find the most recent committed import for the user
 * 2. Write a test breakdown to imports.statement_breakdown_json
 * 3. Read it back to confirm the write succeeded
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const USER_ID = '938a2e17-0e49-45ff-bb98-810db46e5e65';

async function main() {
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // 1. Find the most recent committed import
  const { data: imports, error: fetchErr } = await sb
    .from('imports')
    .select('id, user_id, status, statement_breakdown_json')
    .eq('user_id', USER_ID)
    .eq('status', 'committed')
    .order('created_at', { ascending: false })
    .limit(1);

  if (fetchErr) {
    console.error('FAIL: Could not fetch imports:', fetchErr.message);
    process.exit(1);
  }
  if (!imports || imports.length === 0) {
    console.error('FAIL: No committed imports found for this user');
    process.exit(1);
  }

  const imp = imports[0];
  console.log(`Found import: ${imp.id} (status: ${imp.status})`);
  console.log(`Existing statement_breakdown_json: ${imp.statement_breakdown_json ? 'PRESENT' : 'NULL'}`);

  // 2. Write a test payload
  const testPayload = { _test: true, written_at: new Date().toISOString() };
  const { data: updated, error: writeErr } = await sb
    .from('imports')
    .update({ statement_breakdown_json: testPayload })
    .eq('id', imp.id)
    .eq('user_id', USER_ID)
    .select('id');

  if (writeErr) {
    console.error('FAIL: Write error:', writeErr.message, writeErr.code);
    process.exit(1);
  }
  if (!updated || updated.length === 0) {
    console.error('FAIL: Write returned 0 rows — column may still be missing or WHERE mismatch');
    process.exit(1);
  }
  console.log(`Write succeeded — ${updated.length} row(s) updated`);

  // 3. Read it back
  const { data: verify, error: verifyErr } = await sb
    .from('imports')
    .select('id, statement_breakdown_json')
    .eq('id', imp.id)
    .maybeSingle();

  if (verifyErr) {
    console.error('FAIL: Read-back error:', verifyErr.message);
    process.exit(1);
  }

  const json = verify?.statement_breakdown_json;
  if (json && (json as any)._test === true) {
    console.log('PASS: statement_breakdown_json round-trip confirmed');
    console.log('  Value:', JSON.stringify(json));
  } else {
    console.error('FAIL: Read-back did not match written value:', JSON.stringify(json));
    process.exit(1);
  }

  // 4. Restore original value (null if it was null before)
  await sb
    .from('imports')
    .update({ statement_breakdown_json: imp.statement_breakdown_json ?? null })
    .eq('id', imp.id)
    .eq('user_id', USER_ID);
  console.log('Restored original value');
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
