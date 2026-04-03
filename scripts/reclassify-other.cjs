const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// ── Load .env.local ──
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      let val = values.join('=').trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      env[key.trim()] = val;
    }
  }
});

const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE;
const ANTHROPIC_KEY = env.ANTHROPIC_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
if (!ANTHROPIC_KEY) {
  console.error('Missing ANTHROPIC_API_KEY in .env.local');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const USER_ID = '938a2e17-0e49-45ff-bb98-810db46e5e65';

const CANONICAL_CATEGORIES = [
  'Income', 'Groceries', 'Food & Dining', 'Transportation', 'Housing',
  'Utilities', 'Shopping', 'Subscriptions', 'Entertainment', 'Healthcare',
  'Insurance', 'Education', 'Travel', 'Transfers', 'Bank Fees',
  'Business', 'Personal Care', 'Home & Garden',
];

// ── Rule matching (mirrors tag-categorize-committed.ts logic) ──
function applyDbRules(rules, merchant, amount) {
  const lower = merchant.toLowerCase();
  for (const amountPass of [true, false]) {
    for (const rule of rules) {
      const hasAmountThreshold = rule.min_amount != null || rule.max_amount != null;
      if (amountPass && !hasAmountThreshold) continue;
      if (!amountPass && hasAmountThreshold) continue;

      const val = rule.match_value.toLowerCase();
      let matched = false;
      if (rule.match_type === 'exact') matched = lower === val;
      else if (rule.match_type === 'starts_with') matched = lower.startsWith(val);
      else if (rule.match_type === 'contains') matched = lower.includes(val);
      else if (rule.match_type === 'regex') {
        try { matched = new RegExp(rule.match_value, 'i').test(merchant); } catch { matched = false; }
      }
      if (!matched) continue;

      if (hasAmountThreshold && amount !== undefined) {
        const absAmt = Math.abs(amount);
        if (rule.min_amount != null && absAmt < rule.min_amount) continue;
        if (rule.max_amount != null && absAmt >= rule.max_amount) continue;
      } else if (hasAmountThreshold) {
        continue;
      }

      return { category: rule.category, subcategory: rule.subcategory || null };
    }
  }
  return null;
}

// ── Claude Haiku batch categorizer ──
async function classifyBatch(transactions) {
  const lines = transactions.map((tx, i) =>
    `${i + 1}. "${tx.merchant}" — $${Math.abs(tx.amount).toFixed(2)}`
  ).join('\n');

  const body = {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: `You are a Canadian bookkeeping assistant.
Categorize each transaction into exactly one of these categories:
${CANONICAL_CATEGORIES.join(', ')}

Rules:
- Grocery stores (Walmart Supercentre, No Frills, Loblaws, FreshCo, Metro, Sobeys, Real Canadian Superstore, etc.) → Groceries
- Restaurants, fast food, coffee shops, Uber Eats, DoorDash, Skip The Dishes → Food & Dining
- Gas stations (Petro-Canada, Shell, Esso, Pioneer, Canadian Tire Gas) → Transportation
- Uber, Lyft, Presto, transit → Transportation
- Streaming services (Netflix, Spotify, Disney+, Apple, Amazon Prime) → Subscriptions
- Amazon, Costco (non-grocery), Canadian Tire, Walmart (non-grocery) → Shopping
- Pharmacies (Shoppers Drug Mart, Rexall, PharmaPlus) → Healthcare
- Haircuts, salons, spas → Personal Care
- Insurance premiums → Insurance
- Rent, mortgage → Housing
- Hydro, gas, internet, phone → Utilities
- Transfers between accounts, ATM, e-Transfer → Transfers
- Bank service charges, NSF fees → Bank Fees

Respond with ONLY a JSON array of objects: [{"index":1,"category":"..."},...]
No explanation, no markdown fences.`,
    messages: [{ role: 'user', content: `Categorize these transactions:\n${lines}` }],
  };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || '';
  const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  try {
    const results = JSON.parse(cleaned);
    if (!Array.isArray(results)) throw new Error('Not an array');
    return results;
  } catch (e) {
    console.error('  Failed to parse Claude response:', e.message);
    console.error('  Raw:', text.slice(0, 300));
    return [];
  }
}

// ── Main ──
async function main() {
  console.log('=== Reclassify "Other" Transactions ===\n');

  // 1. Fetch all "Other" expense transactions
  //    No "type" column — expenses are positive amounts (debits)
  const { data: txns, error } = await sb
    .from('transactions')
    .select('id, merchant_name, merchant, amount, description')
    .eq('user_id', USER_ID)
    .eq('category', 'Other')
    .gt('amount', 0)
    .order('date', { ascending: false });

  if (error) {
    console.error('Query error:', error.message);
    process.exit(1);
  }

  console.log(`Found ${txns.length} "Other" expense transactions\n`);
  if (txns.length === 0) {
    console.log('Nothing to reclassify.');
    return;
  }

  // 2. Fetch user's category rules
  const { data: ruleRows } = await sb
    .from('category_rules')
    .select('match_type, match_value, category, subcategory, min_amount, max_amount')
    .eq('user_id', USER_ID)
    .eq('is_active', true);

  const TYPE_PRIORITY = { exact: 0, starts_with: 1, contains: 2, regex: 3 };
  const rules = (ruleRows || []).sort(
    (a, b) => (TYPE_PRIORITY[a.match_type] ?? 9) - (TYPE_PRIORITY[b.match_type] ?? 9)
  );
  console.log(`Loaded ${rules.length} category rules\n`);

  // 3. First pass: apply rules
  const ruleMatched = [];
  const needsAI = [];

  for (const tx of txns) {
    const merchant = tx.merchant_name || tx.merchant || tx.description || '';
    const match = applyDbRules(rules, merchant, Number(tx.amount));
    if (match && match.category !== 'Other') {
      ruleMatched.push({ ...tx, newCategory: match.category, newSubcategory: match.subcategory, merchant });
    } else {
      needsAI.push({ ...tx, merchant });
    }
  }

  console.log(`Rule matches: ${ruleMatched.length}`);
  console.log(`Need AI classification: ${needsAI.length}\n`);

  // 4. Apply rule-matched updates
  let ruleUpdated = 0;
  for (const tx of ruleMatched) {
    const payload = { category: tx.newCategory, category_source: 'rule' };
    if (tx.newSubcategory) payload.subcategory = tx.newSubcategory;
    const { error: updateErr } = await sb
      .from('transactions')
      .update(payload)
      .eq('id', tx.id)
      .eq('user_id', USER_ID);
    if (updateErr) {
      console.error(`  Rule update failed for ${tx.id}: ${updateErr.message}`);
    } else {
      ruleUpdated++;
      console.log(`  [rule] ${tx.merchant} → ${tx.newCategory}`);
    }
  }

  // 5. AI pass: batch in groups of 20
  let aiUpdated = 0;
  const BATCH_SIZE = 20;
  for (let i = 0; i < needsAI.length; i += BATCH_SIZE) {
    const batch = needsAI.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(needsAI.length / BATCH_SIZE);
    console.log(`\n  AI batch ${batchNum}/${totalBatches} (${batch.length} txns)...`);

    try {
      const results = await classifyBatch(batch);

      for (const result of results) {
        const idx = result.index - 1;
        if (idx < 0 || idx >= batch.length) continue;
        const tx = batch[idx];
        const cat = result.category;

        // Validate against canonical list
        if (!CANONICAL_CATEGORIES.includes(cat)) {
          console.warn(`    Skipping invalid category "${cat}" for "${tx.merchant}"`);
          continue;
        }
        if (cat === 'Other') continue; // Don't re-assign Other

        const { error: updateErr } = await sb
          .from('transactions')
          .update({ category: cat, category_source: 'ai-reclassify' })
          .eq('id', tx.id)
          .eq('user_id', USER_ID);
        if (updateErr) {
          console.error(`    AI update failed for ${tx.id}: ${updateErr.message}`);
        } else {
          aiUpdated++;
          console.log(`    [ai] ${tx.merchant} → ${cat}`);
        }
      }
    } catch (e) {
      console.error(`  Batch ${batchNum} failed:`, e.message);
    }

    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < needsAI.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // 6. Summary
  const remaining = txns.length - ruleUpdated - aiUpdated;
  console.log('\n=== Summary ===');
  console.log(`  Total "Other" transactions: ${txns.length}`);
  console.log(`  Reclassified by rules:      ${ruleUpdated}`);
  console.log(`  Reclassified by AI:         ${aiUpdated}`);
  console.log(`  Still "Other":              ${remaining}`);
  console.log('Done.');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
