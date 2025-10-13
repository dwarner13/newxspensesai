/**
 * 📧 Email Scoring System
 * Ranks emails by likelihood of being financial statements/invoices/receipts
 */

export type FinanceEmail = {
  id: string;
  internalId?: string;    // Gmail message ID
  date: string;           // ISO string
  from: string;
  subject: string;
  snippet?: string;
  hasAttachment?: boolean;
  attachmentNames?: string[];
};

export type ScoredEmail = FinanceEmail & {
  score: number;
};

const KEYWORDS = [
  'statement','invoice','receipt','bill','billing','account activity',
  'monthly statement','monthly summary','card ending','ending in','payment due',
  'transaction history','account summary','payment confirmation','order confirmation',
  'purchase confirmation','balance','total due','amount due'
];

const SENDER_WHITELIST = [
  'visa','mastercard','americanexpress','amex','stripe','paypal','square',
  'capitalone','chase','bmo','td','rbc','scotiabank','cibc','desjardins',
  'wise','revolut','moneris','shopify','apple','google','amazon',
  'wellsfargo','bankofamerica','citi','discover','tangerine','simplii',
  'netflix','spotify','zoom','bell','rogers','telus','fido','att','verizon','tmobile'
];

/**
 * Score email for finance document likelihood (0-100+)
 * 
 * Breakdown:
 * - Recentness: 0-40 (90 day decay)
 * - Attachments: 0-20
 * - Keywords: 0-25
 * - Sender reputation: 0-10
 * - Card hint: 0-5
 */
export function scoreFinanceEmail(m: FinanceEmail, now = Date.now()): number {
  const sub = (m.subject || '').toLowerCase();
  const snip = (m.snippet || '').toLowerCase();
  const from = (m.from || '').toLowerCase();

  // recency: 0..40 (90 day half-life)
  const ageMs = Math.max(0, now - Date.parse(m.date));
  const ageDays = ageMs / (1000*60*60*24);
  const recency = Math.max(0, 40 - Math.min(40, (ageDays/90)*40));

  // attachments: 0 or 20
  const attach = m.hasAttachment ? 20 : 0;

  // keywords: up to 25 (each keyword adds 5, max 5 keywords)
  const hay = `${sub}\n${snip}`;
  let kw = 0;
  for (const k of KEYWORDS) if (hay.includes(k)) kw += 5;
  kw = Math.min(25, kw);

  // sender reputation: up to 10
  let rep = 0;
  for (const s of SENDER_WHITELIST) if (from.includes(s)) { rep = 10; break; }

  // card hint: +5
  const cardHint = /ending\s+in|\bcard\s+ending\b|\blast\s+four\b/.test(hay) ? 5 : 0;

  return recency + attach + kw + rep + cardHint; // 0..100+
}

/**
 * Rank multiple emails by score
 */
export function rankEmails(emails: FinanceEmail[], limit: number = 5): ScoredEmail[] {
  return emails
    .map(m => ({ ...m, score: scoreFinanceEmail(m) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
