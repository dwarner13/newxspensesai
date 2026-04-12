/**
 * tagDefaultRules.ts
 *
 * Global default categorization rules applied as a fallback for ALL users.
 * These cover common Canadian merchants and transaction patterns.
 *
 * Priority in apply-category-rules.ts:
 *   0 Hardcoded overrides (user-specific, always win)
 *   1 Vendor memory (user-learned)
 *   2 User DB rules (user-defined via Tag)
 *   3 Merchant map
 *   4 DEFAULT RULES  ← this file
 *   5 Inline rules   (legacy, kept for backward compat)
 *
 * Matching uses both normal substring AND space/hyphen-stripped comparison so
 * fused all-caps OCR output (e.g. "TIMHORTONS") matches keyword "tim horton".
 */

export type DefaultRule = {
  /** Lowercase substrings to match against the merchant name */
  contains: string[];
  category: string;
  subcategory?: string;
};

/**
 * Ordered most-specific first. When multiple rules match the first wins,
 * so put longer/more specific keywords before generic ones.
 */
export const TAG_DEFAULT_RULES: DefaultRule[] = [
  // ── Income & Government ──────────────────────────────────────────────────
  { contains: ['canada rit', 'canada-rit', 'cra rit'], category: 'Income', subcategory: 'Tax Refund' },
  { contains: ['canada trillium', 'trillium benefit'], category: 'Income', subcategory: 'Government Benefit' },
  { contains: ['canada child benefit', 'canada child tax', 'cctb', 'uccb'], category: 'Income', subcategory: 'Government Benefit' },
  { contains: ['gst refund', 'gst/hst credit', 'hst credit', 'gst credit'], category: 'Income', subcategory: 'Tax Refund' },
  { contains: ['carbon rebate', 'cdacarbonrebate', 'climate action incentive'], category: 'Income', subcategory: 'Government Rebate' },
  { contains: ['ei payment', 'employment insurance payment', 'ei direct'], category: 'Income', subcategory: 'Government Benefit' },
  { contains: ['service canada'], category: 'Income', subcategory: 'Government Benefit' },

  // ── Food & Dining — Coffee ───────────────────────────────────────────────
  { contains: ['tim horton', 'timhorton'], category: 'Food & Dining', subcategory: 'Coffee' },
  { contains: ['starbucks'], category: 'Food & Dining', subcategory: 'Coffee' },
  { contains: ['second cup', 'secondcup'], category: 'Food & Dining', subcategory: 'Coffee' },
  { contains: ['booster juice', 'boosterjuice'], category: 'Food & Dining', subcategory: 'Coffee' },
  { contains: ['blenz'], category: 'Food & Dining', subcategory: 'Coffee' },

  // ── Food & Dining — Fast Food ─────────────────────────────────────────────
  { contains: ["mcdonald's", 'mcdonalds'], category: 'Food & Dining', subcategory: 'Fast Food' },
  { contains: ['burger king', 'burgerking'], category: 'Food & Dining', subcategory: 'Fast Food' },
  { contains: ["wendy's", 'wendys'], category: 'Food & Dining', subcategory: 'Fast Food' },
  { contains: ["popeye's", 'popeyes'], category: 'Food & Dining', subcategory: 'Fast Food' },
  { contains: ['kfc ', 'kentucky fried'], category: 'Food & Dining', subcategory: 'Fast Food' },
  { contains: ['subway'], category: 'Food & Dining', subcategory: 'Fast Food' },
  { contains: ['a&w ', 'a & w', 'a&w restaurant'], category: 'Food & Dining', subcategory: 'Fast Food' },
  { contains: ['dairy queen', 'dairyqueen'], category: 'Food & Dining', subcategory: 'Fast Food' },
  { contains: ['harveys'], category: 'Food & Dining', subcategory: 'Fast Food' },
  { contains: ['new york fries', 'newyorkfries'], category: 'Food & Dining', subcategory: 'Fast Food' },

  // ── Food & Dining — Restaurants ──────────────────────────────────────────
  { contains: ['pizza hut', 'pizzahut'], category: 'Food & Dining', subcategory: 'Restaurants' },
  { contains: ["domino's", 'dominos pizza'], category: 'Food & Dining', subcategory: 'Restaurants' },
  { contains: ['boston pizza', 'bostonpizza'], category: 'Food & Dining', subcategory: 'Restaurants' },
  { contains: ['moxie'], category: 'Food & Dining', subcategory: 'Restaurants' },
  { contains: ['earls '], category: 'Food & Dining', subcategory: 'Restaurants' },
  { contains: ['montanas'], category: 'Food & Dining', subcategory: 'Restaurants' },
  { contains: ['swiss chalet', 'swisschalet'], category: 'Food & Dining', subcategory: 'Restaurants' },
  { contains: ['white spot', 'whitespot'], category: 'Food & Dining', subcategory: 'Restaurants' },
  { contains: ['cactus club', 'cactusclub'], category: 'Food & Dining', subcategory: 'Restaurants' },
  { contains: ['joeys '], category: 'Food & Dining', subcategory: 'Restaurants' },

  // ── Food & Dining — Delivery ──────────────────────────────────────────────
  { contains: ['skip the dishes', 'skipthedishes', 'skip*'], category: 'Food & Dining', subcategory: 'Delivery' },
  { contains: ['doordash', 'door dash'], category: 'Food & Dining', subcategory: 'Delivery' },
  { contains: ['uber eats', 'ubereats'], category: 'Food & Dining', subcategory: 'Delivery' },

  // ── Groceries ─────────────────────────────────────────────────────────────
  { contains: ['sobeys'], category: 'Groceries' },
  { contains: ['save on foods', 'save-on-foods', 'saveonfood'], category: 'Groceries' },
  { contains: ['safeway'], category: 'Groceries' },
  { contains: ['loblaws'], category: 'Groceries' },
  { contains: ['no frills', 'nofrills'], category: 'Groceries' },
  { contains: ['freshco'], category: 'Groceries' },
  { contains: ['food basics', 'foodbasics'], category: 'Groceries' },
  { contains: ['metro grocery'], category: 'Groceries' },
  { contains: ['iga '], category: 'Groceries' },
  { contains: ['co-op food', 'coop food', 'coopfood'], category: 'Groceries' },
  { contains: ['real canadian superstore', 'rcss', 'superstore'], category: 'Groceries' },
  { contains: ['costco'], category: 'Groceries' },
  { contains: ['bulk barn', 'bulkbarn'], category: 'Groceries' },
  { contains: ['t&t supermarket', 't&t super'], category: 'Groceries' },

  // ── Transportation — Gas & Fuel ───────────────────────────────────────────
  { contains: ['petro-canada', 'petrocanada'], category: 'Transportation', subcategory: 'Gas & Fuel' },
  { contains: ['esso '], category: 'Transportation', subcategory: 'Gas & Fuel' },
  { contains: ['shell gas', 'shell canada', 'shell oil'], category: 'Transportation', subcategory: 'Gas & Fuel' },
  { contains: ['pioneer gas', 'pioneer petroleum', 'pioneer energy'], category: 'Transportation', subcategory: 'Gas & Fuel' },
  { contains: ['husky gas', 'husky energy'], category: 'Transportation', subcategory: 'Gas & Fuel' },
  { contains: ['mohawk gas', 'mohawk oil'], category: 'Transportation', subcategory: 'Gas & Fuel' },
  { contains: ['ultramar'], category: 'Transportation', subcategory: 'Gas & Fuel' },
  { contains: ['fas gas', 'fasgas'], category: 'Transportation', subcategory: 'Gas & Fuel' },
  { contains: ['canadian tire gas bar'], category: 'Transportation', subcategory: 'Gas & Fuel' },
  { contains: ['kollbrook'], category: 'Transportation', subcategory: 'Gas & Fuel' },

  // ── Transportation — Convenience stores (gas station chains) ─────────────
  { contains: ['7-eleven', '7eleven', 'seveneleven'], category: 'Transportation', subcategory: 'Convenience' },
  { contains: ['circle k', 'circlek'], category: 'Transportation', subcategory: 'Convenience' },

  // ── Transportation — Transit & Ride share ────────────────────────────────
  { contains: ['ets transit', 'edmonton transit', 'calgary transit', 'translink', 'ttc transit', 'presto card'], category: 'Transportation', subcategory: 'Public Transit' },
  { contains: ['uber trip', 'uber* trip'], category: 'Transportation', subcategory: 'Ride Share' },
  { contains: ['lyft trip', 'lyft* trip'], category: 'Transportation', subcategory: 'Ride Share' },

  // ── Transportation — Auto ─────────────────────────────────────────────────
  { contains: ['enterprise rent', 'budget rent', 'hertz rent', 'national car rental'], category: 'Transportation', subcategory: 'Car Rental' },
  { contains: ['napa auto', 'autoparts'], category: 'Transportation', subcategory: 'Auto Parts' },
  { contains: ['northtown registry'], category: 'Transportation', subcategory: 'Registration' },

  // ── Shopping ──────────────────────────────────────────────────────────────
  { contains: ['walmart'], category: 'Shopping' },
  { contains: ['amazon', 'amzn mktp', 'amzn '], category: 'Shopping' },
  { contains: ['canadian tire'], category: 'Shopping' },
  { contains: ['home depot', 'homedepot'], category: 'Shopping' },
  { contains: ["lowe's", 'lowes '], category: 'Shopping' },
  { contains: ['ikea'], category: 'Shopping' },
  { contains: ['best buy', 'bestbuy'], category: 'Shopping' },
  { contains: ['the bay', 'hudsons bay', "hudson's bay"], category: 'Shopping' },
  { contains: ['sport chek', 'sportchek'], category: 'Shopping' },
  { contains: ['winners'], category: 'Shopping' },
  { contains: ['marshalls'], category: 'Shopping' },
  { contains: ['value village', 'valuevillage'], category: 'Shopping' },
  { contains: ['dollarama'], category: 'Shopping' },
  { contains: ['staples'], category: 'Shopping', subcategory: 'Office Supplies' },
  { contains: ['fabricland'], category: 'Shopping' },
  { contains: ['rona '], category: 'Shopping', subcategory: 'Home Improvement' },
  { contains: ['the brick', 'thebrick'], category: 'Shopping', subcategory: 'Furniture' },
  { contains: ['ashley furniture', 'ashley homestore'], category: 'Shopping', subcategory: 'Furniture' },

  // ── Utilities ─────────────────────────────────────────────────────────────
  { contains: ['telus'], category: 'Utilities', subcategory: 'Phone & Internet' },
  { contains: ['rogers'], category: 'Utilities', subcategory: 'Phone & Internet' },
  { contains: ['bell canada', 'bell mts', 'bell mobility', 'bell aliant'], category: 'Utilities', subcategory: 'Phone & Internet' },
  { contains: ['shaw '], category: 'Utilities', subcategory: 'Phone & Internet' },
  { contains: ['videotron'], category: 'Utilities', subcategory: 'Phone & Internet' },
  { contains: ['fido '], category: 'Utilities', subcategory: 'Phone & Internet' },
  { contains: ['koodo'], category: 'Utilities', subcategory: 'Phone & Internet' },
  { contains: ['virgin mobile', 'virgin plus'], category: 'Utilities', subcategory: 'Phone & Internet' },
  { contains: ['epcor'], category: 'Utilities', subcategory: 'Gas & Electric' },
  { contains: ['enmax'], category: 'Utilities', subcategory: 'Gas & Electric' },
  { contains: ['atco gas'], category: 'Utilities', subcategory: 'Gas & Electric' },
  { contains: ['direct energy'], category: 'Utilities', subcategory: 'Gas & Electric' },
  { contains: ['just energy'], category: 'Utilities', subcategory: 'Gas & Electric' },
  { contains: ['fortisbc', 'fortis bc'], category: 'Utilities', subcategory: 'Gas & Electric' },
  { contains: ['bc hydro', 'bchydro'], category: 'Utilities', subcategory: 'Gas & Electric' },
  { contains: ['hydro one', 'hydroone'], category: 'Utilities', subcategory: 'Gas & Electric' },
  { contains: ['hydro quebec', 'hydroquebec'], category: 'Utilities', subcategory: 'Gas & Electric' },
  { contains: ['city of edmonton util', 'edmonton util', 'epcor water'], category: 'Utilities', subcategory: 'Water' },

  // ── Insurance ─────────────────────────────────────────────────────────────
  { contains: ['intact insurance', 'intact ins'], category: 'Insurance' },
  { contains: ['allstate'], category: 'Insurance' },
  { contains: ['belairdirect', 'belair direct'], category: 'Insurance' },
  { contains: ['td insurance'], category: 'Insurance' },
  { contains: ['sunlife', 'sun life'], category: 'Insurance' },
  { contains: ['great-west life', 'great west life'], category: 'Insurance' },
  { contains: ['manulife'], category: 'Insurance' },
  { contains: ['blue cross', 'bluecross'], category: 'Insurance' },
  { contains: ['cooperators'], category: 'Insurance' },
  { contains: ['wawanesa'], category: 'Insurance' },
  { contains: ['economical insurance'], category: 'Insurance' },

  // ── Subscriptions ─────────────────────────────────────────────────────────
  { contains: ['netflix'], category: 'Subscriptions', subcategory: 'Streaming' },
  { contains: ['spotify'], category: 'Subscriptions', subcategory: 'Streaming' },
  { contains: ['disney plus', 'disneyplus', 'disney+'], category: 'Subscriptions', subcategory: 'Streaming' },
  { contains: ['crave tv', 'cravetv'], category: 'Subscriptions', subcategory: 'Streaming' },
  { contains: ['youtube premium'], category: 'Subscriptions', subcategory: 'Streaming' },
  { contains: ['apple.com/bill', 'apple icloud', 'itunes'], category: 'Subscriptions', subcategory: 'Digital' },
  { contains: ['google play', 'google storage', 'google one'], category: 'Subscriptions', subcategory: 'Digital' },
  { contains: ['amazon prime'], category: 'Subscriptions', subcategory: 'Digital' },
  { contains: ['microsoft 365', 'office 365', 'microsoft sub', 'msft sub'], category: 'Subscriptions', subcategory: 'Software' },
  { contains: ['adobe '], category: 'Subscriptions', subcategory: 'Software' },
  { contains: ['dropbox'], category: 'Subscriptions', subcategory: 'Software' },
  { contains: ['shopify'], category: 'Subscriptions', subcategory: 'Software' },

  // ── Healthcare ────────────────────────────────────────────────────────────
  { contains: ['shoppers drug', 'shoppers pharmacy'], category: 'Healthcare', subcategory: 'Pharmacy' },
  { contains: ['rexall'], category: 'Healthcare', subcategory: 'Pharmacy' },
  { contains: ['london drugs', 'londondrugs'], category: 'Healthcare', subcategory: 'Pharmacy' },
  { contains: ['pharmasave'], category: 'Healthcare', subcategory: 'Pharmacy' },
  { contains: ['medicentre', 'medi-centre'], category: 'Healthcare', subcategory: 'Medical' },
  { contains: ['dental clinic', 'dental office', 'dentist', 'orthodont'], category: 'Healthcare', subcategory: 'Dental' },
  { contains: ['optometrist', 'optometry', 'eye care', 'eyecare', 'specsavers', 'lenscrafters', 'visionworks'], category: 'Healthcare', subcategory: 'Vision' },
  { contains: ['physiotherapy', 'physio', 'chiropract'], category: 'Healthcare', subcategory: 'Therapy' },

  // ── Housing ───────────────────────────────────────────────────────────────
  { contains: ['property tax', 'city of edmonton tax', 'city of calgary tax', 'municipal tax'], category: 'Housing', subcategory: 'Property Tax' },

  // ── Banking & Transfers ───────────────────────────────────────────────────
  { contains: ['interac e-transfer', 'e-transfer received', 'etransfer'], category: 'Transfers', subcategory: 'e-Transfer' },
  { contains: ['online transfer', 'wire transfer', 'bank transfer'], category: 'Transfers' },
  { contains: ['bmo inv', 'bmo invest'], category: 'Transfers' },
  { contains: ['nsf fee', 'overdraft fee', 'non-sufficient funds'], category: 'Bank Fees', subcategory: 'NSF/Overdraft' },
  { contains: ['service fee', 'account fee', 'monthly fee', 'plan fee', 'premium plan'], category: 'Bank Fees', subcategory: 'Monthly Fee' },

  // ── Debt Payments ─────────────────────────────────────────────────────────
  { contains: ['easyfinancial', 'easy financial'], category: 'Debt Payments', subcategory: 'Loan Payment' },
  { contains: ['lenddirect', 'lend direct'], category: 'Debt Payments', subcategory: 'Loan Payment' },
  { contains: ['cash money', 'cashmoney'], category: 'Debt Payments', subcategory: 'Loan Payment' },
  { contains: ['national money'], category: 'Debt Payments' },
  { contains: ['flexiti'], category: 'Debt Payments', subcategory: 'Credit Card' },
  { contains: ['celtic group'], category: 'Debt Payments' },
  { contains: ['b/m payt', 'b/m pay'], category: 'Housing', subcategory: 'Mortgage' },
  { contains: ['td loan payment', 'td loan'], category: 'Debt Payments', subcategory: 'Loan Payment' },

  // ── Entertainment ─────────────────────────────────────────────────────────
  { contains: ['cineplex', 'landmark cinema', 'galaxy cinema', 'empire theatre'], category: 'Entertainment', subcategory: 'Movies' },
  { contains: ['ticketmaster', 'ticket master'], category: 'Entertainment', subcategory: 'Events' },
  { contains: ['river cree'], category: 'Entertainment', subcategory: 'Gaming' },
  { contains: ['bear hills casino', 'casino'], category: 'Entertainment', subcategory: 'Gaming' },
  { contains: ['west ed mall', 'west edmonton mall', 'westmount mall'], category: 'Entertainment', subcategory: 'Shopping' },

  // ── Personal Care ─────────────────────────────────────────────────────────
  { contains: ['great clips', 'greatclips', 'sport clips', 'supercuts'], category: 'Personal Care', subcategory: 'Hair' },
  { contains: ['massage therapy', 'registered massage', 'rmt '], category: 'Personal Care', subcategory: 'Massage' },

  // ── Travel ────────────────────────────────────────────────────────────────
  { contains: ['westjet', 'west jet'], category: 'Travel', subcategory: 'Flights' },
  { contains: ['air canada', 'aircanada'], category: 'Travel', subcategory: 'Flights' },
  { contains: ['flair airlines', 'flair air'], category: 'Travel', subcategory: 'Flights' },
  { contains: ['porter airlines'], category: 'Travel', subcategory: 'Flights' },
  { contains: ['marriott', 'hilton', 'holiday inn', 'best western', 'fairmont', 'delta hotel', 'sheraton'], category: 'Travel', subcategory: 'Hotels' },
  { contains: ['airbnb'], category: 'Travel', subcategory: 'Hotels' },
];

/**
 * Apply global default rules to a merchant name.
 * Returns { category, subcategory? } on match, null otherwise.
 *
 * Uses both normal substring AND compact (spaces/hyphens stripped) comparison
 * so fused all-caps OCR output like "TIMHORTONS" matches keyword "tim horton".
 */
export function applyDefaultRules(merchant: string): { category: string; subcategory?: string } | null {
  const lower = merchant.toLowerCase();
  const lowerCompact = lower.replace(/[\s\-]+/g, '');

  for (const rule of TAG_DEFAULT_RULES) {
    for (const keyword of rule.contains) {
      const kwCompact = keyword.replace(/[\s\-]+/g, '');
      if (lower.includes(keyword) || lowerCompact.includes(kwCompact)) {
        return { category: rule.category, subcategory: rule.subcategory };
      }
    }
  }
  return null;
}
