import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const envText = readFileSync('.env.local', 'utf8');
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const userId = '938a2e17-0e49-45ff-bb98-810db46e5e65';

function normalizeMerchant(raw) {
  return (raw || '').toLowerCase()
    .replace(/[#*\/\\.,'"\\-]/g, ' ')
    .replace(/\b(inc|ltd|corp|co|llc|store|stores|canada|cdm|w|e|n|s)\b/g, '')
    .replace(/\d{3,}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const MAP = {
  "sobeys": { c: "Groceries" }, "save on foods": { c: "Groceries" }, "safeway": { c: "Groceries" },
  "costco": { c: "Groceries" }, "superstore": { c: "Groceries" }, "loblaws": { c: "Groceries" },
  "no frills": { c: "Groceries" }, "freshco": { c: "Groceries" }, "walmart": { c: "Shopping" },
  "tim hortons": { c: "Food & Dining", s: "Coffee & Drinks" },
  "starbucks": { c: "Food & Dining", s: "Coffee & Drinks" },
  "second cup": { c: "Food & Dining", s: "Coffee & Drinks" },
  "booster juice": { c: "Food & Dining", s: "Coffee & Drinks" },
  "good earth": { c: "Food & Dining", s: "Coffee & Drinks" },
  "mcdonald": { c: "Food & Dining", s: "Fast Food" },
  "burger king": { c: "Food & Dining", s: "Fast Food" },
  "dairy queen": { c: "Food & Dining", s: "Fast Food" },
  "a&w": { c: "Food & Dining", s: "Fast Food" },
  "subway": { c: "Food & Dining", s: "Fast Food" },
  "wendy": { c: "Food & Dining", s: "Fast Food" },
  "kfc": { c: "Food & Dining", s: "Fast Food" },
  "popeye": { c: "Food & Dining", s: "Fast Food" },
  "krispy kreme": { c: "Food & Dining", s: "Fast Food" },
  "pizza hut": { c: "Food & Dining", s: "Fast Food" },
  "domino": { c: "Food & Dining", s: "Fast Food" },
  "boston pizza": { c: "Food & Dining", s: "Restaurants" },
  "earls": { c: "Food & Dining", s: "Restaurants" },
  "cactus club": { c: "Food & Dining", s: "Restaurants" },
  "moxies": { c: "Food & Dining", s: "Restaurants" },
  "original joe": { c: "Food & Dining", s: "Restaurants" },
  "joey": { c: "Food & Dining", s: "Restaurants" },
  "smitty": { c: "Food & Dining", s: "Restaurants" },
  "saratoga": { c: "Food & Dining", s: "Restaurants" },
  "coliseum pizza": { c: "Food & Dining", s: "Restaurants" },
  "ufo pizza": { c: "Food & Dining", s: "Restaurants" },
  "pals sandwiches": { c: "Food & Dining", s: "Restaurants" },
  "habaneros": { c: "Food & Dining", s: "Restaurants" },
  "chopped leaf": { c: "Food & Dining", s: "Restaurants" },
  "leduc diner": { c: "Food & Dining", s: "Restaurants" },
  "route 99": { c: "Food & Dining", s: "Restaurants" },
  "audrey": { c: "Food & Dining", s: "Restaurants" },
  "kosmos": { c: "Food & Dining", s: "Restaurants" },
  "railway": { c: "Food & Dining", s: "Restaurants" },
  "o byrnes": { c: "Food & Dining", s: "Restaurants" },
  "wings": { c: "Food & Dining", s: "Restaurants" },
  "uber eats": { c: "Food & Dining", s: "Delivery" },
  "doordash": { c: "Food & Dining", s: "Delivery" },
  "skip the dishes": { c: "Food & Dining", s: "Delivery" },
  "petro": { c: "Transportation", s: "Gas & Fuel" },
  "petrocanada": { c: "Transportation", s: "Gas & Fuel" },
  "shell": { c: "Transportation", s: "Gas & Fuel" },
  "esso": { c: "Transportation", s: "Gas & Fuel" },
  "husky": { c: "Transportation", s: "Gas & Fuel" },
  "mobil": { c: "Transportation", s: "Gas & Fuel" },
  "can co petroleum": { c: "Transportation", s: "Gas & Fuel" },
  "kollbrook": { c: "Transportation", s: "Gas & Fuel" },
  "koll brook": { c: "Transportation", s: "Gas & Fuel" },
  "wheelers hwy": { c: "Transportation", s: "Gas & Fuel" },
  "wheeler": { c: "Transportation", s: "Gas & Fuel" },
  "7-eleven": { c: "Transportation", s: "Gas & Fuel" },
  "7 eleven": { c: "Transportation", s: "Gas & Fuel" },
  "air-serv": { c: "Transportation", s: "Vehicle Services" },
  "northtown registry": { c: "Transportation", s: "Vehicle Services" },
  "north town registry": { c: "Transportation", s: "Vehicle Services" },
  "northstar hyundai": { c: "Transportation", s: "Vehicle Services" },
  "registry": { c: "Transportation", s: "Vehicle Services" },
  "shadified": { c: "Personal Care", s: "Hair & Beauty" },
  "hair cuts": { c: "Personal Care", s: "Hair & Beauty" },
  "lewis massage": { c: "Personal Care", s: "Massage & Wellness" },
  "ting ting massage": { c: "Personal Care", s: "Massage & Wellness" },
  "stony medical massage": { c: "Personal Care", s: "Massage & Wellness" },
  "tulip garden": { c: "Personal Care", s: "Massage & Wellness" },
  "lm st albert": { c: "Personal Care", s: "Massage & Wellness" },
  "lms talbert": { c: "Personal Care", s: "Massage & Wellness" },
  "yellow devon": { c: "Personal Care", s: "Massage & Wellness" },
  "shoppers drug mart": { c: "Personal Care", s: "Pharmacy" },
  "shoppers drug": { c: "Personal Care", s: "Pharmacy" },
  "popeye supplement": { c: "Personal Care", s: "Gym & Fitness" },
  "ls supplement": { c: "Personal Care", s: "Gym & Fitness" },
  "callingwood chiro": { c: "Healthcare", s: "Chiropractic" },
  "calling wood chiro": { c: "Healthcare", s: "Chiropractic" },
  "specsavers": { c: "Healthcare", s: "Vision" },
  "g&e pharmacy": { c: "Healthcare", s: "Pharmacy" },
  "riverview ph": { c: "Healthcare", s: "Medical" },
  "castle downs bingo": { c: "Entertainment", s: "Gaming & Lottery" },
  "bear hills casino": { c: "Entertainment", s: "Gaming & Lottery" },
  "river cree": { c: "Entertainment", s: "Gaming & Lottery" },
  "leduc golf": { c: "Entertainment", s: "Golf" },
  "golf zone": { c: "Entertainment", s: "Golf" },
  "golf traders": { c: "Entertainment", s: "Golf" },
  "canada golf card": { c: "Entertainment", s: "Golf" },
  "montgomery glen": { c: "Entertainment", s: "Golf" },
  "lone spruce": { c: "Entertainment", s: "Golf" },
  "long shotz": { c: "Entertainment", s: "Golf" },
  "edmonton oile": { c: "Entertainment", s: "Sports" },
  "netflix": { c: "Subscriptions", s: "Streaming" },
  "spotify": { c: "Subscriptions", s: "Streaming" },
  "aiprm": { c: "Subscriptions", s: "Software & AI" },
  "openai": { c: "Subscriptions", s: "Software & AI" },
  "cursor": { c: "Subscriptions", s: "Software & AI" },
  "adobe": { c: "Subscriptions", s: "Software & AI" },
  "microsoft": { c: "Subscriptions", s: "Software & AI" },
  "google": { c: "Subscriptions", s: "Software & AI" },
  "canadian tire": { c: "Shopping", s: "Auto & Hardware" },
  "winners": { c: "Shopping" }, "homesense": { c: "Shopping" },
  "marshalls": { c: "Shopping" }, "dollar tree": { c: "Shopping" },
  "amazon": { c: "Shopping" },
  "bmo inv": { c: "Bank Fees", s: "Banking" },
  "bmo invinc": { c: "Bank Fees", s: "Banking" },
  "premium plan": { c: "Bank Fees", s: "Banking" },
  "borrowell": { c: "Bank Fees", s: "Credit Services" },
  "ncube": { c: "Bank Fees", s: "Professional Fees" },
  "capital one": { c: "Debt Payments", s: "Credit Card" },
  "td loan": { c: "Debt Payments", s: "Loan Payment" },
  "easyfinancial": { c: "Debt Payments", s: "Loan Payment" },
  "easy financial": { c: "Debt Payments", s: "Loan Payment" },
  "national money": { c: "Debt Payments", s: "Loan Payment" },
  "flexiti": { c: "Debt Payments", s: "Credit Card" },
  "cash money": { c: "Debt Payments", s: "Loan Payment" },
  "celtic group": { c: "Housing", s: "Rent or Mortgage" },
  "b/m payt": { c: "Housing", s: "Rent or Mortgage" },
  "epcor": { c: "Housing", s: "Utilities" },
  "atco": { c: "Housing", s: "Utilities" },
  "telus": { c: "Housing", s: "Utilities" },
  "shaw": { c: "Housing", s: "Utilities" },
  "interac": { c: "Transfers", s: "e-Transfer" },
  "abm": { c: "Transfers", s: "ATM Withdrawal" },
  "online transfer": { c: "Transfers", s: "e-Transfer" },
  "tf3049": { c: "Transfers", s: "e-Transfer" },
  "indall": { c: "Transfers", s: "e-Transfer" },
  "gordon food": { c: "Income", s: "Employment" },
  "gordon foods": { c: "Income", s: "Employment" },
  "gfs edmonton": { c: "Income", s: "Employment" },
  "canada rit": { c: "Income", s: "Tax Refund" },
  "cda carbon rebate": { c: "Income", s: "Government Rebate" },
  "cdacarbonrebate": { c: "Income", s: "Government Rebate" },
  "manulife": { c: "Income", s: "Investment" },
};

function matchMap(merchantName) {
  const normalized = normalizeMerchant(merchantName);
  const noSpaces = normalized.replace(/\s+/g, '');
  for (const [pattern, result] of Object.entries(MAP)) {
    if (normalized.includes(pattern)) return result;
    if (noSpaces.includes(pattern.replace(/\s+/g, ''))) return result;
  }
  return null;
}

async function run() {
  // Pass 1: Reclassify "Other" transactions
  console.log('=== Pass 1: Reclassify Other ===');
  let offset = 0, reclassified = 0, needsReview = 0;
  while (true) {
    const { data: txs } = await sb.from('transactions')
      .select('id, merchant_name').eq('user_id', userId).eq('category', 'Other')
      .range(offset, offset + 499).limit(500);
    if (!txs || txs.length === 0) break;
    for (const tx of txs) {
      const match = matchMap(tx.merchant_name || '');
      if (match) {
        const payload = { category: match.c, category_source: 'tag_rule', updated_at: new Date().toISOString() };
        if (match.s) { payload.subcategory = match.s; payload.subcategory_source = 'tag_rule'; }
        await sb.from('transactions').update(payload).eq('id', tx.id);
        reclassified++;
      } else {
        await sb.from('transactions').update({ category: 'Needs Review', category_source: 'needs_review', updated_at: new Date().toISOString() }).eq('id', tx.id);
        needsReview++;
      }
    }
    offset += txs.length;
    if (txs.length < 500) break;
  }
  console.log(`Reclassified: ${reclassified}, Needs Review: ${needsReview}`);

  // Pass 2: Backfill subcategories on ALL transactions missing them
  console.log('\n=== Pass 2: Subcategory backfill ===');
  offset = 0;
  let subUpdated = 0, subSkipped = 0;
  while (true) {
    const { data: txs } = await sb.from('transactions')
      .select('id, merchant_name, category').eq('user_id', userId).is('subcategory', null)
      .not('category', 'eq', 'Needs Review').not('category', 'is', null)
      .range(offset, offset + 499).limit(500);
    if (!txs || txs.length === 0) break;
    for (const tx of txs) {
      const match = matchMap(tx.merchant_name || '');
      if (match && match.s) {
        await sb.from('transactions').update({
          subcategory: match.s, subcategory_source: 'tag_rule', updated_at: new Date().toISOString()
        }).eq('id', tx.id);
        subUpdated++;
      } else {
        subSkipped++;
      }
    }
    offset += txs.length;
    if (txs.length < 500) break;
  }
  console.log(`Subcategories set: ${subUpdated}, No match: ${subSkipped}`);

  // Final counts
  console.log('\n=== Final counts ===');
  const { count: otherCount } = await sb.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('category', 'Other');
  const { count: nrCount } = await sb.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('category', 'Needs Review');
  const { count: nullSub } = await sb.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('subcategory', null);
  const { count: total } = await sb.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  console.log(`Other: ${otherCount}, Needs Review: ${nrCount}, NULL subcategory: ${nullSub}, Total: ${total}`);
}

run();
