/**
 * One-shot script: apply Tag rule-based categorization to all committed
 * transactions with category = 'Other' for user Darrell.
 *
 * Usage: node scripts/run-tag-categorize.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Parse .env.local manually (dotenv may not be installed at top level)
const envText = readFileSync('.env.local', 'utf8');
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const USER_ID = '938a2e17-0e49-45ff-bb98-810db46e5e65';

const RULES = [
  { contains: ['starbucks', 'tim horton', 'second cup'], category: 'Food & Dining' },
  { contains: ['uber', 'lyft', 'taxi', 'transit', 'presto'], category: 'Transportation' },
  { contains: ['amazon', 'amzn'], category: 'Shopping' },
  { contains: ['insurance', 'assurance', 'allstate', 'intact'], category: 'Insurance' },
  { contains: ['telus', 'rogers', 'bell ', 'hydro', 'internet', 'fido', 'koodo'], category: 'Utilities' },
  { contains: ['payroll', 'salary', 'direct dep', 'employment'], category: 'Income' },
  { contains: ['transfer', 'e-transfer', 'etransfer', 'interac'], category: 'Transfers' },
  { contains: ['gas', 'petro', 'shell', 'esso', 'fuel', 'husky', 'irving'], category: 'Transportation' },
  { contains: ['walmart', 'costco', 'kroger', 'safeway', 'sobeys', 'superstore', 'loblaws', 'metro ', 'iga ', 'food basics'], category: 'Groceries' },
  { contains: ['mcdonald', 'restaurant', 'cafe', 'doordash', 'ubereats', 'skip the dishes', 'skip dish', 'pizza', 'sushi', 'burger', 'chicken', 'grill', 'pub '], category: 'Food & Dining' },
  { contains: ['best buy', 'apple store', 'ebay', 'staples', 'the source'], category: 'Shopping' },
  { contains: ['netflix', 'spotify', 'disney', 'hulu', 'prime video', 'apple tv', 'crave', 'dazn'], category: 'Subscriptions' },
  { contains: ['rent', 'lease ', 'mortgage', 'condo fee', 'strata'], category: 'Housing' },
  { contains: ['doctor', 'pharmacy', 'hospital', 'medical', 'dental', 'clinic', 'shoppers drug', 'rexall', 'pharma'], category: 'Healthcare' },
  { contains: ['atm', 'cash withdrawal', 'atm withdrawal'], category: 'Transfers' },
  { contains: ['parking', 'park lot', 'parkade', 'impark', 'indigo park'], category: 'Transportation' },
  { contains: ['bank fee', 'service fee', 'service charge', 'monthly fee', 'overdraft', 'nsf fee', 'foreign currency', 'conversion fee', 'administration fee', 'admin fee', 'account fee'], category: 'Bank Fees' },
  { contains: ['gym', 'fitness', 'yoga', 'crossfit', 'goodlife', 'ymca', 'anytime fitness'], category: 'Personal Care' },
  { contains: ['school', 'tuition', 'university', 'college', 'course', 'udemy', 'coursera'], category: 'Education' },
  { contains: ['travel', 'hotel', 'airbnb', 'expedia', 'air canada', 'westjet', 'united', 'delta'], category: 'Travel' },
  { contains: ['zara', 'h&m', 'uniqlo', 'gap ', 'old navy', 'winners', 'marshalls', 'reitmans', 'sport chek'], category: 'Shopping' },
  { contains: ['hair design', 'hair salon', 'salon', 'barber', 'patalaro', 'spa ', 'nails', 'wax'], category: 'Personal Care' },
  { contains: ['cursor', 'notion', 'figma', 'github', 'copilot', 'jetbrains', 'vercel'], category: 'Subscriptions' },
  { contains: ['apple.com', 'apple one', 'icloud'], category: 'Subscriptions' },
  { contains: ['home depot', 'home hardware', 'rona', 'lowes', 'canadian tire'], category: 'Home & Garden' },
  { contains: ['balanceprotector', 'balance protector', 'credit protect'], category: 'Bank Fees' },
  { contains: ['primevideo', 'prime video'], category: 'Subscriptions' },
  { contains: ['payment'], category: 'Income' },
  { contains: ['ind all saving', 'b/m payt', 'b/m pay', 'td loan', 'celtic group', 'easyfinancial', 'national money', 'lenddirect', 'lend direct', 'fairstone', 'money mart', 'cash money', 'cash store'], category: 'Transfers' },
  { contains: ['openai', 'chatgpt', 'anthropic', 'claude', 'replit', 'heroku', 'netlify', 'supabase', 'digitalocean', 'aws ', 'cloudflare'], category: 'Subscriptions' },
  { contains: ['la fitness', 'planet fitness', 'fit4less', 'world gym', 'movati'], category: 'Personal Care' },
  { contains: ['unimeal', 'noom', 'myfitnesspal', 'weight watchers', 'ww '], category: 'Subscriptions' },
  { contains: ['fastmail', 'paddle.net', 'protonmail', 'mailchimp', 'sendgrid'], category: 'Subscriptions' },
  { contains: ['hair cut', 'haircut', 'beauty', 'aesthet', 'lash', 'brow', 'massage', 'chiropr', 'physio', 'osteo'], category: 'Personal Care' },
];

function applyRules(merchant) {
  const lower = merchant.toLowerCase();
  for (const rule of RULES) {
    if (rule.contains.some(k => lower.includes(k))) return rule.category;
  }
  return null;
}

function normalizeVendorKey(s) {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

async function main() {
  // 1. Fetch ALL transactions (re-categorize everything with canonical categories)
  const { data: rows, error } = await supabase
    .from('transactions')
    .select('id, merchant_name, merchant, category')
    .eq('user_id', USER_ID)
    .order('posted_at', { ascending: false })
    .limit(500);

  if (error) { console.error('Fetch error:', error.message); process.exit(1); }
  console.log(`Found ${rows.length} uncategorized/Other transactions`);

  if (rows.length === 0) { console.log('Nothing to categorize.'); return; }

  // 2. Fetch vendor memory
  const vendorKeys = rows.map(tx => normalizeVendorKey(tx.merchant_name || tx.merchant || ''));
  const uniqueKeys = [...new Set(vendorKeys.filter(Boolean))];
  const memoryMap = new Map();

  if (uniqueKeys.length > 0) {
    const { data: memoryRows } = await supabase
      .from('vendor_category_memory')
      .select('vendor_key, category')
      .eq('user_id', USER_ID)
      .in('vendor_key', uniqueKeys);
    for (const row of memoryRows || []) {
      memoryMap.set(row.vendor_key, row.category);
    }
    console.log(`Vendor memory: ${memoryMap.size} matches`);
  }

  // 3. Fetch user DB rules
  let dbRules = [];
  try {
    const { data: ruleRows } = await supabase
      .from('category_rules')
      .select('match_type, match_value, category')
      .eq('user_id', USER_ID)
      .eq('is_active', true);
    const TYPE_PRIORITY = { exact: 0, starts_with: 1, contains: 2, regex: 3 };
    dbRules = (ruleRows || []).sort(
      (a, b) => (TYPE_PRIORITY[a.match_type] ?? 9) - (TYPE_PRIORITY[b.match_type] ?? 9)
    );
    console.log(`DB rules: ${dbRules.length}`);
  } catch { console.log('No category_rules table, skipping'); }

  function applyDbRules(merchant) {
    const lower = merchant.toLowerCase();
    for (const rule of dbRules) {
      const val = rule.match_value.toLowerCase();
      if (rule.match_type === 'exact' && lower === val) return rule.category;
      if (rule.match_type === 'starts_with' && lower.startsWith(val)) return rule.category;
      if (rule.match_type === 'contains' && lower.includes(val)) return rule.category;
      if (rule.match_type === 'regex') {
        try { if (new RegExp(rule.match_value, 'i').test(merchant)) return rule.category; } catch {}
      }
    }
    return null;
  }

  // 4. Categorize
  const updates = [];
  const stillOther = [];
  for (let i = 0; i < rows.length; i++) {
    const tx = rows[i];
    const merchant = tx.merchant_name || tx.merchant || '';
    const key = vendorKeys[i];

    // Memory first
    const memoryCat = key ? memoryMap.get(key) : undefined;
    if (memoryCat) {
      updates.push({ id: tx.id, category: memoryCat, source: 'learned', merchant });
      continue;
    }
    // DB rules
    const dbMatch = applyDbRules(merchant);
    if (dbMatch) {
      updates.push({ id: tx.id, category: dbMatch, source: 'db_rule', merchant });
      continue;
    }
    // Inline rules
    const ruleCat = applyRules(merchant);
    if (ruleCat) {
      updates.push({ id: tx.id, category: ruleCat, source: 'rule', merchant });
    } else {
      // No rule matched — assign canonical 'Other' (replacing non-canonical categories)
      updates.push({ id: tx.id, category: 'Other', source: 'rule', merchant });
      stillOther.push(merchant);
    }
  }

  console.log(`\nWill categorize: ${updates.length} / ${rows.length}`);
  console.log(`Still uncategorized: ${stillOther.length}`);

  // Show what will be categorized
  const byCat = {};
  for (const u of updates) {
    byCat[u.category] = (byCat[u.category] || 0) + 1;
  }
  console.log('\nCategory breakdown:');
  for (const [cat, count] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }

  if (stillOther.length > 0) {
    console.log('\nStill Other (no rule match):');
    for (const m of [...new Set(stillOther)].slice(0, 30)) {
      console.log(`  - "${m}"`);
    }
  }

  // 5. Apply updates
  let updated = 0;
  const BATCH = 50;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(u =>
        supabase
          .from('transactions')
          .update({
            category: u.category,
            category_source: u.source,
            updated_at: new Date().toISOString(),
          })
          .eq('id', u.id)
          .eq('user_id', USER_ID)
      )
    );
    updated += results.filter(r => r.status === 'fulfilled' && !r.value.error).length;
    process.stdout.write(`\rUpdated ${updated}/${updates.length}...`);
  }

  console.log(`\n\nDone! Updated ${updated} transactions.`);
}

main().catch(e => { console.error(e); process.exit(1); });
