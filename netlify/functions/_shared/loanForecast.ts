/**
 * Loan Forecast Calculator — the ONE amortization routine for every forecast tool
 * (owner "FINAL A-2 APPROVAL" safeguard 1: forecast verification applies globally).
 *
 * Deterministic planning estimates, not regulatory-grade. Verified against closed-form formulas
 * (netlify/functions/__tests__/forecast-verification.test.ts).
 *
 * Model (stated to the customer via `assumptions`):
 *  - the periodic rate is the annual rate divided by payments per year (interest compounds each
 *    payment period); Canadian fixed-rate mortgages compound semi-annually, so a lender's figures
 *    can differ slightly;
 *  - the rate and payment stay constant; no fees, missed payments or new charges.
 *
 * Fixes (2026-11-27 verification): the final payment no longer adds that period's interest twice;
 * a payment that never covers the interest returns `payable: false` (no invented interest estimate);
 * 0% loans are supported; total paid always equals principal + interest.
 */

export type PaymentFrequency = 'weekly' | 'biweekly' | 'monthly';

export const PERIODS_PER_YEAR: Readonly<Record<PaymentFrequency, number>> = { weekly: 52, biweekly: 26, monthly: 12 };

export interface AmortizationResult {
  /** False when the payment never pays the balance off within the cap (or never covers interest). */
  payable: boolean;
  periods: number;
  totalInterest: number;
  totalPaid: number;
  /** Remaining balance after each period (index 0 = after the first payment). */
  balances: number[];
}

/** Period-by-period amortization. Interest is charged once per period; the last payment is only what is owed. */
export function amortize(params: { principal: number; rPeriod: number; payment: number; maxPeriods: number }): AmortizationResult {
  const { principal, rPeriod, payment, maxPeriods } = params;
  if (!(principal > 0) || !(payment > 0) || !(rPeriod >= 0) || !(maxPeriods > 0)) {
    return { payable: false, periods: 0, totalInterest: 0, totalPaid: 0, balances: [] };
  }
  if (payment <= principal * rPeriod) {
    return { payable: false, periods: 0, totalInterest: 0, totalPaid: 0, balances: [] };
  }
  let balance = principal;
  let totalInterest = 0;
  let totalPaid = 0;
  const balances: number[] = [];
  for (let period = 0; period < maxPeriods; period++) {
    const interest = balance * rPeriod;
    totalInterest += interest;
    const owed = balance + interest;
    const paid = Math.min(payment, owed);
    totalPaid += paid;
    balance = owed - paid;
    balances.push(balance);
    if (balance <= 0.005) {
      balances[balances.length - 1] = 0;
      return { payable: true, periods: period + 1, totalInterest, totalPaid, balances };
    }
  }
  return { payable: false, periods: maxPeriods, totalInterest, totalPaid, balances };
}

export function loanForecastAssumptions(frequency: PaymentFrequency, annualRatePct: number): string[] {
  return [
    `Interest at ${annualRatePct}% a year, charged each ${frequency === 'monthly' ? 'month' : frequency === 'biweekly' ? 'two weeks' : 'week'} (annual rate ÷ ${PERIODS_PER_YEAR[frequency]}). Canadian fixed-rate mortgages compound semi-annually, so your lender's figures may differ slightly.`,
    'Rate and payment stay the same for the whole period; no fees, missed payments or new borrowing.',
    'Estimate only — actual results depend on these assumptions holding.',
  ];
}

export interface LoanForecastInput {
  principal: number;
  annualRatePct: number;
  paymentAmount: number;
  paymentFrequency: PaymentFrequency;
  extraPerPeriod?: number;
  maxYears?: number; // default 40 safety cap
}

export interface LoanForecastOutput {
  principal: number;
  annualRatePct: number;
  paymentAmount: number;
  paymentFrequency: PaymentFrequency;
  extraPerPeriod: number;
  payableOriginal: boolean;
  payableWithExtra: boolean;
  periodsOriginal: number;
  yearsOriginal: number;
  interestOriginal: number;
  periodsWithExtra: number;
  yearsWithExtra: number;
  interestWithExtra: number;
  interestSaved: number;
  yearsSaved: number;
  assumptions: string[];
}

const money = (n: number) => Math.round(n * 100) / 100;

/** Loan payoff with and without an extra payment per period. */
export function calculateLoanForecast(input: LoanForecastInput): LoanForecastOutput {
  const { principal, annualRatePct, paymentAmount, paymentFrequency, extraPerPeriod = 0, maxYears = 40 } = input;
  const periodsPerYear = PERIODS_PER_YEAR[paymentFrequency];
  if (!periodsPerYear) throw new Error(`Unsupported payment frequency: ${paymentFrequency}`);
  const rPeriod = annualRatePct / 100 / periodsPerYear;
  const maxPeriods = maxYears * periodsPerYear;

  const original = amortize({ principal, rPeriod, payment: paymentAmount, maxPeriods });
  const withExtra = amortize({ principal, rPeriod, payment: paymentAmount + extraPerPeriod, maxPeriods });
  const both = original.payable && withExtra.payable;

  return {
    principal: money(principal),
    annualRatePct: Math.round(annualRatePct * 1000) / 1000,
    paymentAmount: money(paymentAmount),
    paymentFrequency,
    extraPerPeriod: money(extraPerPeriod),
    payableOriginal: original.payable,
    payableWithExtra: withExtra.payable,
    periodsOriginal: original.periods,
    yearsOriginal: money(original.periods / periodsPerYear),
    interestOriginal: money(original.totalInterest),
    periodsWithExtra: withExtra.periods,
    yearsWithExtra: money(withExtra.periods / periodsPerYear),
    interestWithExtra: money(withExtra.totalInterest),
    interestSaved: both ? money(original.totalInterest - withExtra.totalInterest) : 0,
    yearsSaved: both ? money((original.periods - withExtra.periods) / periodsPerYear) : 0,
    assumptions: loanForecastAssumptions(paymentFrequency, annualRatePct),
  };
}
