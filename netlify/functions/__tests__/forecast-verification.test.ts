/* eslint-disable @typescript-eslint/no-explicit-any -- tool results */
/**
 * Forecast verification (owner "FINAL A-2 APPROVAL" safeguard 1 + F-1, 2026-11-27): every forecast
 * tool's calculations are checked against INDEPENDENT closed-form formulas, and its stated
 * assumptions are checked. A forecast tool is offered to any employee only when it is listed in
 * VERIFIED_FORECAST_TOOLS, and only tools covered here may be listed.
 */
import { describe, it, expect } from 'vitest';
import { amortize, calculateLoanForecast } from '../_shared/loanForecast';
import { execute as debtPayoff } from '../../../src/agent/tools/impl/finley_debt_payoff_forecast';
import { execute as savings } from '../../../src/agent/tools/impl/finley_savings_forecast';
import { execute as loan } from '../../../src/agent/tools/impl/finley_loan_forecast';
import { execute as analytics } from '../../../src/agent/tools/impl/analytics_forecast';
import { FORECAST_TOOLS, VERIFIED_FORECAST_TOOLS } from '../../../src/shared/employee-tool-authorization';

const ctx = { userId: 'synthetic' };
/** Closed-form months to repay B at periodic rate r with payment P. */
const nClosed = (B: number, r: number, P: number) => (r === 0 ? B / P : -Math.log(1 - (r * B) / P) / Math.log(1 + r));
/** Closed-form level payment for B over n periods at rate r. */
const pmt = (B: number, r: number, n: number) => (r === 0 ? B / n : (B * r) / (1 - Math.pow(1 + r, -n)));
/** Future value: start S, contribution C at the START of each period, rate r, n periods (annuity due). */
const fvDue = (S: number, C: number, r: number, n: number) =>
  r === 0 ? S + C * n : S * Math.pow(1 + r, n) + C * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);

describe('shared amortization routine', () => {
  it('matches the closed-form payoff period; total paid = principal + interest', () => {
    for (const [B, apr, P] of [[2000, 0.1999, 100], [5000, 0.18, 200], [25000, 0.069, 494.2], [10000, 0, 250]] as const) {
      const r = apr / 12;
      const a = amortize({ principal: B, rPeriod: r, payment: P, maxPeriods: 600 });
      expect(a.payable).toBe(true);
      expect(a.periods).toBe(Math.ceil(nClosed(B, r, P) - 1e-9));
      expect(a.totalPaid).toBeCloseTo(B + a.totalInterest, 6);
      expect(a.balances[a.balances.length - 1]).toBe(0);
    }
  });

  it('standard 5-year loan: $10,000 at 6% with the exact level payment → 60 months, interest ≈ $1,599.68', () => {
    const P = pmt(10000, 0.06 / 12, 60);
    const a = amortize({ principal: 10000, rPeriod: 0.06 / 12, payment: P, maxPeriods: 600 });
    expect(a.periods).toBe(60);
    expect(a.totalInterest).toBeCloseTo(P * 60 - 10000, 2);
    expect(a.totalInterest).toBeCloseTo(1599.68, 1);
  });

  it('a payment that never covers interest is not payable and yields no invented figure', () => {
    const a = amortize({ principal: 5000, rPeriod: 0.2 / 12, payment: 50, maxPeriods: 600 });
    expect(a).toMatchObject({ payable: false, periods: 0, totalInterest: 0, totalPaid: 0 });
  });
});

describe('finley_loan_forecast', () => {
  it('interest is counted once (final-payment double count fixed); extra payments save interest', () => {
    const P = pmt(10000, 0.06 / 12, 60);
    const f = calculateLoanForecast({ principal: 10000, annualRatePct: 6, paymentAmount: P, paymentFrequency: 'monthly', extraPerPeriod: 50 });
    expect(f.periodsOriginal).toBe(60);
    expect(f.interestOriginal).toBeCloseTo(1599.68, 1);
    const withExtra = amortize({ principal: 10000, rPeriod: 0.005, payment: P + 50, maxPeriods: 480 });
    expect(f.periodsWithExtra).toBe(withExtra.periods);
    expect(f.interestSaved).toBeCloseTo(f.interestOriginal - f.interestWithExtra, 2);
    expect(f.interestSaved).toBeGreaterThan(0);
  });
  it('biweekly uses rate ÷ 26 and states the compounding assumption (Canadian semi-annual note)', () => {
    const f = calculateLoanForecast({ principal: 300000, annualRatePct: 5, paymentAmount: 800, paymentFrequency: 'biweekly' });
    expect(f.periodsOriginal).toBe(Math.ceil(nClosed(300000, 0.05 / 26, 800) - 1e-9));
    expect(f.assumptions.join(' ')).toMatch(/÷ 26/);
    expect(f.assumptions.join(' ')).toMatch(/semi-annually/);
  });
  it('0% loans are accepted (was rejected as "missing")', async () => {
    const r: any = await loan({ principal: 1200, annualRatePct: 0, paymentAmount: 100, paymentFrequency: 'monthly', extraPerPeriod: 0 } as any, ctx);
    expect(r.ok).toBe(true);
    expect(r.value.periodsOriginal).toBe(12);
    expect(r.value.interestOriginal).toBe(0);
  });
  it('an unpayable loan is an explicit error, not a figure', async () => {
    const r: any = await loan({ principal: 300000, annualRatePct: 6, paymentAmount: 500, paymentFrequency: 'monthly', extraPerPeriod: 0 } as any, ctx);
    expect(r.ok).toBe(false);
  });
});

describe('finley_debt_payoff_forecast', () => {
  it('months and interest match the closed form; total paid = balance + interest (final month not overcounted)', async () => {
    const r: any = await debtPayoff({ balance: 2000, monthlyPayment: 100, annualInterestRate: 0.1999 } as any, ctx);
    const v = r.value;
    expect(v.monthsToPayoff).toBe(Math.ceil(nClosed(2000, 0.1999 / 12, 100)));
    expect(v.totalPaid).toBeCloseTo(2000 + v.totalInterestPaid, 1);
    expect(v.rateAssumed).toBe(false);
    expect(new Set(v.projectionTimeline.map((p: any) => p.monthIndex)).size).toBe(v.projectionTimeline.length); // no duplicate final month
  });
  it('debts taking more than 10 years are not reported as impossible', async () => {
    const r: any = await debtPayoff({ balance: 20000, monthlyPayment: 250, annualInterestRate: 0.12 } as any, ctx);
    expect(r.value.isPayoffPossible).toBe(true);
    expect(r.value.monthsToPayoff).toBe(Math.ceil(nClosed(20000, 0.01, 250)));
    expect(r.value.monthsToPayoff).toBeGreaterThan(120);
  });
  it('a missing rate is flagged as assumed, never silent', async () => {
    const r: any = await debtPayoff({ balance: 1000, monthlyPayment: 100 } as any, ctx);
    expect(r.value.rateAssumed).toBe(true);
    expect(r.value.assumptions[0]).toMatch(/No interest rate was given/);
  });
  it('payment below interest: no months, interest or total figures', async () => {
    const r: any = await debtPayoff({ balance: 5000, monthlyPayment: 50, annualInterestRate: 0.2 } as any, ctx);
    expect(r.value).toMatchObject({ isPayoffPossible: false, monthsToPayoff: null, totalInterestPaid: null, totalPaid: null });
  });
});

describe('finley_savings_forecast', () => {
  it('matches the annuity-due future value (contributions at the start of each month) and says so', async () => {
    const r: any = await savings({ startingBalance: 1000, monthlyContribution: 300, months: 24, annualInterestRate: 0.04 } as any, ctx);
    expect(r.value.endingBalance).toBeCloseTo(fvDue(1000, 300, 0.04 / 12, 24), 1);
    expect(r.value.totalContributions).toBe(1000 + 300 * 24);
    expect(r.value.assumptions.join(' ')).toMatch(/start of the month/);
    expect(r.value.rateAssumed).toBe(false);
  });
  it('a missing rate is flagged as assumed', async () => {
    const r: any = await savings({ monthlyContribution: 100, months: 12 } as any, ctx);
    expect(r.value.rateAssumed).toBe(true);
    expect(r.value.assumptions[0]).toMatch(/No interest rate was given/);
  });
});

describe('analytics_forecast', () => {
  it('payoff time is exact (old shortcut said 40 months for $5,000 at 18% paying $200; true is 32)', async () => {
    const r: any = await analytics({ currentBalance: 5000, monthlyPayment: 200, annualRate: 18, timeframe: '1year' } as any, ctx);
    expect(r.value.forecast.payoffTimeMonths).toBe(Math.ceil(nClosed(5000, 0.015, 200)));
    expect(r.value.forecast.payoffTimeMonths).toBe(32);
  });
  it('required payment = annuity formula; no-payment growth compounds monthly', async () => {
    const r: any = await analytics({ currentBalance: 5000, annualRate: 18, timeframe: '1year' } as any, ctx);
    expect(r.value.forecast.monthlyPaymentNeeded).toBeCloseTo(pmt(5000, 0.015, 12), 2);
    expect(r.value.forecast.monthlyPaymentNeeded).toBeCloseTo(458.4, 1);
    expect(r.value.forecast.projectedBalance).toBeCloseTo(5000 * Math.pow(1.015, 12), 2);
  });
  it('no invented confidence score; the inputs used are listed', async () => {
    const r: any = await analytics({ currentBalance: 5000, annualRate: 18, timeframe: '1year' } as any, ctx);
    expect(r.value.forecast.confidence).toBeUndefined();
    expect(r.value.forecast.basedOn).toEqual(['balance $5000.00', 'rate 18% a year']);
  });
  it('0% rate: required payment is a straight division', async () => {
    const r: any = await analytics({ currentBalance: 1200, timeframe: '1year' } as any, ctx);
    expect(r.value.forecast.monthlyPaymentNeeded).toBe(100);
  });
});

describe('activation gate', () => {
  it('only forecast tools verified in this file may be listed as verified', () => {
    const coveredHere = new Set(['finley_loan_forecast', 'finley_debt_payoff_forecast', 'finley_savings_forecast', 'analytics_forecast']);
    for (const t of VERIFIED_FORECAST_TOOLS) {
      expect(FORECAST_TOOLS.has(t), t).toBe(true);
      expect(coveredHere.has(t), t).toBe(true);
    }
  });
});
