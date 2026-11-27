/**
 * C-1 (owner GO 2026-11-27, FINANCIAL GROUNDING AUTHORIZATION) — first slice of the Phase 2
 * TurnEvidenceLedger: the reply verifier for money figures.
 *
 * The owner's five categories decide what a figure in a reply needs:
 *   1. VERIFIED       — returned by a financial tool THIS turn (± 1 cent).            → allowed
 *   2. CUSTOMER       — the customer stated it in this message.                       → allowed
 *   3. HYPOTHETICAL   — an example / scenario / "if…" calculation.                     → allowed
 *   4. DERIVED        — arithmetic on verified or customer figures (a ± b, a × k, a ÷ k). → allowed
 *   5. UNVERIFIED     — anything else stated as the customer's ACTUAL financial activity,
 *                        including amounts from earlier AI replies or remembered context.  → rejected
 * A figure that is not a claim about the customer's actual activity (a general fact such as a
 * contribution limit) is never blocked. Memory, history and earlier replies are NEVER evidence.
 *
 * Money only in this slice (counts and percentages are not checked). Pure; no I/O.
 */

export type FigureCategory = 'verified' | 'customer' | 'hypothetical' | 'derived' | 'general' | 'unverified_actual';

export interface ReplyFigure { cents: number; text: string; sentence: string; category: FigureCategory }

export interface ReplyVerification {
  ok: boolean;
  figures: ReplyFigure[];
  unsupported: ReplyFigure[];
  counts: Record<FigureCategory, number>;
}

export interface VerifyInput {
  /** Every money figure (dollars, any sign) returned by financial tools this turn. */
  toolFigures: readonly number[];
  /** The customer's message this turn. */
  userMessage: string;
  /** FINANCIAL POSITION figures (all accounts, all time): accepted only when the sentence says so. */
  positionFigures?: readonly number[];
  /**
   * Same-turn tool figures by financial MEANING, in cents (meaningFiguresFromToolResult). A named total
   * ("Deposits: …") must match a figure of the SAME meaning when the tools served one — a matching
   * number with another meaning (e.g. the income figure presented as deposits) is rejected.
   */
  meaningFigures?: ReadonlyMap<string, ReadonlySet<number>>;
}

/** The meaning a named-total sentence asserts, or null. */
function namedTotalMeaning(sentence: string): 'deposits' | 'withdrawals' | 'net' | 'income' | 'spending' | null {
  const m = sentence.match(NAMED_TOTAL);
  if (!m) return null;
  const term = (m[2] || m[5] || '').toLowerCase();
  if (/deposit/.test(term)) return 'deposits';
  if (/withdrawal/.test(term)) return 'withdrawals';
  if (/net|cash flow/.test(term)) return 'net';
  if (/income/.test(term)) return 'income';
  if (/spending/.test(term)) return 'spending';
  return null;
}

/** $1,234.56 · CA$12 · 1,234.56 CAD · -$45 (a bare number is not treated as money). */
const MONEY = /(?:-\s?)?(?:(?:CA|US|C|A)?\$\s?\d[\d,]*(?:\.\d{1,2})?|\d[\d,]*(?:\.\d{1,2})?\s?(?:CAD|USD|dollars)\b)/gi;

const HYPOTHETICAL = /\b(if|suppose|supposing|assum(e|es|ed|ing)|hypothetical(ly)?|for example|for instance|e\.g\.|imagine|let'?s say|say you|would|could|might|scenario|projection|projected|estimate[ds]?|at this rate|per month for|example|what if|plan to|aim(ing)? for|target|budget of)\b/i;

/** Words that describe the customer's actual money movements. */
const ACTIVITY = /\b(spent|spend(ing|s)?|paid|pay(ments?)?|deposit(s|ed)?|withdraw(al|als|n)?|withdrew|received|earned|income|net|cash ?flow|balance|total(led|ed|s)?|charged|charges?|transactions?|statement|bills?|saved|savings|refund(s|ed)?|transfer(s|red)?|owe[ds]?|expenses?|outflow|inflow)\b/i;
const SECOND_PERSON = /\b(you|your|you've|you're)\b/i;
/** "Deposits: $X", "**Net Cash Flow:** -$X", "- Spending — $X" */
const LABEL_LINE = /^\s*(?:[-*•]\s*)?\**\s*(deposits|withdrawals|net cash flow|net|actual income|actual spending|income|spending|refunds|total[\w ]*|balance)\s*\**\s*[:—–-]/i;
/**
 * A NAMED TOTAL (deposits / withdrawals / net / cash flow / income / spending stated as the total) must
 * equal a tool figure directly — arithmetic is not enough (AI Architecture HQ: labelled figures must
 * match a same-turn scoped tool). f64d820f: a wrong "Deposits" equal to true deposits minus one
 * transaction would otherwise pass as "derived".
 */
const NAMED_TOTAL = /(^\s*(?:[-*•]\s*)?\**\s*(deposits|withdrawals|net cash flow|net|actual income|actual spending|income|spending|cash flow)\s*\**\s*[:—–-])|\b(your |the |total |statement'?s? )(total )?(deposits|withdrawals|net cash flow|cash flow|income|spending)\b[^.]{0,40}\b(was|were|is|are|came to|totall?ed|of)\b/i;
const POSITION_SCOPE = /\b(all (of )?your (imported )?accounts|all imported accounts|all time|across all (your )?accounts|overall,? across)\b/i;

const MULTIPLIERS = Array.from({ length: 59 }, (_, i) => i + 2); // 2 … 60 (months, weeks, people …)

function toCents(text: string): number {
  return Math.round(Math.abs(Number(text.replace(/[^\d.]/g, ''))) * 100);
}

function sentencesOf(reply: string): string[] {
  const out: string[] = [];
  for (const line of reply.split(/\n+/)) {
    // keep label lines whole; split prose on sentence ends
    if (LABEL_LINE.test(line)) { out.push(line); continue; }
    out.push(...line.split(/(?<=[.!?])\s+(?=[A-Z*•-])/));
  }
  return out.filter(s => s.trim());
}

function near(set: ReadonlySet<number>, c: number): boolean {
  return set.has(c) || set.has(c - 1) || set.has(c + 1);
}

function derivedFrom(base: readonly number[], c: number): boolean {
  const vals = base.length > 400 ? base.slice(0, 400) : base;
  const set = new Set(vals);
  for (let i = 0; i < vals.length; i++) {
    for (let j = i; j < vals.length; j++) {
      if (Math.abs(vals[i] + vals[j] - c) <= 1 || Math.abs(Math.abs(vals[i] - vals[j]) - c) <= 1) return true;
    }
    for (const k of MULTIPLIERS) {
      if (Math.abs(vals[i] * k - c) <= k || Math.abs(Math.round(vals[i] / k) - c) <= 1) return true;
    }
  }
  return near(set, c);
}

export function verifyReplyFigures(reply: string, input: VerifyInput): ReplyVerification {
  const tool = [...new Set(input.toolFigures.filter(n => Number.isFinite(n)).map(n => Math.round(Math.abs(n) * 100)))];
  const toolSet = new Set(tool);
  const customer = [...new Set((input.userMessage.match(MONEY) ?? []).map(toCents))];
  const customerSet = new Set(customer);
  const position = new Set((input.positionFigures ?? []).filter(n => Number.isFinite(n)).map(n => Math.round(Math.abs(n) * 100)));
  const base = [...tool, ...customer];

  const figures: ReplyFigure[] = [];
  for (const sentence of sentencesOf(reply || '')) {
    for (const m of sentence.matchAll(MONEY)) {
      const cents = toCents(m[0]);
      if (!Number.isFinite(cents) || cents === 0) continue;
      let category: FigureCategory;
      const asserted = namedTotalMeaning(sentence);
      const sameMeaning = asserted ? input.meaningFigures?.get(asserted) : undefined;
      if (asserted && sameMeaning && sameMeaning.size > 0 && !near(sameMeaning as ReadonlySet<number>, cents)) {
        // meaning mismatch: the tools served this total and the reply's figure is not it
        category = 'unverified_actual';
      } else if (near(toolSet, cents)) category = 'verified';
      else if (near(customerSet, cents)) category = 'customer';
      else if (position.size > 0 && near(position, cents) && POSITION_SCOPE.test(sentence)) category = 'verified';
      else if (HYPOTHETICAL.test(sentence)) category = 'hypothetical';
      else if (base.length > 0 && !NAMED_TOTAL.test(sentence) && derivedFrom(base, cents)) category = 'derived';
      else if (ACTIVITY.test(sentence) && (SECOND_PERSON.test(sentence) || LABEL_LINE.test(sentence))) category = 'unverified_actual';
      else category = 'general';
      figures.push({ cents, text: m[0], sentence: sentence.trim(), category });
    }
  }
  const counts = { verified: 0, customer: 0, hypothetical: 0, derived: 0, general: 0, unverified_actual: 0 } as Record<FigureCategory, number>;
  for (const f of figures) counts[f.category]++;
  const unsupported = figures.filter(f => f.category === 'unverified_actual');
  return { ok: unsupported.length === 0, figures, unsupported, counts };
}

/**
 * Ledger rule (C-5 T7; folds P-LIVE-03's overdraft rule onto the ledger so it applies on EVERY reply,
 * not only when a statement breakdown was fetched): a claim about an overdraft, a negative balance or
 * a bounced payment needs BALANCE evidence from a tool this turn. Without it the sentence is removed.
 * Hypothetical phrasing ("if you went overdrawn…") is kept.
 */
const BALANCE_SPECULATION = /\b(overdraft|overdrawn|negative balance|below zero|bounced|NSF|insufficient funds|running (low|out of money)|heading toward (an )?overdraft)\b/i;

export function removeUnsupportedBalanceSpeculation(reply: string, hasBalanceEvidence: boolean): { text: string; removed: number } {
  if (hasBalanceEvidence || !BALANCE_SPECULATION.test(reply)) return { text: reply, removed: 0 };
  let removed = 0;
  const kept = reply.split(/\n/).map(line => {
    const parts = line.split(/(?<=[.!?])\s+/);
    const keep = parts.filter(s => {
      const drop = BALANCE_SPECULATION.test(s) && !/\b(if|suppose|assum\w*|hypothetical\w*|for example|what if)\b/i.test(s);
      if (drop) removed++;
      return !drop;
    });
    return keep.join(' ');
  });
  const text = kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return { text: text || reply, removed: text ? removed : 0 };
}

/** Code-owned limitation text (owner: explain the limitation rather than guess). */
export const VERIFIED_FIGURES_UNAVAILABLE_TEXT =
  "I can't get verified figures for that right now, so I won't guess. Please try again in a moment.";

/** Code-owned clarification when the scope cannot be resolved (asks; never infers the statement from text). */
export const WHICH_PERIOD_TEXT =
  'Which statement or period should I use? Tell me the month or date range and I\'ll give you the verified figures.';

export type EvidenceAction = 'kept' | 'regenerated' | 'asked' | 'unavailable';

export interface EnforceEvidenceInput {
  reply: string;
  /** Verifies a candidate reply against the CURRENT ledger (re-reads it, so new evidence counts). */
  verify: (text: string) => ReplyVerification;
  /** Resolved period for the evidence-first lookup (this turn's or the inherited one); null = unknown. */
  period: { from: string; to: string; label: string } | null;
  /** Remaining function time in ms (the lookup + regeneration must fit). */
  remainingMs: number;
  /** Runs cash_flow_summary for the period and records it in the ledger; null when unavailable/failed. */
  runCashFlow: ((period: { from: string; to: string; label: string }) => Promise<unknown | null>) | null;
  /** One regeneration with the new evidence; null on failure. */
  regenerate: (evidence: unknown) => Promise<string | null>;
}

/** Minimum remaining time for the one evidence-first lookup + regeneration. */
export const EVIDENCE_RETRY_MIN_MS = 25_000;

/**
 * C-1 decision (pure orchestration; I/O is injected). Never loops; never returns unverified text:
 *   verified → kept · else period known + time + tool → one lookup + one regeneration, re-verified →
 *   regenerated · else no period → asked · else → unavailable (the code-owned limitation text).
 */
export async function enforceReplyEvidence(input: EnforceEvidenceInput): Promise<{ text: string; action: EvidenceAction; first: ReplyVerification }> {
  const first = input.verify(input.reply);
  if (first.ok) return { text: input.reply, action: 'kept', first };
  if (!input.period) return { text: WHICH_PERIOD_TEXT, action: 'asked', first };
  if (input.runCashFlow && input.remainingMs > EVIDENCE_RETRY_MIN_MS) {
    try {
      const evidence = await input.runCashFlow(input.period);
      if (evidence) {
        const regenerated = await input.regenerate(evidence);
        if (typeof regenerated === 'string' && regenerated.trim() && input.verify(regenerated).ok) {
          return { text: regenerated, action: 'regenerated', first };
        }
      }
    } catch { /* fall through to the limitation text */ }
  }
  return { text: VERIFIED_FIGURES_UNAVAILABLE_TEXT, action: 'unavailable', first };
}

/** System instruction for the single evidence-first regeneration. */
export function evidenceRegenerationInstruction(): string {
  return [
    'EVIDENCE CHECK: your previous draft stated amounts about the customer\'s actual finances that are not in this turn\'s verified tool results.',
    'Rewrite the answer in your normal voice using ONLY amounts from the verified financial tool results in this conversation turn.',
    'Amounts from earlier replies or remembered context are not verified and must not be stated as current.',
    'Hypothetical examples and the customer\'s own figures remain fine. If a figure is not available, say so plainly instead of estimating.',
  ].join('\n');
}
