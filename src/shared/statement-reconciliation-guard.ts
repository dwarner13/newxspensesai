/**
 * P-LIVE-03 (owner 2026-11-26): every financial breakdown Prime presents must reconcile against
 * raw deposits and withdrawals. Deterministic post-answer guard over cash_flow_summary's
 * statementBreakdown (shared engine; no second engine).
 *
 *  - Every money figure in Prime's reply must be a figure the tool returned (a breakdown line, a
 *    statement total, or an aggregate field). Re-derived sums such as "spending + needs review"
 *    (a double count) or "income" presented as "total deposits" fail.
 *  - When the breakdown reconciles, the reply may not invent an "unexplained difference" or
 *    explain one away with an overdraft, starting balance or missing deposits.
 *  - On failure the reply is replaced by the code-owned reconciled table.
 */

export interface BreakdownOutputLine {
  key: string; label: string; direction: 'inflow' | 'outflow'; amount: number; count: number;
}
export interface BreakdownOutput {
  lines: BreakdownOutputLine[];
  totalDeposits: number; totalWithdrawals: number; net: number;
  depositCount: number; withdrawalCount: number;
  reconciled: boolean;
  unexplainedDifference: { deposits: number; withdrawals: number };
  unplacedCount: number;
}
export interface CashFlowForGuard {
  startDate?: string; endDate?: string;
  statementBreakdown?: BreakdownOutput;
  [field: string]: unknown;
}

const MONEY = /(?:-\s?)?\$\s?\d[\d,]*(?:\.\d{1,2})?/g;
const SPECULATION = /\b(overdraft|overdrawn|starting balance|opening balance usage|missing (?:deposit|deposits|data|income|transactions)|(?<!\bno )unexplained difference|outflows exceed inflows)\b/i;
/** Labelled statement totals: the figure after the label must be that exact total. */
const LABELLED_TOTALS: ReadonlyArray<{ rx: RegExp; pick: (b: BreakdownOutput) => number[] }> = [
  { rx: /total deposits?[^$\n]{0,40}(\$\s?\d[\d,]*(?:\.\d{1,2})?)/gi, pick: b => [b.totalDeposits] },
  { rx: /total (?:withdrawals?|outflows?)[^$\n]{0,40}(\$\s?\d[\d,]*(?:\.\d{1,2})?)/gi, pick: b => [b.totalWithdrawals] },
  { rx: /total (?:inflows?)[^$\n]{0,40}(\$\s?\d[\d,]*(?:\.\d{1,2})?)/gi, pick: b => [b.totalDeposits] },
  { rx: /\bnet(?: cash flow| change)?\b[^$\n]{0,25}(-?\s?\$\s?\d[\d,]*(?:\.\d{1,2})?)/gi, pick: b => [Math.abs(b.net)] },
];
const BREAKDOWN_TOPIC = /\b(deposit|deposits|withdrawal|withdrawals|reconcil\w*|breakdown|net cash|cash ?flow|total (?:income|spending|inflows?|outflows?)|money (?:in|out))\b/i;

/** Every dollar figure the tool returned (absolute values, dollars). */
export function knownFigures(cf: CashFlowForGuard): number[] {
  const out = new Set<number>();
  const add = (v: unknown) => { if (typeof v === 'number' && Number.isFinite(v)) out.add(Math.round(Math.abs(v) * 100)); };
  const b = cf.statementBreakdown;
  if (b) {
    b.lines.forEach(l => add(l.amount));
    add(b.totalDeposits); add(b.totalWithdrawals); add(b.net);
    add(b.unexplainedDifference.deposits); add(b.unexplainedDifference.withdrawals);
  }
  for (const k of ['income', 'refunds', 'spending', 'nonSpend', 'netCashFlow', 'debtPayments', 'debtRepaymentsIn', 'transfersIn',
    'transfersOut', 'savingsInvestment', 'otherNonSpend', 'classificationConflict', 'totalInflow', 'totalOutflow',
    'rawNetCashMovement', 'netExcludingInternalMovements']) add(cf[k]);
  const cats = cf.categories;
  if (Array.isArray(cats)) for (const c of cats) add((c as { total?: unknown }).total);
  return [...out].map(c => c / 100);
}

export function moneyFigures(text: string): number[] {
  return (text.match(MONEY) ?? []).map(s => Math.abs(Number(s.replace(/[^\d.]/g, '')))).filter(n => Number.isFinite(n));
}

export interface GuardResult {
  ok: boolean;
  applies: boolean;
  unsupportedFigures: number;
  /** A figure labelled as a statement total (deposits / withdrawals / net) that is not that total. */
  mislabelledTotals: number;
  speculation: boolean;
}

function countMislabelled(reply: string, b: BreakdownOutput): number {
  let bad = 0;
  for (const { rx, pick } of LABELLED_TOTALS) {
    for (const m of reply.matchAll(rx)) {
      const v = Math.round(Math.abs(Number(m[1].replace(/[^\d.]/g, ''))) * 100);
      if (!pick(b).some(t => Math.abs(Math.round(Math.abs(t) * 100) - v) <= 1)) bad++;
    }
  }
  return bad;
}

/**
 * Applies when the turn has a statement breakdown AND the reply (or request) is about totals,
 * deposits, withdrawals or a breakdown and the reply states money figures.
 */
export function guardReconciledAnswer(reply: string, cf: CashFlowForGuard | null | undefined, userMessage = ''): GuardResult {
  const b = cf?.statementBreakdown;
  const figures = moneyFigures(reply || '');
  const applies = !!b && figures.length > 0 && (BREAKDOWN_TOPIC.test(reply) || BREAKDOWN_TOPIC.test(userMessage));
  if (!applies || !b || !cf) return { ok: true, applies: false, unsupportedFigures: 0, mislabelledTotals: 0, speculation: false };
  const known = knownFigures(cf).map(v => Math.round(v * 100));
  const unsupported = figures.filter(f => f !== 0 && !known.some(k => Math.abs(k - Math.round(f * 100)) <= 1)).length;
  const mislabelled = countMislabelled(reply, b);
  const speculation = b.reconciled && SPECULATION.test(reply);
  return { ok: unsupported === 0 && mislabelled === 0 && !speculation, applies: true, unsupportedFigures: unsupported, mislabelledTotals: mislabelled, speculation };
}

function fmt(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

/** Code-owned reconciled answer (used when the model's reply fails the guard). */
export function renderReconciledAnswer(cf: CashFlowForGuard, currency = 'CAD'): string {
  const b = cf.statementBreakdown!;
  const period = cf.startDate && cf.endDate ? ` for ${cf.startDate} to ${cf.endDate}` : '';
  const rows = b.lines.map(l => `| ${l.label} | ${l.direction === 'inflow' ? fmt(l.amount, currency) : '—'} | ${l.direction === 'outflow' ? fmt(l.amount, currency) : '—'} | ${l.count} |`);
  const out = [
    `Here is the reconciled breakdown${period}, built from your imported transactions. Each transaction is counted in exactly one line.`,
    '',
    '| Line | Deposits | Withdrawals | Transactions |',
    '|---|---|---|---|',
    ...rows,
    `| **Total** | **${fmt(b.totalDeposits, currency)}** | **${fmt(b.totalWithdrawals, currency)}** | ${b.depositCount + b.withdrawalCount} |`,
    '',
    `Total deposits ${fmt(b.totalDeposits, currency)} (${b.depositCount}) minus total withdrawals ${fmt(b.totalWithdrawals, currency)} (${b.withdrawalCount}) = net ${fmt(b.net, currency)}.`,
  ];
  if (b.reconciled) {
    out.push('The lines add up exactly to the statement totals: there is no unexplained difference.');
  } else {
    out.push(`The lines do not fully reconcile: deposits differ by ${fmt(b.unexplainedDifference.deposits, currency)} and withdrawals by ${fmt(b.unexplainedDifference.withdrawals, currency)}${b.unplacedCount ? `, and ${b.unplacedCount} transaction(s) could not be placed because their type is unclear` : ''}. I can't explain that difference from the imported data, so I won't guess.`);
  }
  out.push('Refunds are money returned on a purchase category and are not counted as income. Mortgage, loan and card payments are debt repayments, not everyday spending. Cash withdrawals are shown separately.');
  return out.join('\n');
}
