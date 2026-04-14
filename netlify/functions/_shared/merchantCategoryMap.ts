/**
 * Comprehensive Canadian merchant -> category+subcategory map.
 * Used by tag-categorize-committed.ts and tag-reclassify-other.ts.
 */

import { normalizeMerchant } from './merchantUtils.js';

export const MERCHANT_CATEGORY_MAP: Record<string, { category: string; subcategory?: string }> = {
  // ── GROCERIES ──────────────────────────────────────────────
  "ss edmonton": { category: "Groceries" },
  "imperial pfs": { category: "Insurance", subcategory: "Business Insurance" },
  "sobeys": { category: "Groceries" },
  "save on foods": { category: "Groceries" },
  "safeway": { category: "Groceries" },
  "costco": { category: "Groceries" },
  "walmart": { category: "Shopping" },
  "superstore": { category: "Groceries" },
  "loblaws": { category: "Groceries" },
  "no frills": { category: "Groceries" },
  "freshco": { category: "Groceries" },
  "co-op food": { category: "Groceries" },

  // ── FOOD & DINING ───────────────────────────────────────────
  "tim hortons": { category: "Food & Dining", subcategory: "Coffee & Drinks" },
  "starbucks": { category: "Food & Dining", subcategory: "Coffee & Drinks" },
  "second cup": { category: "Food & Dining", subcategory: "Coffee & Drinks" },
  "waves coffee": { category: "Food & Dining", subcategory: "Coffee & Drinks" },
  "booster juice": { category: "Food & Dining", subcategory: "Coffee & Drinks" },
  "good earth": { category: "Food & Dining", subcategory: "Coffee & Drinks" },
  "krispy kreme": { category: "Food & Dining", subcategory: "Fast Food" },
  "krispykreme": { category: "Food & Dining", subcategory: "Fast Food" },
  "mcdonald": { category: "Food & Dining", subcategory: "Fast Food" },
  "burger king": { category: "Food & Dining", subcategory: "Fast Food" },
  "dairy queen": { category: "Food & Dining", subcategory: "Fast Food" },
  "a&w": { category: "Food & Dining", subcategory: "Fast Food" },
  "subway": { category: "Food & Dining", subcategory: "Fast Food" },
  "popeye": { category: "Food & Dining", subcategory: "Fast Food" },
  "wendy": { category: "Food & Dining", subcategory: "Fast Food" },
  "kfc": { category: "Food & Dining", subcategory: "Fast Food" },
  "pizza hut": { category: "Food & Dining", subcategory: "Fast Food" },
  "domino": { category: "Food & Dining", subcategory: "Fast Food" },
  "boston pizza": { category: "Food & Dining", subcategory: "Restaurants" },
  "earls": { category: "Food & Dining", subcategory: "Restaurants" },
  "cactus club": { category: "Food & Dining", subcategory: "Restaurants" },
  "moxies": { category: "Food & Dining", subcategory: "Restaurants" },
  "original joe": { category: "Food & Dining", subcategory: "Restaurants" },
  "joey": { category: "Food & Dining", subcategory: "Restaurants" },
  "smitty": { category: "Food & Dining", subcategory: "Restaurants" },
  "saratoga": { category: "Food & Dining", subcategory: "Restaurants" },
  "coliseum pizza": { category: "Food & Dining", subcategory: "Restaurants" },
  "ufo pizza": { category: "Food & Dining", subcategory: "Restaurants" },
  "pals sandwiches": { category: "Food & Dining", subcategory: "Restaurants" },
  "habaneros": { category: "Food & Dining", subcategory: "Restaurants" },
  "chopped leaf": { category: "Food & Dining", subcategory: "Restaurants" },
  "leduc diner": { category: "Food & Dining", subcategory: "Restaurants" },
  "route 99": { category: "Food & Dining", subcategory: "Restaurants" },
  "audrey": { category: "Food & Dining", subcategory: "Restaurants" },
  "kosmos": { category: "Food & Dining", subcategory: "Restaurants" },
  "railway": { category: "Food & Dining", subcategory: "Restaurants" },
  "o byrnes": { category: "Food & Dining", subcategory: "Restaurants" },
  "wings": { category: "Food & Dining", subcategory: "Restaurants" },
  "uber eats": { category: "Food & Dining", subcategory: "Delivery" },
  "doordash": { category: "Food & Dining", subcategory: "Delivery" },
  "skip the dishes": { category: "Food & Dining", subcategory: "Delivery" },

  // ── TRANSPORTATION ──────────────────────────────────────────
  "petro-canada": { category: "Transportation", subcategory: "Gas & Fuel" },
  "petrocanada": { category: "Transportation", subcategory: "Gas & Fuel" },
  "shell": { category: "Transportation", subcategory: "Gas & Fuel" },
  "esso": { category: "Transportation", subcategory: "Gas & Fuel" },
  "husky": { category: "Transportation", subcategory: "Gas & Fuel" },
  "mobil": { category: "Transportation", subcategory: "Gas & Fuel" },
  "co-op gas": { category: "Transportation", subcategory: "Gas & Fuel" },
  "can co petroleum": { category: "Transportation", subcategory: "Gas & Fuel" },
  "kollbrook": { category: "Transportation", subcategory: "Gas & Fuel" },
  "koll brook": { category: "Transportation", subcategory: "Gas & Fuel" },
  "wheelers hwy": { category: "Transportation", subcategory: "Gas & Fuel" },
  "wheeler": { category: "Transportation", subcategory: "Gas & Fuel" },
  "7-eleven": { category: "Food & Dining", subcategory: "Coffee & Drinks" },
  "7 eleven": { category: "Food & Dining", subcategory: "Coffee & Drinks" },
  "mac's convenience": { category: "Food & Dining", subcategory: "Coffee & Drinks" },
  "air-serv": { category: "Transportation", subcategory: "Vehicle Services" },
  "northtown registry": { category: "Transportation", subcategory: "Vehicle Services" },
  "north town registry": { category: "Transportation", subcategory: "Vehicle Services" },
  "northstar hyundai": { category: "Transportation", subcategory: "Vehicle Services" },
  "north star hyundai": { category: "Transportation", subcategory: "Vehicle Services" },
  "registry": { category: "Transportation", subcategory: "Vehicle Services" },

  // ── PERSONAL CARE ───────────────────────────────────────────
  "la fitness": { category: "Personal Care", subcategory: "Gym & Fitness" },
  "lafitness": { category: "Personal Care", subcategory: "Gym & Fitness" },
  "q hair design": { category: "Personal Care", subcategory: "Hair & Beauty" },
  "q hair": { category: "Personal Care", subcategory: "Hair & Beauty" },
  "shadified": { category: "Personal Care", subcategory: "Hair & Beauty" },
  "hair cuts": { category: "Personal Care", subcategory: "Hair & Beauty" },
  "lewis massage": { category: "Personal Care", subcategory: "Massage & Wellness" },
  "ting ting massage": { category: "Personal Care", subcategory: "Massage & Wellness" },
  "stony medical massage": { category: "Personal Care", subcategory: "Massage & Wellness" },
  "tulip garden": { category: "Personal Care", subcategory: "Massage & Wellness" },
  "ad's massage": { category: "Personal Care", subcategory: "Massage & Wellness" },
  "lm st albert": { category: "Personal Care", subcategory: "Massage & Wellness" },
  "lms talbert": { category: "Personal Care", subcategory: "Massage & Wellness" },
  "o'massage": { category: "Personal Care", subcategory: "Massage & Wellness" },
  "yellow devon": { category: "Personal Care", subcategory: "Massage & Wellness" },
  "shoppers drug mart": { category: "Personal Care", subcategory: "Pharmacy" },
  "popeye supplement": { category: "Personal Care", subcategory: "Gym & Fitness" },
  "ls supplement": { category: "Personal Care", subcategory: "Gym & Fitness" },
  "lys tailor": { category: "Personal Care", subcategory: "Clothing" },
  "lysta tailor": { category: "Personal Care", subcategory: "Clothing" },

  // ── HEALTHCARE ──────────────────────────────────────────────
  "unimeal": { category: "Healthcare", subcategory: "Supplements" },
  "sa v support": { category: "Healthcare", subcategory: "Supplements" },
  "callingwood chiro": { category: "Healthcare", subcategory: "Chiropractic" },
  "calling wood chiro": { category: "Healthcare", subcategory: "Chiropractic" },
  "specsavers": { category: "Healthcare", subcategory: "Vision" },
  "specs avers": { category: "Healthcare", subcategory: "Vision" },
  "dr. ian": { category: "Healthcare", subcategory: "Medical" },
  "riverview ph": { category: "Healthcare", subcategory: "Medical" },
  "river view ph": { category: "Healthcare", subcategory: "Medical" },
  "g&e pharmacy": { category: "Healthcare", subcategory: "Pharmacy" },

  // ── ENTERTAINMENT ───────────────────────────────────────────
  "castle downs bingo": { category: "Entertainment", subcategory: "Gaming & Lottery" },
  "bear hills casino": { category: "Entertainment", subcategory: "Gaming & Lottery" },
  "river cree": { category: "Entertainment", subcategory: "Gaming & Lottery" },
  "leduc golf": { category: "Entertainment", subcategory: "Golf" },
  "golf zone": { category: "Entertainment", subcategory: "Golf" },
  "golf traders": { category: "Entertainment", subcategory: "Golf" },
  "canada golf card": { category: "Entertainment", subcategory: "Golf" },
  "montgomery glen golf": { category: "Entertainment", subcategory: "Golf" },
  "lone spruce": { category: "Entertainment", subcategory: "Golf" },
  "long shotz": { category: "Entertainment", subcategory: "Golf" },
  "edmonton oile": { category: "Entertainment", subcategory: "Sports" },
  "netflix": { category: "Subscriptions", subcategory: "Streaming" },
  "spotify": { category: "Subscriptions", subcategory: "Streaming" },

  // ── SHOPPING ────────────────────────────────────────────────
  "canadian tire": { category: "Shopping", subcategory: "Auto & Hardware" },
  "winners": { category: "Shopping" },
  "homesense": { category: "Shopping" },
  "marshalls": { category: "Shopping" },
  "dollar tree": { category: "Shopping" },
  "amazon": { category: "Shopping" },

  // ── SUBSCRIPTIONS ───────────────────────────────────────────
  "aiprm": { category: "Subscriptions", subcategory: "Software & AI" },
  "openai": { category: "Subscriptions", subcategory: "Software & AI" },
  "cursor": { category: "Subscriptions", subcategory: "Software & AI" },
  "paddle.net": { category: "Subscriptions", subcategory: "Software & AI" },
  "paddle net": { category: "Subscriptions", subcategory: "Software & AI" },
  "adobe": { category: "Subscriptions", subcategory: "Software & AI" },
  "microsoft": { category: "Subscriptions", subcategory: "Software & AI" },
  "google": { category: "Subscriptions", subcategory: "Software & AI" },

  // ── BANK FEES ───────────────────────────────────────────────
  "balanceprotector": { category: "Bank Fees", subcategory: "Balance Protection" },
  "balance protector": { category: "Bank Fees", subcategory: "Balance Protection" },
  "bmo inv": { category: "Bank Fees", subcategory: "Banking" },
  "bmo invinc": { category: "Bank Fees", subcategory: "Banking" },
  "premium plan": { category: "Bank Fees", subcategory: "Banking" },
  "borrowell": { category: "Bank Fees", subcategory: "Credit Services" },
  "ncube": { category: "Bank Fees", subcategory: "Professional Fees" },

  // ── DEBT PAYMENTS ───────────────────────────────────────────
  "capital one": { category: "Debt Payments", subcategory: "Credit Card" },
  "td loan": { category: "Debt Payments", subcategory: "Loan Payment" },
  "easyfinancial": { category: "Debt Payments", subcategory: "Loan Payment" },
  "easy financial": { category: "Debt Payments", subcategory: "Loan Payment" },
  "national money": { category: "Debt Payments", subcategory: "Loan Payment" },
  "flexiti": { category: "Debt Payments", subcategory: "Credit Card" },
  "cash money": { category: "Debt Payments", subcategory: "Loan Payment" },

  // ── HOUSING ─────────────────────────────────────────────────
  "celtic group": { category: "Housing", subcategory: "Rent or Mortgage" },
  "b/m payt": { category: "Housing", subcategory: "Rent or Mortgage" },
  "epcor": { category: "Housing", subcategory: "Utilities" },
  "atco": { category: "Housing", subcategory: "Utilities" },
  "telus": { category: "Utilities", subcategory: "Phone & Internet" },
  "rogers": { category: "Utilities", subcategory: "Phone & Internet" },
  "shaw": { category: "Utilities", subcategory: "Phone & Internet" },

  // ── TRANSFERS ───────────────────────────────────────────────
  "interac": { category: "Transfers", subcategory: "e-Transfer" },
  "abm": { category: "Transfers", subcategory: "ATM Withdrawal" },
  "online transfer": { category: "Transfers", subcategory: "e-Transfer" },
  "tf3049": { category: "Transfers", subcategory: "e-Transfer" },
  "indall": { category: "Transfers", subcategory: "e-Transfer" },

  // ── INCOME ──────────────────────────────────────────────────
  "gordon food": { category: "Income", subcategory: "Employment" },
  "gordon foods": { category: "Income", subcategory: "Employment" },
  "gfs edmonton": { category: "Income", subcategory: "Employment" },
  "canada rit": { category: "Income", subcategory: "Tax Refund" },
  "cda carbon rebate": { category: "Income", subcategory: "Government Rebate" },
  "cdacarbonrebate": { category: "Income", subcategory: "Government Rebate" },
  "manulife": { category: "Income", subcategory: "Investment" },

  // ── ADDITIONAL VARIANTS (OCR spelling) ─────────────────────
  "b/m pay": { category: "Housing", subcategory: "Rent or Mortgage" },
  "ls alberta beach golf": { category: "Entertainment", subcategory: "Golf" },
  "alberta beach golf": { category: "Entertainment", subcategory: "Golf" },
  "twin willows golf": { category: "Entertainment", subcategory: "Golf" },
  "eclipse restaurant": { category: "Food & Dining", subcategory: "Restaurants" },
  "rollz ice cream": { category: "Food & Dining", subcategory: "Fast Food" },
  "meat barbecue": { category: "Food & Dining", subcategory: "Restaurants" },
  "kaiming": { category: "Food & Dining", subcategory: "Restaurants" },
  "lend direct": { category: "Debt Payments", subcategory: "Loan Payment" },
  "northstar financial": { category: "Debt Payments", subcategory: "Loan Payment" },
  "mobile cheque deposit": { category: "Income", subcategory: "Employment" },
  "cheque deposit": { category: "Income", subcategory: "Employment" },
  "shadi fied": { category: "Personal Care", subcategory: "Hair & Beauty" },
  "ind all saving": { category: "Savings" },
  // ── CAPITAL ONE / CREDIT CARD SPECIFIC ──────────────────────
  "payment": { category: "Transfers", subcategory: "Credit Card Payment" },
  "payback with points": { category: "Transfers", subcategory: "Points Redemption" },
  "canva": { category: "Subscriptions", subcategory: "Software" },
  "everlance": { category: "Subscriptions", subcategory: "Software" },
  "prem-plan": { category: "Subscriptions", subcategory: "Software" },
  "prem patalaro": { category: "Subscriptions", subcategory: "Software" },
  "apple.com": { category: "Subscriptions", subcategory: "Software" },
  "cash advance interest": { category: "Bank Fees", subcategory: "Interest" },
  "purchase interest": { category: "Bank Fees", subcategory: "Interest" },
  "cash service charge": { category: "Bank Fees", subcategory: "Cash Advance Fee" },
  "cash advance fee": { category: "Bank Fees", subcategory: "Cash Advance Fee" },
  "overlimit fee": { category: "Bank Fees", subcategory: "Overlimit Fee" },
  "foreign transaction": { category: "Bank Fees", subcategory: "Foreign Transaction Fee" },
  "capital one member fee": { category: "Bank Fees", subcategory: "Annual Fee" },
  "atm cash advance": { category: "Bank Fees", subcategory: "Cash Advance Fee" },
  "atm cash adv": { category: "Bank Fees", subcategory: "Cash Advance Fee" },
  "costco gas": { category: "Transportation", subcategory: "Gas & Fuel" },
  "myalberta fine": { category: "Transportation", subcategory: "Traffic Fine" },
  "ahs rah parking": { category: "Transportation", subcategory: "Parking" },
  "royal alexandra": { category: "Healthcare", subcategory: "Medical" },
  "simply health": { category: "Healthcare" },
  "landmark web ticketing": { category: "Entertainment", subcategory: "Events" },
  "mark a chandra": { category: "Business Expenses", subcategory: "Professional Services" },
  "j dick mcallister": { category: "Business Expenses", subcategory: "Professional Services" },
  "q-nails": { category: "Personal Care", subcategory: "Nail Care" },
  "q nails": { category: "Personal Care", subcategory: "Nail Care" },
};

export function matchMerchantMap(merchantName: string): { category: string; subcategory?: string } | null {
  // normalizeMerchant returns UPPERCASE — lowercase here so patterns (lowercase) actually match
  const normalized = normalizeMerchant(merchantName).toLowerCase();
  // Also strip all spaces for OCR-mangled names like "SHADI FIED" -> "shadified"
  const noSpaces = normalized.replace(/\s+/g, '');
  for (const [pattern, result] of Object.entries(MERCHANT_CATEGORY_MAP)) {
    if (normalized.includes(pattern)) return result;
    // Fallback: space-stripped match for OCR artifacts
    const patternNoSpaces = pattern.replace(/\s+/g, '');
    if (noSpaces.includes(patternNoSpaces)) return result;
  }
  return null;
}
