import type { PayoffFrequency, PayoffInput } from './financePayoff.js';
import { normalizeFrequency } from './financePayoff.js';

export type LoanType = 'mortgage' | 'auto_loan' | 'credit_card' | 'personal_loan' | 'unknown';

export type LoanFactsResult = {
  found: boolean;
  loanType: LoanType;
  facts: Partial<PayoffInput> & { annualRate?: number };
  missing: string[];
  hints: string[];
};

type ResolveContext = {
  primeContext?: any;
};

function toNumber(value: any): number | null {
  if (value === null || typeof value === 'undefined') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const cleaned = String(value).replace(/[^0-9.+-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampPositive(value: number | null): number | undefined {
  if (value === null) return undefined;
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return Math.round(value * 100) / 100;
}

function detectLoanType(text: string): LoanType {
  if (/\b(mortgage|home loan|renewal rate|renewal)\b/i.test(text)) return 'mortgage';
  if (/\b(car loan|auto loan|vehicle loan)\b/i.test(text)) return 'auto_loan';
  if (/\b(credit card|visa|mastercard|amex|card balance)\b/i.test(text)) return 'credit_card';
  if (/\b(personal loan|line of credit|loc)\b/i.test(text)) return 'personal_loan';
  return 'unknown';
}

function detectFrequency(text: string): PayoffFrequency | undefined {
  const normalized = normalizeFrequency(text);
  return normalized.label === 'unknown' ? undefined : normalized.label;
}

function pullFromSnapshot(snapshot: any): Partial<PayoffInput> {
  const raw =
    snapshot?.loan_facts ||
    snapshot?.tag_json?.loan_facts ||
    snapshot?.crystal_json?.loan_summary ||
    snapshot?.finley_json?.payoff?.baseline_assumptions ||
    snapshot?.payoff?.baseline_assumptions ||
    {};
  const paymentFrequency = detectFrequency(String(raw?.paymentFrequency || raw?.frequency || ''));
  return {
    principal: clampPositive(toNumber(raw?.principal ?? raw?.balance)),
    annualRate: clampPositive(toNumber(raw?.annualRate ?? raw?.apr ?? raw?.rate)),
    paymentAmount: clampPositive(toNumber(raw?.paymentAmount ?? raw?.payment)),
    paymentFrequency,
  };
}

function parseNumbers(messageText: string): Partial<PayoffInput> {
  const text = String(messageText || '');
  const out: Partial<PayoffInput> = {};

  const currencyNumber = (rx: RegExp): number | undefined => {
    const m = text.match(rx);
    if (!m) return undefined;
    return clampPositive(toNumber(m[1]));
  };

  out.principal = currencyNumber(/\b(?:balance|principal|owe|owing)\s*(?:is|of|:)?\s*\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i);
  out.paymentAmount = currencyNumber(/\b(?:payment|paying|minimum payment|monthly payment|biweekly payment|weekly payment)\s*(?:is|of|:)?\s*\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i);

  const aprMatch = text.match(/\b(?:apr|interest(?: rate)?|rate)\s*(?:is|of|:)?\s*([0-9]{1,2}(?:\.[0-9]+)?)\s*%/i);
  out.annualRate = clampPositive(toNumber(aprMatch?.[1]));

  const freq = detectFrequency(text);
  if (freq) out.paymentFrequency = freq;

  const extraMatch = text.match(/\bextra(?:\s+payment)?\s*(?:is|of|:)?\s*\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i);
  const lumpMatch = text.match(/\b(?:lump sum|one[- ]time)\s*(?:is|of|:)?\s*\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i);
  const extra = clampPositive(toNumber(extraMatch?.[1]));
  const lump = clampPositive(toNumber(lumpMatch?.[1]));
  if (typeof extra === 'number') out.extraPayment = extra;
  if (typeof lump === 'number') out.lumpSum = lump;

  // Manual terse inputs, e.g. "balance 10000 rate 7.2 payment 250 monthly"
  if (!out.principal) out.principal = currencyNumber(/\bbalance\s+\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i);
  if (!out.paymentAmount) out.paymentAmount = currencyNumber(/\bpayment\s+\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i);
  if (!out.annualRate) {
    const shortRate = text.match(/\brate\s+([0-9]{1,2}(?:\.[0-9]+)?)\b/i);
    out.annualRate = clampPositive(toNumber(shortRate?.[1]));
  }

  return out;
}

export function resolveLoanFacts(
  _ctx: ResolveContext,
  messageText: string,
  snapshot?: any
): LoanFactsResult {
  const text = String(messageText || '');
  const snapshotFacts = pullFromSnapshot(snapshot);
  const userFacts = parseNumbers(text);

  const facts: Partial<PayoffInput> = {
    principal: userFacts.principal ?? snapshotFacts.principal,
    annualRate: userFacts.annualRate ?? snapshotFacts.annualRate,
    paymentAmount: userFacts.paymentAmount ?? snapshotFacts.paymentAmount,
    paymentFrequency: userFacts.paymentFrequency ?? snapshotFacts.paymentFrequency,
    extraPayment: userFacts.extraPayment ?? snapshotFacts.extraPayment,
    lumpSum: userFacts.lumpSum ?? snapshotFacts.lumpSum,
  };

  const loanType =
    detectLoanType(text) !== 'unknown'
      ? detectLoanType(text)
      : detectLoanType(String(snapshot?.loan_type || snapshot?.finley_json?.payoff?.loan_type || ''));

  const missing: string[] = [];
  if (!facts.principal) missing.push('balance');
  if (typeof facts.annualRate !== 'number') missing.push('rate');
  if (!facts.paymentAmount) missing.push('paymentAmount');
  if (!facts.paymentFrequency) missing.push('frequency');

  const hints: string[] = [];
  if (missing.includes('balance')) hints.push("Look for 'Balance' in your loan screen or statement.");
  if (missing.includes('rate')) hints.push("Look for 'Interest rate' or APR.");
  if (missing.includes('paymentAmount')) hints.push("Look for 'Payment amount' or minimum payment.");
  if (missing.includes('frequency')) hints.push('Tell me weekly, biweekly, semi-monthly, or monthly.');

  return {
    found: Boolean(facts.principal || facts.annualRate || facts.paymentAmount || facts.paymentFrequency),
    loanType: loanType || 'unknown',
    facts,
    missing,
    hints,
  };
}
