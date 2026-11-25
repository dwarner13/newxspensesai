/**
 * P-LIVE-02 — the customer's explicit scope always beats a default period.
 *
 * Two deterministic signals, applied on top of Prime's resolved temporal scope:
 *
 *  1. ALL-HISTORY requests ("all the transactions I've ever uploaded", "my entire history",
 *     "all time", "since I started", "everything I've imported"…). They mean every imported
 *     transaction, never the current month and never a period inherited from the conversation.
 *
 *  2. NEGATED periods ("I don't mean November", "not just this month", "rather than October").
 *     A period the customer explicitly rules out must never become the scope. The temporal
 *     parser sees the month name and would otherwise resolve it as the requested period.
 *
 * Pure, no I/O. A narrower period the customer actually asks for still wins (an explicit,
 * non-negated period is never overridden by a weak "all transactions" phrase).
 */

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
// Trailing \b: "not decide" must never read as "not December".
const MONTH_RE = `(?:${MONTHS.join('|')}|jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec)\\b`;
const RELATIVE_RE = '(?:this|last|current|previous|the\\s+current|the\\s+last)\\s+(?:month|year|week|quarter)\\b';
const PERIOD_RE = `(?:${MONTH_RE}(?:\\s+\\d{4})?|${RELATIVE_RE})`;

/** Strong all-history phrases: they mean every imported transaction. */
const STRONG_ALL_HISTORY: readonly RegExp[] = [
  /\bever\s+(?:uploaded|imported|added|loaded|had|made|recorded|synced)\b/i,
  /\b(?:i'?ve|i\s+have|we'?ve|we\s+have)\s+ever\b/i,
  /\b(?:entire|whole|full|complete)\s+(?:transaction\s+)?(?:history|record|records|account\s+history|data\s*set|dataset|ledger)\b/i,
  /\ball[\s-]+time\b/i,
  /\b(?:since|from)\s+(?:the\s+(?:very\s+)?beginning|day\s+one|the\s+start|i\s+(?:first\s+)?(?:started|joined|signed\s+up))\b/i,
  /\beverything\s+(?:i'?ve|i\s+have|we'?ve|we\s+have)?\s*(?:ever\s+)?(?:uploaded|imported|added)\b/i,
  /\bevery\s+(?:single\s+)?transaction\b/i,
  /\ball\s+(?:of\s+)?(?:my|the)\s+(?:imported\s+|uploaded\s+)?(?:transactions|statements|history)\s+(?:i'?ve|i\s+have|that\s+i'?ve|ever)\b/i,
  /\bacross\s+(?:all|every)\s+(?:my\s+)?(?:statements|months|years|imports|uploads)\b/i,
  /\bnot\s+just\s+(?:this|one|a\s+single|the\s+current|the\s+last)\s+(?:month|statement|period)\b/i,
];

/** Weak phrases: all-history only when no explicit (non-negated) period is present. */
const WEAK_ALL_HISTORY: readonly RegExp[] = [
  /\ball\s+(?:of\s+)?(?:my|the)\s+(?:imported\s+|uploaded\s+)?transactions\b/i,
  /\ball\s+(?:of\s+)?(?:my|the)\s+(?:statements|imports|uploads)\b/i,
  /\boverall\b/i,
  /\bin\s+total\b/i,
];

/** Phrases that rule a period out. Group 1 is the period text. */
const NEGATION_RES: readonly RegExp[] = [
  new RegExp(`\\b(?:don'?t|do\\s+not|didn'?t|did\\s+not)\\s+(?:just\\s+|only\\s+)?mean\\s+(?:just\\s+|only\\s+)?(?:the\\s+)?(?:month\\s+of\\s+)?(${PERIOD_RE})`, 'gi'),
  new RegExp(`\\bnot\\s+(?:just\\s+|only\\s+)?(?:for\\s+|in\\s+|from\\s+)?(?:the\\s+month\\s+of\\s+)?(${PERIOD_RE})`, 'gi'),
  new RegExp(`\\b(?:rather\\s+than|instead\\s+of|other\\s+than|besides|apart\\s+from|beyond)\\s+(?:just\\s+)?(?:the\\s+)?(?:month\\s+of\\s+)?(${PERIOD_RE})`, 'gi'),
  new RegExp(`\\b(?:forget|ignore|never\\s*mind)\\s+(?:about\\s+)?(?:the\\s+)?(${PERIOD_RE})`, 'gi'),
];

const MONTH_ABBREV: Record<string, string> = {
  jan: 'january', feb: 'february', mar: 'march', apr: 'april', jun: 'june', jul: 'july', aug: 'august',
  sep: 'september', sept: 'september', oct: 'october', nov: 'november', dec: 'december',
};

function normalisePeriodText(t: string): string {
  const s = t.toLowerCase().replace(/\s+/g, ' ').trim();
  const first = s.split(' ')[0];
  const full = MONTH_ABBREV[first] ?? first;
  return MONTHS.includes(full) ? full : s.replace(/^the /, '').replace(/^(current)/, 'this').replace(/^previous/, 'last');
}

/** Periods the customer explicitly ruled out, normalised ("november", "this month", "last month"…). */
export function negatedPeriods(message: string): string[] {
  const m = String(message || '');
  const out = new Set<string>();
  for (const re of NEGATION_RES) {
    re.lastIndex = 0;
    let hit: RegExpExecArray | null;
    while ((hit = re.exec(m)) !== null) out.add(normalisePeriodText(hit[1]));
  }
  return [...out];
}

/** The message with every "don't mean X" / "not X" / "rather than X" phrase removed. */
export function stripNegatedPeriods(message: string): string {
  let m = String(message || '');
  for (const re of NEGATION_RES) {
    re.lastIndex = 0;
    m = m.replace(re, ' ');
  }
  return m.replace(/\s+/g, ' ').trim();
}

export function hasStrongAllHistoryPhrase(message: string): boolean {
  const m = String(message || '');
  return STRONG_ALL_HISTORY.some(re => re.test(m));
}

export function hasWeakAllHistoryPhrase(message: string): boolean {
  const m = String(message || '');
  return WEAK_ALL_HISTORY.some(re => re.test(m));
}

/** Minimal temporal scope shape (from inclusive, to exclusive). */
export interface TemporalScopeLike {
  primary?: { from: string; to: string; label?: string; source?: string } | null;
  [k: string]: unknown;
}

/** True when the resolved primary period is one the customer ruled out. */
export function isPrimaryPeriodNegated(scope: TemporalScopeLike | null | undefined, negated: readonly string[]): boolean {
  const p = scope?.primary;
  if (!p || negated.length === 0) return false;
  const label = String(p.label || '').toLowerCase();
  const monthOfFrom = /^\d{4}-(\d{2})-/.exec(p.from || '');
  const fromMonth = monthOfFrom ? MONTHS[Number(monthOfFrom[1]) - 1] : null;
  return negated.some(n => {
    if (MONTHS.includes(n)) return label.includes(n) || (p.source === 'month_name' && fromMonth === n);
    // relative periods: compare by label words ("this month", "last month", "current month")
    const words = n.split(' ');
    return words.every(w => label.includes(w)) || (n === 'this month' && /current month/.test(label));
  });
}

export interface CustomerScopeDecision<T extends TemporalScopeLike> {
  /** Scope to use after the customer's explicit instructions (null = no period). */
  temporalScope: T | null;
  /** The customer asked for every imported transaction. */
  allHistory: boolean;
  /** Periods the customer ruled out (normalised). */
  negated: string[];
  /** The parsed primary period was dropped because the customer ruled it out. */
  droppedNegatedPeriod: boolean;
  /** Any explicit instruction changed the scope: inheritance from the conversation must not apply. */
  overridesConversation: boolean;
}

/**
 * Apply the customer's explicit scope to the parsed temporal scope.
 *  - A ruled-out period is dropped.
 *  - A strong all-history phrase, or a weak one with no remaining explicit period, means all history.
 *  - A remaining explicit period (not ruled out) stays: the narrower explicit request wins.
 */
export function applyCustomerScope<T extends TemporalScopeLike>(
  scope: T | null | undefined,
  message: string,
  /** Re-run the period parser on text (used to recover "I don't mean November, I mean October"). */
  reparse?: (text: string) => T | null | undefined,
): CustomerScopeDecision<T> {
  const negated = negatedPeriods(message);
  const dropped = isPrimaryPeriodNegated(scope, negated);
  let remaining: T | null = dropped ? null : (scope ?? null);
  if (dropped && reparse) {
    // The parser keeps only the first period it sees; with the ruled-out phrase removed, a
    // period the customer DID ask for ("I mean October") becomes the primary.
    try {
      const again = reparse(stripNegatedPeriods(message)) ?? null;
      if (again?.primary && !isPrimaryPeriodNegated(again, negated)) remaining = again;
    } catch {
      // keep remaining = null
    }
  }
  const hasExplicitPeriod = !!remaining?.primary;
  const strong = hasStrongAllHistoryPhrase(message);
  const weak = hasWeakAllHistoryPhrase(message);
  const allHistory = !hasExplicitPeriod && (strong || weak);
  return {
    temporalScope: allHistory ? null : remaining,
    allHistory,
    negated,
    droppedNegatedPeriod: dropped,
    overridesConversation: allHistory || dropped || negated.length > 0,
  };
}

/** System note for Prime when the customer asked for all history. */
export const ALL_HISTORY_SCOPE_NOTE =
  'CUSTOMER SCOPE: ALL HISTORY. The customer asked about every transaction they have ever imported, not the current month and not a period from earlier in this conversation. Use all imported transactions. This is a read-only request they already made: do not ask for permission, do not ask them to confirm or repeat it, and do not narrow it to a month. State that the answer covers all imported transactions.';

export function negatedPeriodNote(negated: readonly string[]): string {
  return `CUSTOMER SCOPE: the customer explicitly said they do NOT mean ${negated.map(n => (MONTHS.includes(n) ? n[0].toUpperCase() + n.slice(1) : n)).join(' or ')}. Never use that period as the scope.`;
}
