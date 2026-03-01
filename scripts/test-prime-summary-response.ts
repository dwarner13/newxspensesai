/**
 * Verify the prime-summary fix by checking what data is available
 * for the known import and simulating the response path.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const IMPORT_ID = 'd9ba8c27-dddf-4b64-99db-33621ddca6d6';
const USER_ID = '938a2e17-0e49-45ff-bb98-810db46e5e65';

async function main() {
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // Check what prime-summary would find
  const { data: imp, error } = await sb
    .from('imports')
    .select('id, status, statement_breakdown_json, document_id')
    .eq('id', IMPORT_ID)
    .eq('user_id', USER_ID)
    .maybeSingle();

  if (error) { console.error('Query error:', error.message); process.exit(1); }
  if (!imp) { console.error('Import not found'); process.exit(1); }

  console.log('Import status:', imp.status);
  console.log('statement_breakdown_json present:', !!imp.statement_breakdown_json);

  const bd = imp.statement_breakdown_json;
  if (bd && typeof bd === 'object') {
    console.log('\nBreakdown keys:', Object.keys(bd));
    console.log('version:', (bd as any).version);
    console.log('totals:', JSON.stringify((bd as any).totals, null, 2));
    const txns = (bd as any).transactions;
    console.log('transactions count:', Array.isArray(txns) ? txns.length : 'none');
    const cats = (bd as any).category_totals;
    console.log('category_totals count:', Array.isArray(cats) ? cats.length : 'none');
  }

  // Check transaction count directly
  const { count } = await sb
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('import_id', IMPORT_ID);
  console.log('\nActual transaction count in DB:', count);

  // Determine which path prime-summary would take
  const hasAnalytics = bd && typeof bd === 'object' &&
    (Array.isArray((bd as any).transactions) && (bd as any).transactions.length > 0 ||
     (bd as any).totals != null);

  console.log('\nprime-summary would use:', hasAnalytics ? 'renderPrimeNarrativeV1 (full analytics)' : 'fallback text');
  if (!hasAnalytics) {
    const txLabel = `${count} transactions`;
    console.log('\nNew fallback would show:');
    console.log(`  "${txLabel} imported from [document name]"`);
    console.log('  "- ' + txLabel + ' imported and categorized."');
    console.log('  "- Ask me which merchants appeared most often this period."');
    console.log('  "- Ask me for a spending breakdown by category."');
    console.log('  "- Flag any unfamiliar charges and I can help you review them."');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
